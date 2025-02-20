
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

const closeTradeSchema = z.object({
  closePrice: z.string(),
  closeDate: z.string(),
  wasAssigned: z.boolean().default(false),
});

type CloseTradeFormData = z.infer<typeof closeTradeSchema>;

interface CloseTradeDialogProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CloseTradeDialog({ trade, isOpen, onClose }: CloseTradeDialogProps) {
  const { toast } = useToast();

  const form = useForm<CloseTradeFormData>({
    resolver: zodResolver(closeTradeSchema),
    defaultValues: {
      closePrice: "",
      closeDate: new Date().toISOString().split('T')[0],
      wasAssigned: false,
    }
  });

  const updateTradeMutation = useMutation({
    mutationFn: async (data: CloseTradeFormData) => {
      if (!trade?.id) throw new Error("No trade selected");

      const formattedData = {
        ...data,
        closePrice: Number(data.closePrice),
        status: 'closed'
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
      toast({ title: "Trade closed successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to close trade",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (!trade) return null;

  const tradeDate = new Date(trade.tradeDate).toISOString().split('T')[0];
  const expirationDate = trade.expirationDate ? new Date(trade.expirationDate).toISOString().split('T')[0] : null;
  const showExerciseOption = trade.tradeType === 'option' && ['long_call', 'long_put', 'covered_call', 'cash_secured_put'].includes(trade.optionType || '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            Close Trade - {trade.underlyingAsset} {trade.tradeType === 'option' ? trade.optionType : 'Stock'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateTradeMutation.mutate(data))} 
                  className="space-y-4">
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
                          Position was {trade.tradeType === 'option' ? 'assigned/exercised' : 'called away'}
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
                ) : "Close Trade"}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
