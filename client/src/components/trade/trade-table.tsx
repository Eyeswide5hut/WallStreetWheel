import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

type TradeTableProps = {
  initialTrades?: Trade[];
  readOnly?: boolean;
};

const PAGE_SIZE = 10;

export function TradeTable({ initialTrades, readOnly = false }: TradeTableProps) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [page, setPage] = useState(1);

  // Only fetch trades if we don't have initialTrades
  const { data: fetchedTrades, isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
    enabled: !initialTrades, // Only fetch if we don't have initialTrades
  });

  const trades = initialTrades || fetchedTrades;

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
  };

  const handleRowClick = (trade: Trade) => {
    if (!readOnly) {
      setSelectedTrade(trade);
    }
  };

  const handleCloseTrade = (trade: Trade, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrade(trade);
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
              {!readOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="text-center py-4">
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
                    ? parseFloat(trade.profitLoss.toString()) > 0
                      ? "text-green-600"
                      : "text-red-600"
                    : ""
                }`}>
                  {trade.profitLoss && formatCurrency(trade.profitLoss)}
                </TableCell>
                {!readOnly && !trade.closeDate && (
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleCloseTrade(trade, e)}
                    >
                      Close Trade
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(!trades || trades.length === 0) && (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="text-center text-muted-foreground">
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
          onClose={() => setSelectedTrade(null)}
          readOnly={readOnly}
        />
      </CardContent>
    </Card>
  );
}