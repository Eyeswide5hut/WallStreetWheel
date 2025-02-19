
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MetricsCard({ trades }) {
  const avgHoldingTime = trades?.reduce((sum, t) => {
    if (!t.closeDate) return sum
    return sum + (new Date(t.closeDate).getTime() - new Date(t.tradeDate).getTime())
  }, 0) / (trades?.length || 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Avg Holding Time</span>
            <span>{Math.round(avgHoldingTime / (1000 * 60 * 60 * 24))} days</span>
          </div>
          <div className="flex justify-between">
            <span>Win/Loss Ratio</span>
            <span>{((trades?.filter(t => Number(t.profitLoss) > 0).length || 0) / (trades?.length || 1)).toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
