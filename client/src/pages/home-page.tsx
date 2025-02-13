import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { TradeTable } from "@/components/trade/trade-table";
import { Link } from "wouter";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trading Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Welcome, {user?.username}</span>
            <Link href="/trade">
              <Button variant="outline">New Trade</Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline">Profile Settings</Button>
            </Link>
            <Button 
              variant="ghost" 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          <OverviewCards />
          <div className="grid lg:grid-cols-2 gap-8">
            <PerformanceChart />
            <TradeTable />
          </div>
        </div>
      </main>
    </div>
  );
}