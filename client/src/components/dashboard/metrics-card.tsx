import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trade } from "@shared/schema"

interface MetricsCardProps {
  trades: Trade[];
}

function calculateSharpeRatio(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.closeDate && t.profitLoss);
  if (closedTrades.length === 0) return 0;

  // Calculate daily returns
  const returns = closedTrades.map(trade => {
    const pl = Number(trade.profitLoss);
    const capital = Number(trade.capitalUsed);
    return (pl / capital) * 100; // Return as percentage
  });

  // Calculate average return
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  // Calculate standard deviation
  const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Assume risk-free rate of 4.5% annually, or about 0.0123% daily
  const riskFreeRate = 0.0123;

  // Calculate annualized Sharpe ratio (multiply by sqrt(252) for annualization)
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

export function MetricsCard({ trades }: MetricsCardProps) {
  const avgHoldingTime = trades?.reduce((sum, t) => {
    if (!t.closeDate) return sum;
    return sum + (new Date(t.closeDate).getTime() - new Date(t.tradeDate).getTime());
  }, 0) / (trades?.filter(t => t.closeDate).length || 1);

  const sharpeRatio = calculateSharpeRatio(trades);
  const profitFactor = calculateProfitFactor(trades);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Holding Time</span>
            <span className="font-mono">{Math.round(avgHoldingTime / (1000 * 60 * 60 * 24))} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Win/Loss Ratio</span>
            <span className="font-mono">
              {((trades?.filter(t => Number(t.profitLoss) > 0).length || 0) / 
                (trades?.filter(t => t.closeDate).length || 1)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sharpe Ratio</span>
            <span className="font-mono">{sharpeRatio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profit Factor</span>
            <span className="font-mono">{profitFactor.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}