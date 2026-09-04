export interface PriceQuote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}
