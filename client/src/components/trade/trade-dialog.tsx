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
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

// Existing schema definition remains unchanged
const editTradeSchema = z.object({
  id: z.number(),
  underlyingAsset: z.string().min(1).optional(),
  optionType: z.string().optional(),
  strikePrice: z.string().optional(),
  premium: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  expirationDate: z.string().optional(),
  platform: z.string().optional(),
  notes: z.string().optional(),
  closeDate: z.string().optional(),
  closePrice: z.string().optional(),
  wasAssigned: z.boolean().optional(),
});

type EditTradeData = z.infer<typeof editTradeSchema>;

interface TradeDialogProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  mode: "edit" | "view";
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

export function TradeDialog({ trade, isOpen, onClose, mode }: TradeDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error' | 'confirming-delete'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");

  const editForm = useForm<EditTradeData>({
    resolver: zodResolver(editTradeSchema),
    values: trade ? {
      id: trade.id,
      underlyingAsset: trade.underlyingAsset,
      optionType: trade.optionType,
      strikePrice: trade.strikePrice?.toString() ?? "",
      premium: trade.premium?.toString() ?? "",
      quantity: trade.quantity,
      expirationDate: new Date(trade.expirationDate).toISOString().split('T')[0],
      platform: trade.platform ?? undefined,
      notes: trade.notes ?? undefined,
      closeDate: trade.closeDate ? new Date(trade.closeDate).toISOString().split('T')[0] : undefined,
      closePrice: trade.closePrice?.toString() ?? undefined,
      wasAssigned: trade.wasAssigned,
    } : undefined,
  });

  // Rest of the mutation handlers remain unchanged
  const editTradeMutation = useMutation({
    mutationFn: async (data: EditTradeData) => {
      setStatus('submitting');
      const response = await apiRequest("PATCH", `/api/trades/${data.id}`, data);

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || "Failed to update trade");
        } catch {
          throw new Error(errorText || "Failed to update trade");
        }
      }

      return response.json();
    },
    onSuccess: () => {
      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Trade updated successfully" });
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1500);
    },
    onError: (error: Error) => {
      setStatus('error');
      setErrorMessage(error.message);
      toast({
        title: "Failed to update trade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTradeMutation = useMutation({
    mutationFn: async () => {
      if (!trade) throw new Error("No trade selected");
      const response = await apiRequest("DELETE", `/api/trades/${trade.id}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Trade deleted successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete trade",
        description: error.message,
        variant: "destructive",
      });
      setStatus('idle');
    },
  });

  const handleClose = () => {
    if (status === 'submitting') return;
    setStatus('idle');
    setErrorMessage("");
    onClose();
  };

  const handleDelete = () => {
    if (status === 'confirming-delete') {
      deleteTradeMutation.mutate();
    } else {
      setStatus('confirming-delete');
    }
  };

  if (!trade) return null;

  const assignmentText = getAssignmentText(trade.optionType);
  const tradeDate = new Date(trade.tradeDate).toISOString().split('T')[0];
  const expirationDate = new Date(trade.expirationDate).toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="flex-none p-6 border-b">
          <DialogTitle className="text-xl">
            {mode === "edit" ? "Edit Trade" : "Trade Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {mode === "view" ? (
                  <div className="space-y-6">
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
                      {trade.closePrice && (
                        <div>
                          <h4 className="font-medium">Close Price</h4>
                          <p>${trade.closePrice}</p>
                        </div>
                      )}
                      {trade.closeDate && (
                        <div>
                          <h4 className="font-medium">Close Date</h4>
                          <p>{new Date(trade.closeDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <Form {...editForm}>
                    <form
                      onSubmit={editForm.handleSubmit((data) => editTradeMutation.mutate(data))}
                      className="space-y-6"
                    >
                      <FormField
                        control={editForm.control}
                        name="underlyingAsset"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Underlying Asset</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
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
                        control={editForm.control}
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

                      <FormField
                        control={editForm.control}
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

                      <FormField
                        control={editForm.control}
                        name="expirationDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiration Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Close Trade Fields */}
                      <div className="space-y-6 pt-6 border-t">
                        <h3 className="text-lg font-medium">Close Position Details</h3>

                        <FormField
                          control={editForm.control}
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
                          control={editForm.control}
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
                          control={editForm.control}
                          name="wasAssigned"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  {assignmentText}
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </form>
                  </Form>
                )}
              </motion.div>
            )}

            {status === 'confirming-delete' && (
              <motion.div
                key="confirm-delete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center space-y-4"
              >
                <AlertTriangle className="h-16 w-16 text-yellow-500" />
                <p className="text-lg font-medium text-center">
                  Are you sure you want to delete this trade? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStatus('idle')}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </div>
              </motion.div>
            )}

            {status === 'submitting' && (
              <motion.div
                key="submitting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center space-y-4"
              >
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Processing...</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </motion.div>
                <p className="text-lg font-medium">Operation completed successfully!</p>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <XCircle className="h-16 w-16 text-red-500" />
                </motion.div>
                <p className="text-lg font-medium text-red-500">{errorMessage}</p>
                <Button
                  variant="outline"
                  onClick={() => setStatus('idle')}
                >
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="flex-none border-t p-6 bg-background">
          {mode === "view" ? (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="w-full"
            >
              Delete Trade
            </Button>
          ) : status === 'idle' && (
            <div className="flex gap-2 w-full">
              <Button
                type="submit"
                className="flex-1"
                disabled={editTradeMutation.isPending}
                onClick={() => editForm.handleSubmit((data) => editTradeMutation.mutate(data))()}
              >
                Update Trade
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}