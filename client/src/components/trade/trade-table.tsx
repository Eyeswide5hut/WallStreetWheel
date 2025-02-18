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

export function TradeTable() {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const { data: trades } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

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
                <TableCell>${trade.strikePrice}</TableCell>
                <TableCell>${trade.premium}</TableCell>
                <TableCell>
                  {trade.closeDate ? "Closed" : "Open"}
                </TableCell>
              </TableRow>
            ))}
            {(!trades || trades.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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