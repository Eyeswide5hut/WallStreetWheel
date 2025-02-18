import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Trade, insertTradeSchema, type InsertTrade } from "@shared/schema";
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
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const closeTradeSchema = z.object({
  closePrice: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Close price must be a valid number"
  }).transform(val => parseFloat(val)),
  closeDate: z.string(),
  wasAssigned: z.boolean().default(false),
});

// Create a new schema for editing trades
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
});

type CloseTradeData = z.infer<typeof closeTradeSchema>;
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

  const closeForm = useForm<CloseTradeData>({
    resolver: zodResolver(closeTradeSchema),
    defaultValues: {
      closePrice: "",
      closeDate: new Date().toISOString().split('T')[0],
      wasAssigned: false,
    },
  });

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
    } : undefined,
  });

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

  const closeTradeMutation = useMutation({
    mutationFn: async (data: CloseTradeData) => {
      if (!trade) throw new Error("No trade selected");
      setStatus('submitting');

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
    },
    onSuccess: () => {
      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Trade closed successfully" });
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1500);
    },
    onError: (error: Error) => {
      setStatus('error');
      setErrorMessage(error.message);
      toast({
        title: "Failed to close trade",
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Trade" : "Trade Details"}
          </DialogTitle>
        </DialogHeader>
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {mode === "view" ? (
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
                  <div>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      className="w-full mt-4"
                    >
                      Delete Trade
                    </Button>
                  </div>
                </div>
              ) : (
                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit((data) => editTradeMutation.mutate(data))}
                    className="space-y-4"
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

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={editTradeMutation.isPending}
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
                  </form>
                </Form>
              )}

              {!trade.closeDate && mode === "edit" && (
                <Form {...closeForm}>
                  <form
                    onSubmit={closeForm.handleSubmit((data) => closeTradeMutation.mutate(data))}
                    className="space-y-4 mt-4 pt-4 border-t"
                  >
                    <h3 className="text-lg font-medium">Close Position</h3>
                    <FormField
                      control={closeForm.control}
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
                      control={closeForm.control}
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
                      control={closeForm.control}
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
                      variant="secondary"
                      className="w-full"
                      disabled={closeTradeMutation.isPending}
                    >
                      Close Trade
                    </Button>
                  </form>
                </Form>
              )}
            </motion.div>
          )}

          {status === 'confirming-delete' && (
            <motion.div
              key="confirm-delete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center p-8 space-y-4"
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
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center p-8 space-y-4"
            >
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Processing...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center p-8 space-y-4"
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
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center p-8 space-y-4"
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
      </DialogContent>
    </Dialog>
  );
}