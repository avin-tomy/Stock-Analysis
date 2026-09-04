import type { CellsMap } from '../../types/spreadsheet';
import { formatCellAddress } from './addressing';
import { recalcAll } from './formulaEngine';
import { COL, COLUMN_HEADERS, FIRST_DATA_ROW, HEADER_ROW } from './constants';

interface SeedRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  quantity: number;
  avgBuyPrice: number;
}

const SEED_ROWS: SeedRow[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2945.6, change: 12.4, changePercent: 0.42, quantity: 10, avgBuyPrice: 2650 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 4123.15, change: -8.9, changePercent: -0.22, quantity: 5, avgBuyPrice: 3800 },
  { symbol: 'INFY', name: 'Infosys', price: 1832.75, change: 5.3, changePercent: 0.29, quantity: 15, avgBuyPrice: 1500 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1678.4, change: -3.1, changePercent: -0.18, quantity: 20, avgBuyPrice: 1600 },
];

function setCell(cells: CellsMap, col: number, row: number, raw: string) {
  cells[formatCellAddress(col, row)] = { raw, value: null };
}

export function buildInitialCells(): CellsMap {
  const cells: CellsMap = {};

  COLUMN_HEADERS.forEach((header, colIndex) => {
    setCell(cells, colIndex, HEADER_ROW, header);
  });

  SEED_ROWS.forEach((seed, i) => {
    const row = FIRST_DATA_ROW + i;
    setCell(cells, COL.SYMBOL, row, seed.symbol);
    setCell(cells, COL.NAME, row, seed.name);
    setCell(cells, COL.PRICE, row, String(seed.price));
    setCell(cells, COL.CHANGE, row, String(seed.change));
    setCell(cells, COL.CHANGE_PERCENT, row, String(seed.changePercent));
    setCell(cells, COL.QUANTITY, row, String(seed.quantity));
    setCell(cells, COL.AVG_BUY_PRICE, row, String(seed.avgBuyPrice));

    const priceAddr = formatCellAddress(COL.PRICE, row);
    const qtyAddr = formatCellAddress(COL.QUANTITY, row);
    const avgAddr = formatCellAddress(COL.AVG_BUY_PRICE, row);
    const investAddr = formatCellAddress(COL.INVESTMENT_VALUE, row);
    const currentAddr = formatCellAddress(COL.CURRENT_VALUE, row);
    const plAddr = formatCellAddress(COL.PL, row);

    setCell(cells, COL.INVESTMENT_VALUE, row, `=${qtyAddr}*${avgAddr}`);
    setCell(cells, COL.CURRENT_VALUE, row, `=${priceAddr}*${qtyAddr}`);
    setCell(cells, COL.PL, row, `=${currentAddr}-${investAddr}`);
    setCell(cells, COL.PL_PERCENT, row, `=(${plAddr}/${investAddr})*100`);
  });

  return recalcAll(cells);
}
