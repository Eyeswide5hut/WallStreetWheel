import { type InsertOptionScannerData } from "@shared/schema";

const POLYGON_BASE_URL = 'https://api.polygon.io/v3';

export async function fetchOptionsData(symbol: string): Promise<InsertOptionScannerData[]> {
  try {
    const response = await fetch(
      `${POLYGON_BASE_URL}/reference/options/contracts?underlying_ticker=${symbol}&apiKey=${process.env.POLYGON_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.results.map((contract: any) => ({
      symbol: contract.underlying_ticker,
      strikePrice: contract.strike_price.toString(),
      currentPrice: contract.last_trade?.price?.toString() || "0",
      priceDifference: ((contract.last_trade?.price - contract.strike_price) / contract.strike_price * 100).toString(),
      premium: contract.last_trade?.price?.toString() || "0",
      impliedVolatility: (contract.implied_volatility * 100).toString(),
      returnOnCapital: ((contract.last_trade?.price / contract.strike_price) * 100).toString(),
      annualReturn: "0", // Calculated based on days to expiration
      volume: contract.day.volume || 0,
      expirationDate: contract.expiration_date,
      greeks: {
        delta: contract.greeks?.delta || 0,
        gamma: contract.greeks?.gamma || 0,
        theta: contract.greeks?.theta || 0,
        vega: contract.greeks?.vega || 0,
        rho: contract.greeks?.rho || 0
      }
    }));
  } catch (error) {
    console.error('Error fetching options data:', error);
    throw error;
  }
}
