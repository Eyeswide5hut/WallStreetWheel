
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
  
  // Calculate win rate
  const profitableTrades = closedTrades.filter(t => {
    const profitLoss = Number(t.profitLoss || 0);
    return profitLoss > 0;
  });
  const winRate = closedTrades.length > 0 ? (profitableTrades.length / closedTrades.length * 100) : 0;

  // Calculate total P/L
  const totalPnL = closedTrades.reduce((sum, t) => sum + Number(t.profitLoss || 0), 0);

  // Calculate profit factor
  const { gains, losses } = closedTrades.reduce((acc, trade) => {
    const pl = Number(trade.profitLoss || 0);
    if (pl > 0) acc.gains += pl;
    else acc.losses += Math.abs(pl);
    return acc;
  }, { gains: 0, losses: 0 });
  const profitFactor = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;

  // Calculate average return
  const avgReturn = closedTrades.length > 0 
    ? closedTrades.reduce((sum, t) => {
        const pl = Number(t.profitLoss || 0);
        const capital = Number(t.capitalUsed || 1);
        return sum + (pl / capital * 100);
      }, 0) / closedTrades.length
    : 0;

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
          <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Return</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgReturn.toFixed(1)}%</div>
        </CardContent>
      </Card>
    </div>
  );
}
