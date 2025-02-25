import { type InsertOptionScannerData } from "@shared/schema";

const POLYGON_BASE_URL = 'https://api.polygon.io/v3';

export async function fetchOptionsData(symbol: string): Promise<InsertOptionScannerData[]> {
  try {
    // First get the current stock price
    const stockUrl = `${POLYGON_BASE_URL}/snapshot/ticker/${symbol}/trades?apiKey=${process.env.POLYGON_API_KEY}`;
    console.log('Fetching stock price from:', stockUrl);

    const stockResponse = await fetch(stockUrl);

    if (!stockResponse.ok) {
      const errorText = await stockResponse.text();
      console.error('Stock price API error:', {
        status: stockResponse.status,
        statusText: stockResponse.statusText,
        response: errorText
      });
      throw new Error(`Stock price API error: ${stockResponse.statusText}`);
    }

    const stockData = await stockResponse.json();
    console.log('Stock Data Response:', JSON.stringify(stockData, null, 2));
    const currentStockPrice = stockData.results?.last?.price || 0;

    // Then get options data
    const optionsUrl = `${POLYGON_BASE_URL}/reference/options/contracts?underlying_ticker=${symbol}&expired=false&limit=100&apiKey=${process.env.POLYGON_API_KEY}`;
    console.log('Fetching options data from:', optionsUrl);

    const optionsResponse = await fetch(optionsUrl);

    if (!optionsResponse.ok) {
      const errorText = await optionsResponse.text();
      console.error('Options API error:', {
        status: optionsResponse.status,
        statusText: optionsResponse.statusText,
        response: errorText
      });
      throw new Error(`Options API error: ${optionsResponse.statusText}`);
    }

    const data = await optionsResponse.json();
    console.log('Options API Response:', JSON.stringify(data, null, 2));

    if (!data.results || !Array.isArray(data.results)) {
      console.error('Unexpected API response structure:', {
        hasResults: !!data.results,
        isArray: Array.isArray(data.results),
        data
      });
      return [];
    }

    // Filter out expired options and map the data
    const now = new Date();
    const validOptions = data.results.filter(option => 
      new Date(option.expiration_date) > now
    );

    console.log(`Found ${validOptions.length} valid options for ${symbol}`);

    return validOptions.map((option: any) => {
      const strikePrice = option.strike_price || 0;
      const daysToExpiry = Math.ceil(
        (new Date(option.expiration_date).getTime() - now.getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      // Get the option type from contract name
      const isCall = option.contract_type === "call";
      const delta = isCall ? 0.5 : -0.5; // Default delta based on option type

      const mappedOption = {
        symbol: option.underlying_ticker || symbol,
        strikePrice: strikePrice.toString(),
        currentPrice: currentStockPrice.toString(),
        priceDifference: (((currentStockPrice - strikePrice) / strikePrice) * 100).toFixed(2),
        premium: (option.primary_exchange || "0").toString(),
        impliedVolatility: "30.00", // Default IV since snapshot endpoint is needed for live data
        returnOnCapital: ((option.strike_price / currentStockPrice) * 100).toFixed(2),
        annualReturn: daysToExpiry > 0
          ? (((option.strike_price / currentStockPrice) * (365 / daysToExpiry)) * 100).toFixed(2)
          : "0",
        volume: option.trade_volume || 0,
        expirationDate: new Date(option.expiration_date).toISOString(),
        greeks: {
          delta: delta.toFixed(3),
          gamma: "0.020",
          theta: "-0.015",
          vega: "0.100",
          rho: "0.010"
        }
      };

      console.log(`Mapped option for ${symbol}:`, mappedOption);
      return mappedOption;
    });
  } catch (error) {
    console.error('Error fetching options data:', error);
    throw error;
  }
}