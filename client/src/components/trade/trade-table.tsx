import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trade } from "@shared/schema";
import { TradeDialog } from "./trade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 10;

export function TradeTable() {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (tradeId: number) => {
      const response = await apiRequest("DELETE", `/api/trades/${tradeId}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Trade deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete trade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
  };

  const handleDelete = async (tradeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this trade?")) {
      await deleteMutation.mutate(tradeId);
    }
  };

  const handleEdit = (trade: Trade, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrade(trade);
    setDialogMode("edit");
  };

  const handleRowClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setDialogMode("view");
  };

  const totalPages = trades ? Math.ceil(trades.length / PAGE_SIZE) : 0;
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedTrades = trades?.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Strike</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>P/L</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Loading trades...
                </TableCell>
              </TableRow>
            ) : paginatedTrades?.map((trade) => (
              <TableRow
                key={trade.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(trade)}
              >
                <TableCell>
                  {new Date(trade.tradeDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{trade.underlyingAsset}</TableCell>
                <TableCell className="capitalize">
                  {trade.optionType.replace(/_/g, ' ')}
                </TableCell>
                <TableCell>{formatCurrency(trade.strikePrice || 0)}</TableCell>
                <TableCell>{formatCurrency(trade.premium)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={trade.closeDate ? "secondary" : "outline"}
                    className={trade.wasAssigned ? "bg-yellow-100 text-yellow-800" : ""}
                  >
                    {trade.wasAssigned ? "Assigned" : (trade.closeDate ? "Closed" : "Open")}
                  </Badge>
                </TableCell>
                <TableCell className={`font-medium ${
                  trade.profitLoss
                    ? parseFloat(trade.profitLoss) > 0
                      ? "text-green-600"
                      : "text-red-600"
                    : ""
                }`}>
                  {trade.profitLoss && formatCurrency(trade.profitLoss)}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleEdit(trade, e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(trade.id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!trades || trades.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No trades found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <TradeDialog
          trade={selectedTrade}
          isOpen={!!selectedTrade}
          onClose={() => {
            setSelectedTrade(null);
            setDialogMode("view");
          }}
          mode={dialogMode}
        />
      </CardContent>
    </Card>
  );
}