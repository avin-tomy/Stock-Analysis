import type { PriceQuote } from '../types.js';

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        previousClose?: number;
        chartPreviousClose?: number;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

/**
 * Fetches a live NSE quote for one symbol from Yahoo Finance's unofficial
 * chart endpoint. This runs server-side specifically so the browser never
 * hits it directly — that endpoint sends no CORS headers, and it's also
 * undocumented/unofficial, so isolating it here means a future swap to a
 * different provider only touches this one file.
 */
export async function fetchQuote(symbol: string): Promise<PriceQuote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?interval=1d&range=1d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; StockSheet/1.0)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance responded with ${response.status}`);
  }

  const body = (await response.json()) as YahooChartResponse;
  if (body.chart.error) {
    throw new Error(body.chart.error.description);
  }

  const meta = body.chart.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const previousClose = meta?.previousClose ?? meta?.chartPreviousClose;

  if (typeof price !== 'number' || typeof previousClose !== 'number') {
    throw new Error(`No price data for symbol "${symbol}"`);
  }

  const change = price - previousClose;
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

  return { symbol, price, previousClose, change, changePercent };
}
