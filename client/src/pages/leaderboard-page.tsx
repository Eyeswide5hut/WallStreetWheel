import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavHeader } from "@/components/layout/nav-header";
import { useState } from "react";
import { Link } from "wouter";
import type { LeaderboardMetric } from "@shared/schema";

const metrics: { value: LeaderboardMetric; label: string }[] = [
  { value: "totalProfitLoss", label: "Total P/L" },
  { value: "winRate", label: "Win Rate" },
  { value: "tradeCount", label: "Trade Count" },
  { value: "averageReturn", label: "Average Return" },
];

type LeaderboardEntry = {
  id: number;
  username: string;
  value: number | string;
};

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<LeaderboardMetric>("totalProfitLoss");

  const { data: leaders = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", metric],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        metric,
        order: 'desc',
        limit: '10'
      });
      return fetch(`/api/leaderboard?${searchParams}`).then(res => {
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        return res.json();
      });
    },
  });

  const formatValue = (value: number | string) => {
    switch (metric) {
      case "totalProfitLoss":
        return typeof value === 'string' ? `$${parseFloat(value).toFixed(2)}` : `$${value.toFixed(2)}`;
      case "winRate":
        return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '0.0%';
      case "tradeCount":
        return value.toString();
      case "averageReturn":
        return typeof value === 'number' ? `${value.toFixed(1)}%` :
               typeof value === 'string' ? `${parseFloat(value).toFixed(1)}%` : '0.0%';
      default:
        return '0';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Leaderboard</h2>
            <Select
              value={metric}
              onValueChange={(value) => setMetric(value as LeaderboardMetric)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {leaders.map((leader, index) => (
                  <Link key={leader.id} href={`/traders/${leader.id}`}>
                    <div
                      className="flex items-center justify-between py-4 hover:bg-accent/50 cursor-pointer rounded-md px-2 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="font-medium">{leader.username}</span>
                      </div>
                      <span className="font-mono">
                        {formatValue(leader.value)}
                      </span>
                    </div>
                  </Link>
                ))}
                {!isLoading && leaders.length === 0 && (
                  <div className="py-4 text-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}