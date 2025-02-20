
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavHeader } from "@/components/layout/nav-header";
import { Trade } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

type TradeWithUser = Trade & {
  user: {
    username: string;
  };
};

export default function LatestTradesPage() {
  const { data: trades, isLoading } = useQuery<TradeWithUser[]>({
    queryKey: ["/api/trades/latest"],
    refetchInterval: 30000,
  });

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

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Latest Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">Loading trades...</div>
              ) : (
                trades?.map((trade) => (
                  <Card key={trade.id} className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Trader</div>
                        <div className="font-medium">{trade.user.username}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Symbol</div>
                        <div className="font-medium">
                          {trade.underlyingAsset} 
                          {trade.optionType && ` (${trade.optionType.replace('_', ' ')})`}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Entry</div>
                        <div className="font-medium">
                          {trade.optionType ? formatCurrency(trade.premium) : formatCurrency(trade.entryPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Exit</div>
                        <div className="font-medium">
                          {trade.status === 'closed' ? formatCurrency(trade.closePrice) : 'Open'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">P/L</div>
                        <div className={`font-medium ${Number(trade.profitLoss) > 0 ? 'text-green-500' : Number(trade.profitLoss) < 0 ? 'text-red-500' : ''}`}>
                          {trade.profitLoss ? formatCurrency(trade.profitLoss) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Time</div>
                        <div className="font-medium">
                          {formatDistanceToNow(new Date(trade.tradeDate), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
