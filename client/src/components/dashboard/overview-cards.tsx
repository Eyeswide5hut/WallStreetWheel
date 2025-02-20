
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@shared/schema";
import { Loader2 } from "lucide-react";

export function OverviewCards() {
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded w-3/4" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const closedTrades = trades?.filter(t => t.status === 'closed') || [];
  const openTrades = trades?.filter(t => t.status === 'open') || [];
  
  // Calculate win rate from closed trades only
  const profitableTrades = closedTrades.filter(t => {
    const profitLoss = Number(t.profitLoss || 0);
    return profitLoss > 0;
  }).length;

  const winRate = closedTrades.length ? (profitableTrades / closedTrades.length * 100).toFixed(1) : "0";

  // Total P/L is the sum of realized profits/losses from closed trades
  const totalPnL = closedTrades.reduce((sum, t) => {
    return sum + Number(t.profitLoss || 0);
  }, 0);

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{closedTrades.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{winRate}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPnL.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {openTrades.length}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
