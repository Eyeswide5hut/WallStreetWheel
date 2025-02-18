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

const PAGE_SIZE = 10;

export function TradeTable() {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [page, setPage] = useState(1);

  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Loading trades...
                </TableCell>
              </TableRow>
            ) : paginatedTrades?.map((trade) => (
              <TableRow
                key={trade.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTrade(trade)}
              >
                <TableCell>
                  {new Date(trade.tradeDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{trade.underlyingAsset}</TableCell>
                <TableCell className="capitalize">
                  {trade.optionType.replace(/_/g, ' ')}
                </TableCell>
                <TableCell>{formatCurrency(trade.strikePrice)}</TableCell>
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
              </TableRow>
            ))}
            {(!trades || trades.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
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
        />
      </CardContent>
    </Card>
  );
}