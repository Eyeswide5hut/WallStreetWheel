import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


async function fetchCurrentPrice(symbol: string) {
  try {
    const response = await fetch(`/api/market-data/${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch price');
    const data = await response.json();
    return data.price;
  } catch (error) {
    console.error('Error fetching price:', error);
    return null;
  }
}

async function calculateUnrealizedPL(trade: Trade) {
  const premium = parseFloat(trade.premium?.toString() || '0');
  const quantity = trade.quantity;
  const strikePrice = parseFloat(trade.strikePrice?.toString() || '0');
  
  const currentPrice = await fetchCurrentPrice(trade.underlyingAsset);
  if (!currentPrice) return '-';

  if (trade.optionType?.includes('long')) {
    const pl = ((currentPrice - premium) * quantity * 100);
    const plPercent = ((currentPrice - premium) / premium * 100);
    return { amount: pl.toFixed(2), percentage: plPercent.toFixed(2) };
  } else if (trade.optionType?.includes('covered') || trade.optionType?.includes('secured')) {
    const pl = ((premium - currentPrice) * quantity * 100);
    const plPercent = ((premium - currentPrice) / premium * 100);
    return { amount: pl.toFixed(2), percentage: plPercent.toFixed(2) };
  }
  return { amount: '-', percentage: '-' };
}
