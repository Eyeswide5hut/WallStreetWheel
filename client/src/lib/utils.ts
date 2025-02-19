import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


function calculateUnrealizedPL(trade: Trade) {
  const premium = parseFloat(trade.premium?.toString() || '0');
  const quantity = trade.quantity;
  const strikePrice = parseFloat(trade.strikePrice?.toString() || '0');
  const currentPrice = trade.currentPrice || strikePrice; // This would need to be fetched from market data

  if (trade.optionType?.includes('long')) {
    // Long options
    return ((currentPrice - premium) * quantity * 100).toFixed(2);
  } else if (trade.optionType?.includes('covered') || trade.optionType?.includes('secured')) {
    // Short options
    return ((premium - currentPrice) * quantity * 100).toFixed(2);
  }
  return '-';
}
