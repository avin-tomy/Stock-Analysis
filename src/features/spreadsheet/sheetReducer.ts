import type { CellsMap, ConditionalFormatting, ConditionalRule, RowStatus, SheetState } from '../../types/spreadsheet';
import type { PriceQuote } from '../../types/stock';
import { buildInitialCells } from './initialData';
import { recalcAll, shiftFormula } from './formulaEngine';
import { formatCellAddress, getRangeBounds } from './addressing';
import { COL } from './constants';

export type SheetAction =
  | { type: 'SET_CELL_RAW'; address: string; raw: string }
  | { type: 'SET_SELECTED'; address: string | null }
  | { type: 'SET_SELECTION_RANGE'; anchor: string; end: string }
  | { type: 'CLEAR_RANGE'; anchor: string; end: string }
  | { type: 'START_EDIT'; address: string; seed?: string }
  | { type: 'END_EDIT' }
  | { type: 'APPLY_PRICE_UPDATES'; updates: Record<number, PriceQuote> }
  | { type: 'SET_ROW_STATUS'; rowIndex: number; status: RowStatus; message?: string }
  | { type: 'SET_REFRESH_STATE'; state: 'idle' | 'refreshing'; lastUpdated?: string; summary?: string }
  | { type: 'SET_COLUMN_WIDTH'; col: number; width: number }
  | { type: 'SET_ROW_HEIGHT'; row: number; height: number }
  | {
      type: 'HYDRATE_SHEET';
      cells: CellsMap;
      columnWidths: Record<number, number>;
      rowHeights: Record<number, number>;
      conditionalFormatting: ConditionalFormatting;
      updatedAt: string;
    }
  | { type: 'SET_SAVE_STATE'; state: 'idle' | 'saving' | 'error'; lastSavedAt?: string; error?: string }
  | { type: 'FILL_DOWN'; fromCol: number; toCol: number; sourceRow: number; toRow: number }
  | { type: 'SET_COLUMN_RULES'; col: number; rules: ConditionalRule[] };

export function buildInitialState(): SheetState {
  return {
    cells: buildInitialCells(),
    selected: formatCellAddress(0, 2),
    rangeEnd: null,
    editing: null,
    editingSeed: null,
    rowStatuses: {},
    refresh: { state: 'idle', lastUpdated: null },
    columnWidths: {},
    rowHeights: {},
    save: { state: 'idle', lastSavedAt: null },
    conditionalFormatting: {},
  };
}

export function sheetReducer(state: SheetState, action: SheetAction): SheetState {
  switch (action.type) {
    case 'SET_CELL_RAW': {
      const nextCells = {
        ...state.cells,
        [action.address]: { raw: action.raw, value: null },
      };
      return { ...state, cells: recalcAll(nextCells) };
    }

    case 'SET_SELECTED':
      // A plain selection always collapses any multi-cell range.
      return { ...state, selected: action.address, rangeEnd: null };

    case 'SET_SELECTION_RANGE':
      return { ...state, selected: action.anchor, rangeEnd: action.end };

    case 'CLEAR_RANGE': {
      const bounds = getRangeBounds(action.anchor, action.end);
      if (!bounds) return state;
      const nextCells = { ...state.cells };
      for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
          nextCells[formatCellAddress(col, row)] = { raw: '', value: null };
        }
      }
      return { ...state, cells: recalcAll(nextCells) };
    }

    case 'START_EDIT':
      return {
        ...state,
        selected: action.address,
        rangeEnd: null,
        editing: action.address,
        editingSeed: action.seed ?? null,
      };

    case 'END_EDIT':
      return { ...state, editing: null, editingSeed: null };

    case 'APPLY_PRICE_UPDATES': {
      const nextCells = { ...state.cells };
      for (const [rowIndexStr, quote] of Object.entries(action.updates)) {
        const row = Number(rowIndexStr);
        nextCells[formatCellAddress(COL.PRICE, row)] = { raw: String(quote.price), value: null };
        nextCells[formatCellAddress(COL.CHANGE, row)] = { raw: String(quote.change), value: null };
        nextCells[formatCellAddress(COL.CHANGE_PERCENT, row)] = {
          raw: String(quote.changePercent),
          value: null,
        };
      }
      return { ...state, cells: recalcAll(nextCells) };
    }

    case 'SET_ROW_STATUS':
      return {
        ...state,
        rowStatuses: {
          ...state.rowStatuses,
          [action.rowIndex]: { status: action.status, message: action.message },
        },
      };

    case 'SET_REFRESH_STATE':
      return {
        ...state,
        refresh: {
          state: action.state,
          lastUpdated: action.lastUpdated ?? state.refresh.lastUpdated,
          summary: action.summary ?? state.refresh.summary,
        },
      };

    case 'SET_COLUMN_WIDTH':
      return {
        ...state,
        columnWidths: { ...state.columnWidths, [action.col]: action.width },
      };

    case 'SET_ROW_HEIGHT':
      return {
        ...state,
        rowHeights: { ...state.rowHeights, [action.row]: action.height },
      };

    case 'HYDRATE_SHEET':
      return {
        ...state,
        cells: recalcAll(action.cells),
        columnWidths: action.columnWidths,
        rowHeights: action.rowHeights,
        conditionalFormatting: action.conditionalFormatting,
        save: { state: 'idle', lastSavedAt: action.updatedAt },
      };

    case 'SET_COLUMN_RULES':
      return {
        ...state,
        conditionalFormatting: { ...state.conditionalFormatting, [action.col]: action.rules },
      };

    case 'SET_SAVE_STATE':
      return {
        ...state,
        save: {
          state: action.state,
          lastSavedAt: action.lastSavedAt ?? state.save.lastSavedAt,
          error: action.error,
        },
      };

    case 'FILL_DOWN': {
      const nextCells = { ...state.cells };
      for (let col = action.fromCol; col <= action.toCol; col++) {
        const sourceCell = state.cells[formatCellAddress(col, action.sourceRow)];
        if (!sourceCell) continue;
        for (let row = action.sourceRow + 1; row <= action.toRow; row++) {
          const rowDelta = row - action.sourceRow;
          const raw = shiftFormula(sourceCell.raw, rowDelta, 0);
          nextCells[formatCellAddress(col, row)] = { raw, value: null };
        }
      }
      return { ...state, cells: recalcAll(nextCells) };
    }

    default:
      return state;
  }
}
