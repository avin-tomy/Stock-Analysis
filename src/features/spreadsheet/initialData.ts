import type { CellsMap } from '../../types/spreadsheet';
import { formatCellAddress } from './addressing';
import { recalcAll } from './formulaEngine';
import { COL, COLUMN_HEADERS, FIRST_DATA_ROW, HEADER_ROW } from './constants';

interface SeedRow {
  symbol: string;
  name: string;
  price: number;
}

const SEED_ROWS: SeedRow[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2945.6 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 4123.15 },
  { symbol: 'INFY', name: 'Infosys', price: 1832.75 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1678.4 },
];

function setCell(cells: CellsMap, col: number, row: number, raw: string) {
  cells[formatCellAddress(col, row)] = { raw, value: null };
}

export function buildInitialCells(): CellsMap {
  const cells: CellsMap = {};

  // Only label Symbol/Company Name/Price in the header row — the remaining
  // columns (Change, Quantity, Avg Buy Price, the formula columns, etc.)
  // start with a blank header too, matching their blank seed data.
  COLUMN_HEADERS.slice(0, COL.PRICE + 1).forEach((header, colIndex) => {
    setCell(cells, colIndex, HEADER_ROW, header);
  });

  // Only Symbol, Company Name, and Price are seeded — Change/Quantity/Avg
  // Buy Price and the formula columns (Investment/Current Value, P/L, P/L%)
  // start blank so the user fills in their own holdings and formulas.
  SEED_ROWS.forEach((seed, i) => {
    const row = FIRST_DATA_ROW + i;
    setCell(cells, COL.SYMBOL, row, seed.symbol);
    setCell(cells, COL.NAME, row, seed.name);
    setCell(cells, COL.PRICE, row, String(seed.price));
  });

  return recalcAll(cells);
}
