
import fetch from "node-fetch";

export interface StockStats {
  price: number;
  change24h: number;
  oneDay: number;
  oneWeek: number;
  oneMonth: number;
  twoMonths: number;
  threeMonths: number;
  sixMonths: number;
  oneYear: number;
  maxMonthlyDip: number;
  history: { date: string; price: number }[];
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache: Record<string, { data: StockStats; timestamp: number }> = {};

/**
 * Fetches real market data from Yahoo Finance API.
 * TICKERS for Indian NSE: SYMBOL.NS
 */
export async function getRealMarketData(symbol: string): Promise<StockStats | null> {
  const ticker = symbol.endsWith(".NS") ? symbol : `${symbol}.NS`;
  
  // Return from cache if fresh
  if (cache[ticker] && Date.now() - cache[ticker].timestamp < CACHE_TTL) {
    return cache[ticker].data;
  }

  try {
    // We fetch 1 year of daily data to calculate all stats
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`);
    const json = await response.json() as any;

    if (!json.chart || !json.chart.result || json.chart.result.length === 0) {
      console.error(`No data found for ticker: ${ticker}`);
      return null;
    }

    const result = json.chart.result[0];
    const prices = result.indicators.quote[0].close.filter((p: number | null) => p !== null);
    const timestamps = result.timestamp;

    if (prices.length === 0) return null;

    const currentPrice = prices[prices.length - 1];
    const prevDayPrice = prices.length > 1 ? prices[prices.length - 2] : currentPrice;
    
    const calculateChange = (periodDays: number) => {
      const index = Math.max(0, prices.length - periodDays - 1);
      const startPrice = prices[index];
      return ((currentPrice - startPrice) / startPrice) * 100;
    };

    // Calculate max monthly dip (lowest price in the last 30 days vs local peak or starting price)
    // Actually simplicity: (Current - Min in 30 days) / Min? No, dip is usually low vs high.
    // User asked for "maximum dip in this month".
    const last30Days = prices.slice(-30);
    const monthlyHigh = Math.max(...last30Days);
    const monthlyLow = Math.min(...last30Days);
    const maxMonthlyDip = ((monthlyLow - monthlyHigh) / monthlyHigh) * 100;

    const last30Prices = prices.slice(-30);
    const last30Timestamps = timestamps.slice(-30);
    const history = last30Prices.map((p: number, i: number) => ({
      date: new Date(last30Timestamps[i] * 1000).toISOString().split('T')[0],
      price: p
    }));

    const stats: StockStats = {
      price: currentPrice,
      change24h: ((currentPrice - prevDayPrice) / prevDayPrice) * 100,
      oneDay: calculateChange(1),
      oneWeek: calculateChange(5), 
      oneMonth: calculateChange(21), 
      twoMonths: calculateChange(42),
      threeMonths: calculateChange(63),
      sixMonths: calculateChange(126),
      oneYear: calculateChange(252),
      maxMonthlyDip: maxMonthlyDip,
      history: history
    };

    cache[ticker] = { data: stats, timestamp: Date.now() };
    return stats;
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return null;
  }
}
