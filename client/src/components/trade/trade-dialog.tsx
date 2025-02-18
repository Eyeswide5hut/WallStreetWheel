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

const closeTradeSchema = z.object({
  closePrice: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Close price must be a valid number"
  }).transform(val => parseFloat(val)),
  closeDate: z.string(),
  wasAssigned: z.boolean().default(false),
});

type CloseTradeData = z.infer<typeof closeTradeSchema>;

interface TradeDialogProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
}

const getAssignmentText = (optionType: string) => {
  switch (optionType) {
    case "covered_call":
      return "Shares were called away";
    case "cash_secured_put":
      return "Shares were assigned";
    case "naked_call":
    case "naked_put":
      return "Option was assigned";
    case "long_call":
    case "long_put":
      return "Option was exercised";
    default:
      return "Option was assigned";
  }
};

export function TradeDialog({ trade, isOpen, onClose }: TradeDialogProps) {
  const { toast } = useToast();

  const form = useForm<CloseTradeData>({
    resolver: zodResolver(closeTradeSchema),
    defaultValues: {
      closePrice: "",
      closeDate: new Date().toISOString().split('T')[0],
      wasAssigned: false,
    },
  });

  const closeTradeMutation = useMutation({
    mutationFn: async (data: CloseTradeData) => {
      if (!trade) throw new Error("No trade selected");

      try {
        const response = await apiRequest("PATCH", `/api/trades/${trade.id}/close`, {
          closePrice: data.closePrice,
          closeDate: new Date(data.closeDate).toISOString(),
          wasAssigned: data.wasAssigned
        });

        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || "Failed to close trade");
          } catch {
            throw new Error(errorText || "Failed to close trade");
          }
        }

        const responseText = await response.text();
        if (!responseText) {
          throw new Error("Empty response from server");
        }

        try {
          return JSON.parse(responseText);
        } catch {
          throw new Error("Invalid response format from server");
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("An unexpected error occurred");
      }
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
    },
  });

  if (!trade) return null;

  const assignmentText = getAssignmentText(trade.optionType);
  const tradeDate = new Date(trade.tradeDate).toISOString().split('T')[0];
  const expirationDate = new Date(trade.expirationDate).toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Trade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Asset</h4>
              <p>{trade.underlyingAsset}</p>
            </div>
            <div>
              <h4 className="font-medium">Type</h4>
              <p className="capitalize">{trade.optionType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <h4 className="font-medium">Strike</h4>
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
            <div>
              <h4 className="font-medium">Expiration</h4>
              <p>{new Date(trade.expirationDate).toLocaleDateString()}</p>
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => closeTradeMutation.mutate(data))}
              className="space-y-4"
            >
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
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {assignmentText}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={closeTradeMutation.isPending}
              >
                Close Trade
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}