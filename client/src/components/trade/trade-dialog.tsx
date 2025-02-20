
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Trade } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const tradeSchema = z.object({
  closePrice: z.string().optional(),
  closeDate: z.string().optional(),
  wasAssigned: z.boolean().default(false),
  entryPrice: z.string(),
  quantity: z.number(),
  strikePrice: z.string().optional(),
  premium: z.string().optional(),
  commission: z.string().optional(),
  fees: z.string().optional(),
  notes: z.string().optional(),
  status: z.string()
});

type TradeFormData = z.infer<typeof tradeSchema>;

interface TradeDialogProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

export function TradeDialog({ trade, isOpen, onClose, readOnly }: TradeDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      closePrice: trade?.closePrice?.toString() ?? "",
      closeDate: trade?.closeDate ? new Date(trade.closeDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      wasAssigned: trade?.wasAssigned ?? false,
      entryPrice: trade?.entryPrice?.toString() ?? "",
      quantity: trade?.quantity ?? 1,
      strikePrice: trade?.strikePrice?.toString() ?? "",
      premium: trade?.premium?.toString() ?? "",
      commission: trade?.commission?.toString() ?? "",
      fees: trade?.fees?.toString() ?? "",
      notes: trade?.notes ?? "",
      status: trade?.status ?? "open"
    }
  });

  const updateTradeMutation = useMutation({
    mutationFn: async (data: TradeFormData) => {
      if (!trade?.id) throw new Error("No trade selected");

      const formattedData = {
        ...data,
        closePrice: data.closePrice ? Number(data.closePrice) : undefined,
        entryPrice: Number(data.entryPrice),
        strikePrice: data.strikePrice ? Number(data.strikePrice) : undefined,
        premium: data.premium ? Number(data.premium) : undefined,
        commission: data.commission ? Number(data.commission) : undefined,
        fees: data.fees ? Number(data.fees) : undefined
      };

      const response = await apiRequest("PATCH", `/api/trades/${trade.id}`, formattedData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Trade updated successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update trade",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!trade) return null;

  const tradeDate = new Date(trade.tradeDate).toISOString().split('T')[0];
  const expirationDate = trade.expirationDate ? new Date(trade.expirationDate).toISOString().split('T')[0] : null;

  const isOption = trade.tradeType === 'option';
  const showExerciseOption = isOption && ['long_call', 'long_put', 'covered_call', 'cash_secured_put'].includes(trade.optionType || '');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Trade - {trade.underlyingAsset} {isOption ? trade.optionType : 'Stock'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateTradeMutation.mutate(data))} 
                  className="space-y-4">
              <FormField
                control={form.control}
                name="entryPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Price</FormLabel>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isOption && (
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
              )}

              {isOption && (
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
              )}

              {trade.status === 'closed' && (
                <>
                  <FormField
                    control={form.control}
                    name="closePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Close Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="closeDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Close Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={tradeDate}
                            max={expirationDate || undefined}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fees</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showExerciseOption && (
                <FormField
                  control={form.control}
                  name="wasAssigned"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Position was {isOption ? 'assigned/exercised' : 'called away'}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={updateTradeMutation.isPending}
              >
                {updateTradeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : "Update Trade"}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
