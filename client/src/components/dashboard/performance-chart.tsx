import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@shared/schema";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimeFrame = 'weekly' | 'monthly' | 'yearly';
type ChartType = 'line' | 'bar';

const aggregateTradesByPeriod = (trades: Trade[], timeFrame: TimeFrame) => {
  const sorted = [...trades].sort((a, b) => 
    new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  const periods = new Map<string, {
    period: string;
    totalPnL: number;
    covered_call: number;
    naked_put: number;
    iron_condor: number;
    other: number;
  }>();

  sorted.forEach(trade => {
    const date = new Date(trade.tradeDate);
    let periodKey: string;

    switch (timeFrame) {
      case 'weekly':
        // Get Monday of the week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        periodKey = new Date(date.setDate(diff)).toISOString().split('T')[0];
        break;
      case 'monthly':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'yearly':
        periodKey = date.getFullYear().toString();
        break;
    }

    if (!periods.has(periodKey)) {
      periods.set(periodKey, {
        period: periodKey,
        totalPnL: 0,
        covered_call: 0,
        naked_put: 0,
        iron_condor: 0,
        other: 0
      });
    }

    const period = periods.get(periodKey)!;
    const pnl = Number(trade.profitLoss) || 0;
    period.totalPnL += pnl;

    // Aggregate by strategy
    if (trade.tradeType === 'option') {
      switch (trade.optionStrategy) {
        case 'covered_call':
          period.covered_call += pnl;
          break;
        case 'naked_put':
          period.naked_put += pnl;
          break;
        case 'iron_condor':
          period.iron_condor += pnl;
          break;
        default:
          period.other += pnl;
      }
    } else {
      period.other += pnl;
    }
  });

  return Array.from(periods.values());
};

export function PerformanceChart() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<'pnl' | 'strategy'>('pnl');

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

  const chartData = aggregateTradesByPeriod(trades, timeFrame);

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis
            dataKey="period"
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
          <Legend />
          {viewMode === 'pnl' ? (
            <Line
              type="monotone"
              dataKey="totalPnL"
              name="Total P/L"
              stroke="hsl(var(--primary))"
              dot={false}
              strokeWidth={2}
            />
          ) : (
            <>
              {chartData.some(d => d.covered_call !== 0) && (
                <Line type="monotone" dataKey="covered_call" name="Covered Calls" stroke="#8884d8" />
              )}
              {chartData.some(d => d.naked_put !== 0) && (
                <Line type="monotone" dataKey="naked_put" name="Naked Puts" stroke="#82ca9d" />
              )}
              {chartData.some(d => d.iron_condor !== 0) && (
                <Line type="monotone" dataKey="iron_condor" name="Iron Condors" stroke="#ffc658" />
              )}
              {chartData.some(d => d.other !== 0) && (
                <Line type="monotone" dataKey="other" name="Other" stroke="#ff7300" />
              )}
            </>
          )}
        </LineChart>
      );
    }

    return (
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis
          dataKey="period"
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
        <Legend />
        {viewMode === 'pnl' ? (
          <Bar dataKey="totalPnL" name="Total P/L" fill="hsl(var(--primary))" />
        ) : (
          <>
            {chartData.some(d => d.covered_call !== 0) && (
              <Bar dataKey="covered_call" name="Covered Calls" fill="#8884d8" stackId="a" />
            )}
            {chartData.some(d => d.naked_put !== 0) && (
              <Bar dataKey="naked_put" name="Naked Puts" fill="#82ca9d" stackId="a" />
            )}
            {chartData.some(d => d.iron_condor !== 0) && (
              <Bar dataKey="iron_condor" name="Iron Condors" fill="#ffc658" stackId="a" />
            )}
            {chartData.some(d => d.other !== 0) && (
              <Bar dataKey="other" name="Other" fill="#ff7300" stackId="a" />
            )}
          </>
        )}
      </BarChart>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Over Time</CardTitle>
          <div className="flex gap-2">
            <Select value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'pnl' | 'strategy')} className="space-y-4">
          <TabsList>
            <TabsTrigger value="pnl">Total P/L</TabsTrigger>
            <TabsTrigger value="strategy">By Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value={viewMode} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}