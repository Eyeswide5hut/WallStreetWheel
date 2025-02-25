import { type InsertOptionScannerData } from "@shared/schema";

const POLYGON_BASE_URL = 'https://api.polygon.io/v2';

export async function fetchOptionsData(symbol: string): Promise<InsertOptionScannerData[]> {
  try {
    // First get the current stock price
    const stockResponse = await fetch(
      `${POLYGON_BASE_URL}/aggs/ticker/${symbol}/prev?apiKey=${process.env.POLYGON_API_KEY}`
    );

    if (!stockResponse.ok) {
      throw new Error(`Stock price API error: ${stockResponse.statusText}`);
    }

    const stockData = await stockResponse.json();
    const currentStockPrice = stockData.results?.[0]?.c || 0;

    // Then get options data
    const optionsResponse = await fetch(
      `${POLYGON_BASE_URL}/snapshot/options/${symbol}?apiKey=${process.env.POLYGON_API_KEY}`
    );

    if (!optionsResponse.ok) {
      throw new Error(`Options API error: ${optionsResponse.statusText}`);
    }

    const data = await optionsResponse.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (!data.data || !Array.isArray(data.data)) {
      console.log('Unexpected API response:', data);
      return [];
    }

    return data.data.map((option: any) => {
      const details = option.details || {};
      const greeks = option.greeks || {};
      const lastTrade = option.last_trade || {};

      // Calculate values
      const strikePrice = details.strike_price || 0;
      const lastPrice = lastTrade.price || 0;
      const daysToExpiry = Math.ceil(
        (new Date(details.expiration_date).getTime() - new Date().getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      // Calculate annual return
      const annualReturn = daysToExpiry > 0
        ? ((lastPrice / strikePrice) * (365 / daysToExpiry) * 100).toFixed(2)
        : "0";

      return {
        symbol: details.underlying_ticker || symbol,
        strikePrice: strikePrice.toString(),
        currentPrice: currentStockPrice.toString(),
        priceDifference: (((currentStockPrice - strikePrice) / strikePrice) * 100).toFixed(2),
        premium: lastPrice.toString(),
        impliedVolatility: ((option.implied_volatility || 0) * 100).toFixed(2),
        returnOnCapital: ((lastPrice / strikePrice) * 100).toFixed(2),
        annualReturn,
        volume: option.day?.volume || 0,
        expirationDate: new Date(details.expiration_date).toISOString(),
        greeks: {
          delta: Number(greeks.delta || 0).toFixed(3),
          gamma: Number(greeks.gamma || 0).toFixed(3),
          theta: Number(greeks.theta || 0).toFixed(3),
          vega: Number(greeks.vega || 0).toFixed(3),
          rho: Number(greeks.rho || 0).toFixed(3)
        }
      };
    });
  } catch (error) {
    console.error('Error fetching options data:', error);
    throw error;
  }
}