
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line } from "react-chartjs-2"

export function SuccessTrend({ trades }) {
  const data = {
    labels: trades?.map(t => new Date(t.tradeDate).toLocaleDateString()),
    datasets: [{
      label: 'Success Rate',
      data: trades?.map((_, i) => {
        const subset = trades.slice(0, i + 1)
        const wins = subset.filter(t => Number(t.profitLoss) > 0).length
        return (wins / subset.length) * 100
      }),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Success Rate Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <Line data={data} options={{ responsive: true }} />
      </CardContent>
    </Card>
  )
}
