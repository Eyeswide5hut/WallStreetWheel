import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavHeader } from "@/components/layout/nav-header";
import { User, Trade } from "@shared/schema";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { TradeTable } from "@/components/trade/trade-table";
import { MetricsCard } from "@/components/dashboard/metrics-card";
import { Badge } from "@/components/ui/badge";

type TraderProfile = Omit<User, "password" | "email"> & {
  trades: Trade[];
  winRate: number;
};

function calculateSharpeRatio(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.closeDate && t.profitLoss);
  if (closedTrades.length === 0) return 0;

  const returns = closedTrades.map(trade => {
    const pl = Number(trade.profitLoss);
    const capital = Number(trade.capitalUsed);
    return (pl / capital) * 100;
  });

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const riskFreeRate = 0.0123;

  return stdDev !== 0 ? ((avgReturn - riskFreeRate) / stdDev) * Math.sqrt(252) : 0;
}

function calculateProfitFactor(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.closeDate && t.profitLoss);
  if (closedTrades.length === 0) return 0;

  const { grossProfit, grossLoss } = closedTrades.reduce(
    (acc, trade) => {
      const pl = Number(trade.profitLoss);
      if (pl > 0) {
        acc.grossProfit += pl;
      } else {
        acc.grossLoss += Math.abs(pl);
      }
      return acc;
    },
    { grossProfit: 0, grossLoss: 0 }
  );

  return grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
}

export default function TraderDashboard() {
  const params = useParams<{ id: string }>();
  const traderId = params?.id ? parseInt(params.id) : null;

  const { data: trader, isLoading, error } = useQuery<TraderProfile>({
    queryKey: ["/api/traders", traderId],
    queryFn: async () => {
      if (!traderId) throw new Error('Trader ID is required');
      const response = await fetch(`/api/traders/${traderId}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    enabled: !!traderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!trader || error) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive">Trader not found</h2>
            <p className="text-muted-foreground mt-2">
              The trader profile you're looking for doesn't exist or there was an error loading it.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const sharpeRatio = calculateSharpeRatio(trader.trades);
  const profitFactor = calculateProfitFactor(trader.trades);

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">{trader.username}'s Dashboard</h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="px-2 py-1">
                Sharpe: {sharpeRatio.toFixed(2)}
              </Badge>
              <Badge variant="outline" className="px-2 py-1">
                PF: {profitFactor.toFixed(2)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total P/L</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-mono ${parseFloat(trader.totalProfitLoss?.toString() || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${parseFloat(trader.totalProfitLoss?.toString() || '0').toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono">
                  {(trader.winRate * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trade Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono">{trader.tradeCount || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Return</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono">
                  {parseFloat(trader.averageReturn?.toString() || '0').toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Display trades table */}
          {trader.trades && (
            <TradeTable initialTrades={trader.trades} readOnly />
          )}
        </div>
      </main>
    </div>
  );
}