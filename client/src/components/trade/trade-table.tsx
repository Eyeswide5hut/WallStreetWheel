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

export function TradeTable() {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const { data: trades } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Trades</CardTitle>
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
            {trades?.slice(0, 5).map((trade) => (
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

        <TradeDialog
          trade={selectedTrade}
          isOpen={!!selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      </CardContent>
    </Card>
  );
}