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

    if (!data.results || !Array.isArray(data.results)) {
      console.log('Unexpected API response:', data);
      return [];
    }

    return data.results.map((contract: any) => {
      // Ensure all required fields have default values
      const lastPrice = contract.last_trade?.price || 0;
      const strikePrice = contract.strike_price || 0;
      const impliedVol = contract.implied_volatility || 0;

      return {
        symbol: contract.underlying_ticker,
        strikePrice: strikePrice.toString(),
        currentPrice: lastPrice.toString(),
        priceDifference: (((lastPrice - strikePrice) / strikePrice) * 100).toString(),
        premium: lastPrice.toString(),
        impliedVolatility: (impliedVol * 100).toString(),
        returnOnCapital: ((lastPrice / strikePrice) * 100).toString(),
        annualReturn: "0", // Will calculate based on days to expiration
        volume: contract.trading_volume || 0,
        expirationDate: new Date(contract.expiration_date).toISOString(),
        greeks: {
          delta: contract.greeks?.delta || 0,
          gamma: contract.greeks?.gamma || 0,
          theta: contract.greeks?.theta || 0,
          vega: contract.greeks?.vega || 0,
          rho: contract.greeks?.rho || 0
        }
      };
    });
  } catch (error) {
    console.error('Error fetching options data:', error);
    throw error;
  }
}