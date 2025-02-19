import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavHeader } from "@/components/layout/nav-header";
import { User, Trade } from "@shared/schema";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { TradeTable } from "@/components/trade/trade-table";

type TraderProfile = Omit<User, "password" | "email"> & {
  trades: Trade[];
  winRate: number;
};

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

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold">{trader.username}'s Dashboard</h2>

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