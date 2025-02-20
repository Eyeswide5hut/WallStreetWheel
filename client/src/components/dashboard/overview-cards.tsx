
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
  
  // Calculate total trades
  const totalTrades = closedTrades.length;

  // Calculate win rate
  const profitableTrades = closedTrades.filter(t => {
    const profitLoss = Number(t.profitLoss || 0);
    return profitLoss > 0;
  });
  const winRate = totalTrades > 0 ? (profitableTrades.length / totalTrades * 100) : 0;

  // Calculate profit factor
  const { totalGains, totalLosses } = closedTrades.reduce((acc, trade) => {
    const pl = Number(trade.profitLoss || 0);
    if (pl > 0) {
      acc.totalGains += pl;
    } else {
      acc.totalLosses += Math.abs(pl);
    }
    return acc;
  }, { totalGains: 0, totalLosses: 0 });

  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? Infinity : 0;

  // Calculate average return per trade
  const avgReturn = closedTrades.reduce((sum, trade) => {
    const pl = Number(trade.profitLoss || 0);
    const capital = Number(trade.capitalUsed || 0);
    if (capital > 0) {
      return sum + ((pl / capital) * 100);
    }
    return sum;
  }, 0) / (totalTrades || 1);

  // Calculate Sharpe ratio
  const returns = closedTrades.map(trade => {
    const pl = Number(trade.profitLoss || 0);
    const capital = Number(trade.capitalUsed || 0);
    return capital > 0 ? (pl / capital) * 100 : 0;
  });

  const avgDailyReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgDailyReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);
  const riskFreeRate = 0.0123; // Assume 4.5% annual risk-free rate
  const sharpeRatio = stdDev !== 0 ? ((avgDailyReturn - riskFreeRate) / stdDev) * Math.sqrt(252) : 0;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTrades}</div>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{sharpeRatio.toFixed(2)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
