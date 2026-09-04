import { Router } from 'express';
import { fetchQuote } from '../services/yahooFinance.js';
import type { PriceQuote } from '../types.js';

export const pricesRouter = Router();

pricesRouter.post('/', async (req, res) => {
  const { symbols } = req.body ?? {};

  if (!Array.isArray(symbols) || symbols.some((s) => typeof s !== 'string')) {
    res.status(400).json({ error: 'symbols must be an array of strings' });
    return;
  }

  const results = await Promise.allSettled(symbols.map((symbol: string) => fetchQuote(symbol)));

  const bySymbol: Record<string, PriceQuote> = {};
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      bySymbol[symbols[i]] = result.value;
    }
    // Failed symbols are simply omitted; the frontend treats a missing key
    // as a per-row failure and shows it without breaking the whole refresh.
  });

  res.status(200).json(bySymbol);
});
