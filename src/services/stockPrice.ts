import type { PriceFetchResult, PriceQuote } from '../types/stock';

const PRICES_ENDPOINT = '/api/prices';

/**
 * Fetches live prices for the given NSE symbols.
 *
 * This calls our own backend (Express, built separately) rather than a
 * third-party stock API directly, so there's no CORS workaround needed and
 * no API keys exposed in the browser. Until that backend exists, every
 * request here fails and is normalized into a per-symbol {ok:false} result —
 * this file will not need to change once the backend is running.
 */
export async function fetchPrices(symbols: string[]): Promise<Record<string, PriceFetchResult>> {
  const results = await Promise.allSettled(
    symbols.map((symbol) => fetchSinglePrice(symbol))
  );

  const bySymbol: Record<string, PriceFetchResult> = {};
  results.forEach((result, i) => {
    const symbol = symbols[i];
    bySymbol[symbol] =
      result.status === 'fulfilled' ? result.value : { symbol, ok: false, error: describeError(result.reason) };
  });
  return bySymbol;
}

async function fetchSinglePrice(symbol: string): Promise<PriceFetchResult> {
  try {
    const response = await fetch(PRICES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: [symbol] }),
    });

    if (!response.ok) {
      return { symbol, ok: false, error: `Backend responded with ${response.status}` };
    }

    const body = (await response.json()) as Record<string, PriceQuote>;
    const data = body[symbol];
    if (!data) {
      return { symbol, ok: false, error: 'No data returned for symbol' };
    }
    return { symbol, ok: true, data };
  } catch (err) {
    return { symbol, ok: false, error: describeError(err) };
  }
}

function describeError(err: unknown): string {
  if (err instanceof TypeError) {
    // fetch() rejects with a generic TypeError for both "server unreachable"
    // and CORS blocks; the backend isn't built yet, so this is expected.
    return 'Backend not available yet';
  }
  return err instanceof Error ? err.message : 'Unknown error';
}
