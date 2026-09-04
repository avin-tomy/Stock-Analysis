export const COLS = 26; // A..Z
export const ROWS = 40; // rows 1..40 (row 1 = header)
export const HEADER_ROW = 1;
export const FIRST_DATA_ROW = 2;

export const ROW_HEADER_WIDTH = 40;
export const DEFAULT_COL_WIDTH = 100;
export const DEFAULT_ROW_HEIGHT = 28;
export const MIN_COL_WIDTH = 40;
export const MIN_ROW_HEIGHT = 20;

export const AUTOSAVE_INTERVAL_MS = 30_000;

export const DEFAULT_DECIMALS = 2;
export const MIN_DECIMALS = 0;
export const MAX_DECIMALS = 10;

export const COLUMN_HEADERS = [
  'Symbol',
  'Company Name',
  'Price',
  'Change',
  'Change %',
  'Quantity',
  'Avg Buy Price',
  'Investment Value',
  'Current Value',
  'P/L',
  'P/L %',
];

// Column indices (0-based) for semantic access from the rest of the app.
export const COL = {
  SYMBOL: 0,
  NAME: 1,
  PRICE: 2,
  CHANGE: 3,
  CHANGE_PERCENT: 4,
  QUANTITY: 5,
  AVG_BUY_PRICE: 6,
  INVESTMENT_VALUE: 7,
  CURRENT_VALUE: 8,
  PL: 9,
  PL_PERCENT: 10,
} as const;

export const NUMERIC_COLS: Set<number> = new Set([
  COL.PRICE,
  COL.CHANGE,
  COL.CHANGE_PERCENT,
  COL.QUANTITY,
  COL.AVG_BUY_PRICE,
  COL.INVESTMENT_VALUE,
  COL.CURRENT_VALUE,
  COL.PL,
  COL.PL_PERCENT,
]);
