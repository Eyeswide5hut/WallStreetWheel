
import type { Trade } from "@shared/schema";

export function calculateOptionPL(trade: Trade): number {
  if (!trade.premium || !trade.quantity) return 0;
  
  const premium = parseFloat(trade.premium.toString());
  const quantity = trade.quantity;
  const multiplier = 100; // Options contract multiplier
  
  if (trade.status === 'closed' && trade.closePrice) {
    const closePrice = parseFloat(trade.closePrice.toString());
    
    if (trade.optionType?.includes('long')) {
      return (closePrice - premium) * quantity * multiplier;
    } else {
      return (premium - closePrice) * quantity * multiplier;
    }
  }

  return 0;
}

export function calculateROC(trade: Trade): number {
  if (!trade.premium || !trade.strikePrice) return 0;
  
  const premium = parseFloat(trade.premium.toString());
  const strike = parseFloat(trade.strikePrice.toString());
  
  if (trade.optionType === 'cash_secured_put') {
    return (premium / strike) * 100;
  } else if (trade.optionType === 'covered_call') {
    return (premium / strike) * 100;
  }
  
  return (premium / (premium * 100)) * 100; // For long options
}

export function calculateAnnualizedROC(trade: Trade): number {
  if (!trade.tradeDate || !trade.expirationDate) return 0;
  
  const roc = calculateROC(trade);
  const daysToExpiry = Math.ceil(
    (new Date(trade.expirationDate).getTime() - new Date(trade.tradeDate).getTime()) 
    / (1000 * 60 * 60 * 24)
  );
  
  return (roc * 365) / daysToExpiry;
}
