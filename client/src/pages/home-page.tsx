import { useAuth } from "@/hooks/use-auth";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { TradeTable } from "@/components/trade/trade-table";
import { NavHeader } from "@/components/layout/nav-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Overview Section */}
          <section>
            <h2 className="text-3xl font-bold tracking-tight mb-6">Trading Dashboard</h2>
            <OverviewCards />
          </section>

          {/* Main Content */}
          <section>
            <Tabs defaultValue="performance" className="space-y-4">
              <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="positions">Positions</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-4">
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Portfolio Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PerformanceChart />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Win Rate</p>
                          <p className="text-2xl font-bold">68%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Profit Factor</p>
                          <p className="text-2xl font-bold">2.1</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Total Trades</p>
                          <p className="text-2xl font-bold">156</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Avg Return</p>
                          <p className="text-2xl font-bold">12.4%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="positions">
                <Card>
                  <CardHeader>
                    <CardTitle>Open Positions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TradeTable />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Trade History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TradeTable showClosed={true} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>
    </div>
  );
}