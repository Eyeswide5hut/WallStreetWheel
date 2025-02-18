import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, tradingPlatforms, platformSettingsSchema, type UpdateUser, type SharePosition, insertSharePositionSchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SiRobinhood, SiWebmoney, SiTradingview } from "react-icons/si";
import { Settings2, Plus, Trash2, History } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NavHeader } from "@/components/layout/nav-header";
import { ScrollArea } from "@/components/ui/scroll-area";

const platformIcons: Record<string, React.ElementType> = {
  robinhood: SiRobinhood,
  webull: SiWebmoney,
  td_ameritrade: SiTradingview,
};

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPosition, setSelectedPosition] = useState<SharePosition | null>(null);

  const form = useForm<UpdateUser>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      platforms: user?.platforms || [],
      preferences: user?.preferences || {
        theme: "system",
        notifications: {
          email: true,
          web: true,
        },
      },
    },
  });

  const shareForm = useForm({
    resolver: zodResolver(insertSharePositionSchema),
    defaultValues: {
      symbol: "",
      quantity: 0,
      averageCost: 0,
    },
  });

  // Query share positions
  const { data: sharePositions, isLoading: loadingPositions } = useQuery<SharePosition[]>({
    queryKey: ["/api/share-positions"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUser) => {
      const formattedData = {
        ...data,
        platforms: data.platforms.map(platform => ({
          ...platform,
          feeStructure: {
            perContract: Number(platform.feeStructure.perContract),
            base: Number(platform.feeStructure.base),
            assignment: Number(platform.feeStructure.assignment),
            exercise: Number(platform.feeStructure.exercise),
          }
        }))
      };
      const res = await apiRequest("PATCH", "/api/user/profile", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addSharePositionMutation = useMutation({
    mutationFn: async (data: typeof insertSharePositionSchema._type) => {
      const res = await apiRequest("POST", "/api/share-positions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/share-positions"] });
      toast({ title: "Share position added successfully" });
      shareForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add share position",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSharePositionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof insertSharePositionSchema._type> }) => {
      const res = await apiRequest("PATCH", `/api/share-positions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/share-positions"] });
      toast({ title: "Share position updated successfully" });
      setSelectedPosition(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update share position",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addPlatform = () => {
    const platforms = form.getValues("platforms") || [];
    form.setValue("platforms", [
      ...platforms,
      {
        id: tradingPlatforms[0],
        name: tradingPlatforms[0],
        enabled: true,
        feeStructure: {
          perContract: 0.0,
          base: 0.0,
          assignment: 0.0,
          exercise: 0.0,
        },
        marginEnabled: false, //Adding default marginEnabled
        marginRate: undefined //Adding default marginRate
      },
    ]);
  };

  const removePlatform = (index: number) => {
    const platforms = form.getValues("platforms");
    platforms?.splice(index, 1);
    form.setValue("platforms", platforms);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Settings2 className="h-6 w-6" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Manage your profile, trading platforms, and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit((data) => {
                      updateProfileMutation.mutate(data);
                    })(e);
                  }}
                  className="space-y-8"
                >
                  <div className="grid gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Trading Platforms</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addPlatform}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Platform
                        </Button>
                      </div>

                      {form.watch("platforms")?.map((_, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <FormField
                                control={form.control}
                                name={`platforms.${index}.id`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select platform" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {tradingPlatforms.map((platform) => (
                                          <SelectItem key={platform} value={platform}>
                                            {platform.split('_').map(word =>
                                              word.charAt(0).toUpperCase() + word.slice(1)
                                            ).join(' ')}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePlatform(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4">
                              <FormField
                                control={form.control}
                                name={`platforms.${index}.accountId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Account ID</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`platforms.${index}.marginEnabled`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">
                                        Margin Trading
                                      </FormLabel>
                                      <FormDescription>
                                        Enable margin trading for this account
                                      </FormDescription>
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
                              {form.watch(`platforms.${index}.marginEnabled`) && (
                                <FormField
                                  control={form.control}
                                  name={`platforms.${index}.marginRate`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Margin Interest Rate (%)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          placeholder="Enter margin rate"
                                          value={field.value ?? ""}
                                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`platforms.${index}.feeStructure.perContract`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Fee per Contract</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={field.value ?? 0}
                                          onChange={(e) => field.onChange(Number(e.target.value))}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`platforms.${index}.feeStructure.base`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Base Fee</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={field.value ?? 0}
                                          onChange={(e) => field.onChange(Number(e.target.value))}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <FormField
                      control={form.control}
                      name="marginEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Margin Trading
                            </FormLabel>
                            <FormDescription>
                              Enable margin trading and set your margin rate
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("marginEnabled") && (
                      <FormField
                        control={form.control}
                        name="marginRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Margin Interest Rate (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Enter your margin rate"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? e.target.value.toString() : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Share Positions</CardTitle>
              <CardDescription>
                Manage your stock positions and track cost basis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Current Positions</h3>
                  </div>

                  {loadingPositions ? (
                    <div className="text-center py-4">Loading positions...</div>
                  ) : sharePositions?.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No share positions found
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {sharePositions?.map((position) => (
                        <Card key={position.id} className="relative">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{position.symbol}</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedPosition(position)}
                              >
                                <History className="h-4 w-4 mr-2" />
                                History
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Quantity</p>
                                <p className="text-lg font-medium">{position.quantity}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Average Cost</p>
                                <p className="text-lg font-medium">
                                  ${parseFloat(position.averageCost.toString()).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Add Position</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...shareForm}>
                      <form
                        onSubmit={shareForm.handleSubmit((data) => addSharePositionMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <FormField
                          control={shareForm.control}
                          name="symbol"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Symbol</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="AAPL" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={shareForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shareForm.control}
                            name="averageCost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Average Cost</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={addSharePositionMutation.isPending}
                        >
                          Add Position
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedPosition} onOpenChange={() => setSelectedPosition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Position History - {selectedPosition?.symbol}</DialogTitle>
            <DialogDescription>
              Acquisition and assignment history for this position
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {selectedPosition?.acquisitionHistory?.map((event: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {event.quantity > 0 ? "Acquired" : "Removed"} {Math.abs(event.quantity)} shares
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString()} via {event.type}
                  </p>
                </div>
                <p className="font-mono">
                  ${parseFloat(event.price).toFixed(2)}
                </p>
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}