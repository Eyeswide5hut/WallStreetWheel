import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavHeader } from "@/components/layout/nav-header";
import { User } from "@shared/schema";
import { useParams } from "wouter";

export default function TraderDashboard() {
  const { id } = useParams<{ id: string }>();

  const { data: trader, isLoading } = useQuery<User>({
    queryKey: ["/api/traders", id],
    queryFn: () => 
      fetch(`/api/traders/${id}`).then(res => {
        if (!res.ok) throw new Error('Failed to fetch trader details');
        return res.json();
      }),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!trader) {
    return <div>Trader not found</div>;
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
                <p className="text-2xl font-mono">
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
                  {trader.tradeCount ? 
                    `${((trader.winCount / trader.tradeCount) * 100).toFixed(1)}%` : 
                    '0.0%'}
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
        </div>
      </main>
    </div>
  );
}
