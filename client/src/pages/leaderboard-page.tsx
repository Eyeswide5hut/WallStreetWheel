import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavHeader } from "@/components/layout/nav-header";
import { useState } from "react";
import type { LeaderboardMetric, User } from "@shared/schema";

const metrics: { value: LeaderboardMetric; label: string }[] = [
  { value: "totalProfitLoss", label: "Total P/L" },
  { value: "winRate", label: "Win Rate" },
  { value: "tradeCount", label: "Trade Count" },
  { value: "averageReturn", label: "Average Return" },
];

type LeaderboardUser = Pick<User, "id" | "username"> & {
  [K in LeaderboardMetric]: K extends "winRate" ? number : string | number | null;
};

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<LeaderboardMetric>("totalProfitLoss");

  const { data: leaders = [], isLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ["/api/leaderboard", { metric, order: "desc", limit: 10 }],
  });

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
                  <div
                    key={leader.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{leader.username}</span>
                    </div>
                    <span className="font-mono">
                      {metric === "totalProfitLoss" && `$${leader[metric]}`}
                      {metric === "winRate" && `${(Number(leader[metric]) * 100).toFixed(1)}%`}
                      {metric === "tradeCount" && leader[metric]}
                      {metric === "averageReturn" && `${Number(leader[metric]).toFixed(1)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}