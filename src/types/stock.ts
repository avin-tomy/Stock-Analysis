export interface PriceQuote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

export interface PriceFetchResult {
  symbol: string;
  ok: boolean;
  data?: PriceQuote;
  error?: string;
}
