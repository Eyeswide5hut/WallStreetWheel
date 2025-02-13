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

export function TradeTable() {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades?.slice(0, 5).map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>
                  {new Date(trade.tradeDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{trade.underlyingAsset}</TableCell>
                <TableCell className="capitalize">{trade.optionType}</TableCell>
                <TableCell>${trade.strikePrice}</TableCell>
                <TableCell>${trade.premium}</TableCell>
              </TableRow>
            ))}
            {(!trades || trades.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No trades found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
