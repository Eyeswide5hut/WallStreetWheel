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
  DialogFooter,
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

const tradeCloseSchema = z.object({
  closePrice: z.string().transform((val) => parseFloat(val)),
  closeDate: z.string(),
  wasAssigned: z.boolean().default(false)
});

type TradeCloseData = z.infer<typeof tradeCloseSchema>;

interface TradeDialogProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

export function TradeDialog({ trade, isOpen, onClose, readOnly }: TradeDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<TradeCloseData>({
    resolver: zodResolver(tradeCloseSchema),
    defaultValues: {
      closePrice: trade?.closePrice?.toString() ?? "",
      closeDate: trade?.closeDate ? new Date(trade.closeDate).toISOString().split('T')[0] : "",
      wasAssigned: trade?.wasAssigned ?? false
    }
  });

  const closePositionMutation = useMutation({
    mutationFn: async (data: TradeCloseData) => {
      if (!trade?.id) throw new Error("No trade selected");
      const response = await apiRequest("PATCH", `/api/trades/${trade.id}`, data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Position closed successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to close position",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    if (isProcessing) return;
    form.reset();
    onClose();
  };

  if (!trade) return null;

  const tradeDate = new Date(trade.tradeDate).toISOString().split('T')[0];
  const expirationDate = new Date(trade.expirationDate).toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Close Position - {trade.underlyingAsset} {trade.optionType}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {readOnly ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Strike Price</h4>
                <p>${trade.strikePrice}</p>
              </div>
              <div>
                <h4 className="font-medium">Premium</h4>
                <p>${trade.premium}</p>
              </div>
              <div>
                <h4 className="font-medium">Quantity</h4>
                <p>{trade.quantity}</p>
              </div>
              {trade.closeDate && (
                <>
                  <div>
                    <h4 className="font-medium">Close Price</h4>
                    <p>${trade.closePrice}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Close Date</h4>
                    <p>{new Date(trade.closeDate).toLocaleDateString()}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => closePositionMutation.mutate(data))} 
                    className="space-y-4">
                <FormField
                  control={form.control}
                  name="closePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Close Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter closing price"
                          {...field}
                        />
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
                          max={expirationDate}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          Position was assigned/exercised
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={closePositionMutation.isPending}
                >
                  {closePositionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : "Close Position"}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}