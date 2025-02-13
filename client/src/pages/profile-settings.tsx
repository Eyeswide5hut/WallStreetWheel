import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, tradingPlatforms, platformSettingsSchema, type UpdateUser } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SiRobinhood, SiWebmoney, SiTradingview } from "react-icons/si";
import { Settings2, Plus, Trash2 } from "lucide-react";
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

const platformIcons: Record<string, React.ElementType> = {
  robinhood: SiRobinhood,
  webull: SiWebmoney,
  td_ameritrade: SiTradingview,
};

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdateUser>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: user?.email || "",
      platforms: [],
      preferences: {
        theme: "system",
        notifications: {
          email: true,
          web: true,
        },
      },
      marginEnabled: false,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUser) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
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

  const addPlatform = () => {
    const platforms = form.getValues("platforms") || [];
    form.setValue("platforms", [
      ...platforms,
      {
        id: tradingPlatforms[0],
        name: tradingPlatforms[0],
        enabled: true,
        feeStructure: {
          perContract: 0,
          base: 0,
          assignment: 0,
          exercise: 0,
        },
      },
    ]);
  };

  const removePlatform = (index: number) => {
    const platforms = form.getValues("platforms");
    platforms.splice(index, 1);
    form.setValue("platforms", platforms);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
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
            <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-8">
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
                                      {...field}
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
                                      {...field}
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
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}