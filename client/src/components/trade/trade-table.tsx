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
  showClosed?: boolean;
};

const PAGE_SIZE = 10;

export function TradeTable({ initialTrades, readOnly = false, showClosed = false }: TradeTableProps) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [page, setPage] = useState(1);

  const { data: fetchedTrades, isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
    enabled: !initialTrades,
    refetchInterval: 30000,
  });

  const trades = initialTrades || fetchedTrades;
  const filteredTrades = showClosed 
    ? trades?.filter(t => t.status === 'closed')
    : trades?.filter(t => t.status === 'open');

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const formatPercentage = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `${numValue.toFixed(2)}%`;
  };

  const handleRowClick = (trade: Trade) => {
    if (!readOnly) {
      setSelectedTrade(trade);
    }
  };

  const handleCloseTrade = (trade: Trade, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trade.closeDate) {
      setSelectedTrade(trade);
    }
  };

  const getTradeValue = (trade: Trade) => {
    if (trade.tradeType === 'option' && trade.premium) {
      return formatCurrency(parseFloat(trade.premium.toString()) * 100 * trade.quantity);
    } else if (trade.entryPrice) {
      return formatCurrency(parseFloat(trade.entryPrice.toString()) * trade.quantity);
    }
    return "-";
  };

  const getTradeDetails = (trade: Trade) => {
    if (trade.tradeType === 'option') {
      return `${formatCurrency(trade.strikePrice)} Strike`;
    }
    return `${trade.quantity} @ ${formatCurrency(trade.entryPrice)}`;
  };

  const getDaysOpen = (trade: Trade) => {
    const start = new Date(trade.tradeDate);
    const end = trade.closeDate ? new Date(trade.closeDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTotalCost = (trade: Trade) => {
    const commission = trade.commission ? parseFloat(trade.commission.toString()) : 0;
    const fees = trade.fees ? parseFloat(trade.fees.toString()) : 0;
    return commission + fees;
  };

  const getStatusVariant = (trade: Trade) => {
    if (trade.wasAssigned) return "warning";
    if (trade.closeDate) return "secondary";
    return "outline";
  };

  const calculateUnrealizedPL = (trade: Trade): string => {
    //  Implementation for calculating unrealized P/L based on current market price (not provided in the original data)
    //  This is a placeholder; replace with your actual calculation logic.  You'll need access to a market data API or similar.
    //  For example:  const currentPrice = getCurrentMarketPrice(trade.underlyingAsset);
    //                return formatCurrency(calculatePL(trade, currentPrice));

    return "-"; // Placeholder return value
  };

  const totalPages = filteredTrades ? Math.ceil(filteredTrades.length / PAGE_SIZE) : 0;
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedTrades = filteredTrades?.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{showClosed ? "Closed Positions" : "Open Positions"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead className="text-right">Strike</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Cost Basis</TableHead>
              <TableHead className="text-right">{showClosed ? "P/L ($)" : "Unrealized P/L ($)"}</TableHead>
              <TableHead className="text-right">{showClosed ? "P/L (%)" : "Unrealized P/L (%)"}</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead>Status</TableHead>
              {!readOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 10 : 11} className="text-center py-4">
                  Loading positions...
                </TableCell>
              </TableRow>
            ) : paginatedTrades?.map((trade) => (
              <TableRow
                key={trade.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(trade)}
              >
                <TableCell>{new Date(trade.tradeDate).toLocaleDateString()}</TableCell>
                <TableCell>{trade.underlyingAsset}</TableCell>
                <TableCell>
                  {trade.strategy || (trade.tradeType === 'option'
                    ? trade.optionType?.replace(/_/g, ' ')
                    : trade.tradeType.replace(/_/g, ' '))}
                </TableCell>
                <TableCell className="text-right">
                  {trade.strikePrice ? formatCurrency(trade.strikePrice) : '-'}
                </TableCell>
                <TableCell className="text-right">{trade.quantity}</TableCell>
                <TableCell className="text-right">{getTradeValue(trade)}</TableCell>
                <TableCell className={`text-right font-medium ${
                  trade.profitLoss
                    ? parseFloat(trade.profitLoss.toString()) > 0
                      ? "text-green-600"
                      : "text-red-600"
                    : ""
                }`}>
                  {trade.profitLoss ? formatCurrency(trade.profitLoss) : (
                    trade.closePrice && trade.entryPrice 
                      ? formatCurrency((parseFloat(trade.closePrice.toString()) - parseFloat(trade.entryPrice.toString())) * trade.quantity)
                      : '-'
                  )}
                </TableCell>
                <TableCell className={`text-right font-medium ${
                  trade.profitLossPercent
                    ? parseFloat(trade.profitLossPercent.toString()) > 0
                      ? "text-green-600"
                      : "text-red-600"
                    : ""
                }`}>
                  {trade.profitLossPercent && formatPercentage(trade.profitLossPercent)}
                </TableCell>
                <TableCell className="text-right">
                  {!trade.closeDate && trade.optionType ? (
                    calculateUnrealizedPL(trade)
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">{getDaysOpen(trade)}</TableCell>
                <TableCell>
                  <Badge
                    variant={getStatusVariant(trade)}
                    className={trade.wasAssigned ? "bg-yellow-100 text-yellow-800" : ""}
                  >
                    {trade.status}
                  </Badge>
                </TableCell>
                {!readOnly && trade.status === 'open' && (
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleCloseTrade(trade, e)}
                    >
                      Close
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(!filteredTrades || filteredTrades.length === 0) && (
              <TableRow>
                <TableCell colSpan={readOnly ? 10 : 11} className="text-center text-muted-foreground">
                  No positions found
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