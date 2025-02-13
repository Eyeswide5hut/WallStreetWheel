import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade, debitOptionTypes, creditOptionTypes } from "@shared/schema";
import { Loader2 } from "lucide-react";

export function OverviewCards() {
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded w-3/4" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const totalTrades = trades?.length || 0;

  // A trade is profitable if premium is positive (credit trades) or if it's a completed debit trade
  const profitableTrades = trades?.filter(t => {
    const premium = Number(t.premium);
    if (creditOptionTypes.includes(t.optionType as any)) {
      return premium > 0; // Credit trades are profitable when premium is positive
    } else if (debitOptionTypes.includes(t.optionType as any)) {
      return premium < 0; // Debit trades show as negative premium (cost)
    }
    return premium > 0; // For spreads, positive premium means profitable
  }).length || 0;

  const winRate = totalTrades ? (profitableTrades / totalTrades * 100).toFixed(1) : "0";

  // Total P/L is the sum of all premiums (already stored as positive for credits and negative for debits)
  const totalPremium = trades?.reduce((sum, t) => sum + Number(t.premium), 0) || 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTrades}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{winRate}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${totalPremium >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPremium.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {trades?.filter(t => new Date(t.expirationDate) > new Date()).length || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}