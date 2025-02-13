import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTradeSchema, optionTypes, spreadOptionTypes, debitOptionTypes, creditOptionTypes } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NavHeader } from "@/components/layout/nav-header";
import { Plus, Minus } from "lucide-react";

type FormData = {
  underlyingAsset: string;
  optionType: typeof optionTypes[number];
  strikePrice?: string;
  premium: string; // We'll transform this during submission
  quantity: number;
  expirationDate: string;
  tradeDate: string;
  platform?: string;
  notes?: string;
  tags: string[];
  legs?: Array<{
    optionType: typeof debitOptionTypes[number] | typeof creditOptionTypes[number];
    strikePrice: string;
    premium: string;
    side: "buy" | "sell";
    quantity: number;
  }>;
};

const defaultLegData = {
  optionType: debitOptionTypes[0],
  strikePrice: "",
  premium: "",
  side: "buy" as const,
  quantity: 1,
};

export default function TradeEntry() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(insertTradeSchema),
    defaultValues: {
      tradeDate: new Date().toISOString().split('T')[0],
      expirationDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      quantity: 1,
      tags: [],
      legs: [],
      premium: "", // This will be transformed during submission
    },
  });

  const { fields: legFields, append: appendLeg, remove: removeLeg } = useFieldArray({
    control: form.control,
    name: "legs"
  });

  const tradeMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const premiumValue = parseFloat(data.premium);
      if (isNaN(premiumValue)) {
        throw new Error("Invalid premium value");
      }

      const formattedData = {
        ...data,
        strikePrice: data.strikePrice?.toString(),
        premium: {
          optionType: data.optionType,
          value: premiumValue
        },
        legs: data.legs?.map(leg => ({
          ...leg,
          strikePrice: parseFloat(leg.strikePrice).toString(),
          premium: parseFloat(leg.premium)
        }))
      };
      const res = await apiRequest("POST", "/api/trades", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Trade submitted successfully" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit trade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculateFees = (platform: string, quantity: number, premium: string) => {
    const platformSettings = user?.platforms?.find(p => p.id === platform);
    if (!platformSettings) return 0;

    const premiumValue = parseFloat(premium) || 0;
    const { perContract, base } = platformSettings.feeStructure;

    return (perContract * quantity) + base;
  };

  const selectedPlatform = form.watch("platform");
  const quantity = form.watch("quantity");
  const premium = form.watch("premium");
  const optionType = form.watch("optionType");

  const isMultiLegStrategy = spreadOptionTypes.includes(optionType);

  const calculatedFees = selectedPlatform ?
    calculateFees(selectedPlatform, quantity || 0, premium || "0") : 0;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>New Trade Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => tradeMutation.mutate(data))}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="underlyingAsset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Underlying Asset</FormLabel>
                      <FormControl>
                        <Input placeholder="SPY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="optionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Type</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Reset legs when changing strategy
                        form.setValue("legs", []);
                        if (spreadOptionTypes.includes(value)) {
                          // Add default legs based on strategy
                          switch (value) {
                            case "call_spread":
                            case "put_spread":
                              appendLeg(defaultLegData);
                              appendLeg({ ...defaultLegData, side: "sell" });
                              break;
                            case "iron_condor":
                              appendLeg(defaultLegData); // Buy put
                              appendLeg({ ...defaultLegData, side: "sell" }); // Sell put
                              appendLeg(defaultLegData); // Buy call
                              appendLeg({ ...defaultLegData, side: "sell" }); // Sell call
                              break;
                            case "butterfly":
                              appendLeg(defaultLegData); // Buy 1
                              appendLeg({ ...defaultLegData, side: "sell", quantity: 2 }); // Sell 2
                              appendLeg({ ...defaultLegData }); // Buy 1
                              break;
                          }
                        }
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {optionTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.split('_').map(word =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isMultiLegStrategy ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="strikePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Strike Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field: { onChange, value, ...field } }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                value={value}
                                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="premium"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Premium</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter premium amount per contract. For debit trades (buying options),
                            this will be treated as a cost.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Option Legs</h3>
                      <Button
                        type="button"
                        onClick={() => appendLeg(defaultLegData)}
                      >
                        <Plus className="h-4 w-4" /> Add Leg
                      </Button>
                    </div>

                    {legFields.map((leg, index) => (
                      <Card key={leg.id} className="p-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Leg {index + 1}</h4>
                            {legFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLeg(index)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`legs.${index}.side`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Side</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="buy">Buy</SelectItem>
                                      <SelectItem value="sell">Sell</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`legs.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`legs.${index}.strikePrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Strike Price</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`legs.${index}.premium`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Premium</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tradeDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade Date</FormLabel>
                        <FormControl>
                          <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date</FormLabel>
                        <FormControl>
                          <Input type="date" min={new Date().toISOString().split('T')[0]} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trading Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trading account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {user?.platforms?.map((platform) => (
                            <SelectItem key={platform.id} value={platform.id}>
                              {platform.name}
                              {platform.accountId ? ` - Account #${platform.accountId}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {calculatedFees > 0 && (
                        <FormDescription>
                          Estimated fees: ${calculatedFees.toFixed(2)}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any trade notes here..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={tradeMutation.isPending}
                >
                  Submit Trade
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}