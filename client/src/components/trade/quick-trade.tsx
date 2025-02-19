
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

export function QuickTrade() {
  const [symbol, setSymbol] = useState("")
  const [quantity, setQuantity] = useState("")
  
  const quickTradeMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/trades/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error("Failed to submit trade")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] })
      setSymbol("")
      setQuantity("")
    }
  })

  return (
    <div className="flex gap-2">
      <Input 
        placeholder="Symbol" 
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      <Input 
        placeholder="Qty" 
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <Button onClick={() => quickTradeMutation.mutate({ symbol, quantity })}>
        Quick Trade
      </Button>
    </div>
  )
}
