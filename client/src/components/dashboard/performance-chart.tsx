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
import { format, startOfWeek, getWeek } from "date-fns";

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
    call_spread: number;
    put_spread: number;
    butterfly: number;
    straddle: number;
    strangle: number;
  }>();

  sorted.forEach(trade => {
    const date = new Date(trade.tradeDate);
    let periodKey: string;
    let displayPeriod: string;

    switch (timeFrame) {
      case 'weekly': {
        const startOfWeekDate = startOfWeek(date, { weekStartsOn: 1 });
        periodKey = format(startOfWeekDate, 'yyyy-MM-dd');
        displayPeriod = `Week ${getWeek(date)}`;
        break;
      }
      case 'monthly': {
        periodKey = format(date, 'yyyy-MM');
        displayPeriod = format(date, 'MMM yyyy');
        break;
      }
      case 'yearly': {
        periodKey = format(date, 'yyyy');
        displayPeriod = periodKey;
        break;
      }
    }

    if (!periods.has(periodKey)) {
      periods.set(periodKey, {
        period: displayPeriod,
        totalPnL: 0,
        covered_call: 0,
        naked_put: 0,
        iron_condor: 0,
        call_spread: 0,
        put_spread: 0,
        butterfly: 0,
        straddle: 0,
        strangle: 0
      });
    }

    const period = periods.get(periodKey)!;
    const pnl = Number(trade.profitLoss) || 0;
    period.totalPnL += pnl;

    // Aggregate by strategy
    if (trade.tradeType === 'option' && trade.strategy) {
      switch (trade.strategy) {
        case 'covered_call':
          period.covered_call += pnl;
          break;
        case 'naked_put':
          period.naked_put += pnl;
          break;
        case 'iron_condor':
          period.iron_condor += pnl;
          break;
        case 'call_spread':
          period.call_spread += pnl;
          break;
        case 'put_spread':
          period.put_spread += pnl;
          break;
        case 'butterfly':
          period.butterfly += pnl;
          break;
        case 'straddle':
          period.straddle += pnl;
          break;
        case 'strangle':
          period.strangle += pnl;
          break;
      }
    }
  });

  return Array.from(periods.values());
};

export function PerformanceChart() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<'pnl' | 'strategy'>('pnl');

  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading chart data...</p>
        </CardContent>
      </Card>
    );
  }

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

  const formatTooltipValue = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
          <XAxis
            dataKey="period"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            formatter={(value: number) => [formatTooltipValue(value), 'P/L']}
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
              {chartData.some(d => d.call_spread !== 0) && (
                <Line type="monotone" dataKey="call_spread" name="Call Spreads" stroke="#ff7300" />
              )}
              {chartData.some(d => d.put_spread !== 0) && (
                <Line type="monotone" dataKey="put_spread" name="Put Spreads" stroke="#e91e63" />
              )}
              {chartData.some(d => d.butterfly !== 0) && (
                <Line type="monotone" dataKey="butterfly" name="Butterfly" stroke="#9c27b0" />
              )}
              {chartData.some(d => d.straddle !== 0) && (
                <Line type="monotone" dataKey="straddle" name="Straddle" stroke="#673ab7" />
              )}
              {chartData.some(d => d.strangle !== 0) && (
                <Line type="monotone" dataKey="strangle" name="Strangle" stroke="#3f51b5" />
              )}
            </>
          )}
        </LineChart>
      );
    }

    return (
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
        <XAxis
          dataKey="period"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(value: number) => [formatTooltipValue(value), 'P/L']}
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
            {chartData.some(d => d.call_spread !== 0) && (
              <Bar dataKey="call_spread" name="Call Spreads" fill="#ff7300" stackId="a" />
            )}
            {chartData.some(d => d.put_spread !== 0) && (
              <Bar dataKey="put_spread" name="Put Spreads" fill="#e91e63" stackId="a" />
            )}
            {chartData.some(d => d.butterfly !== 0) && (
              <Bar dataKey="butterfly" name="Butterfly" fill="#9c27b0" stackId="a" />
            )}
            {chartData.some(d => d.straddle !== 0) && (
              <Bar dataKey="straddle" name="Straddle" fill="#673ab7" stackId="a" />
            )}
            {chartData.some(d => d.strangle !== 0) && (
              <Bar dataKey="strangle" name="Strangle" fill="#3f51b5" stackId="a" />
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