import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { TradeTable } from "@/components/trade/trade-table";
import { Link } from "wouter";
import { NavHeader } from "@/components/layout/nav-header";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
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