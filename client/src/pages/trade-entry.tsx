import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTradeSchema, optionTypes } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormData = {
  underlyingAsset: string;
  optionType: typeof optionTypes[number];
  strikePrice: string;
  premium: string;
  quantity: number;
  expirationDate: string;
  tradeDate: string;
  useMargin: boolean;
  notes?: string;
  platform?: string;
  tags: string[];
};

export default function TradeEntry() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(insertTradeSchema),
    defaultValues: {
      tradeDate: new Date().toISOString().split('T')[0],
      expirationDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      useMargin: false,
      quantity: 1,
      tags: [],
    },
  });

  const tradeMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Convert the form data to match the schema
      const submissionData = {
        ...data,
        strikePrice: data.strikePrice.toString(),
        premium: data.premium.toString(),
      };
      const res = await apiRequest("POST", "/api/trades", submissionData);
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

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Trade Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => tradeMutation.mutate(data))} className="space-y-6">
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="optionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Option Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  name="premium"
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
                name="useMargin"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Use Margin</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable if this trade uses margin
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
  );
}