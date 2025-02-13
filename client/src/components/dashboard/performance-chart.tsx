import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function PerformanceChart() {
  const { data: trades } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  if (!trades?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">No trade data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = trades
    .sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime())
    .reduce((acc: any[], trade) => {
      const date = new Date(trade.tradeDate).toLocaleDateString();
      const lastEntry = acc[acc.length - 1] || { cumulative: 0 };
      // Premium is already stored as positive (credit) or negative (debit)
      // so we can use it directly in calculations
      const premium = Number(trade.premium);
      return [
        ...acc,
        {
          date,
          premium,
          cumulative: lastEntry.cumulative + premium,
        },
      ];
    }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Over Time</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="date" 
              stroke="#888888"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'P/L']}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}