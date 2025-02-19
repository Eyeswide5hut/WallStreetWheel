
import { useToast } from "@/hooks/use-toast"

export function usePLAlert(threshold = 5) {
  const { toast } = useToast()
  
  const checkPL = (trade) => {
    const pl = parseFloat(trade.profitLoss || 0)
    if (Math.abs(pl) >= threshold) {
      toast({
        title: `P/L Alert`,
        description: `${trade.underlyingAsset} position ${pl > 0 ? 'up' : 'down'} ${Math.abs(pl)}%`,
        variant: pl > 0 ? "default" : "destructive"
      })
    }
  }
  
  return checkPL
}
