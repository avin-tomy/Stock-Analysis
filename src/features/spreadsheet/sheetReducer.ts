import type { CellsMap, RowStatus, SheetState } from '../../types/spreadsheet';
import type { PriceQuote } from '../../types/stock';
import { buildInitialCells } from './initialData';
import { recalcAll } from './formulaEngine';
import { formatCellAddress } from './addressing';
import { COL } from './constants';

export type SheetAction =
  | { type: 'SET_CELL_RAW'; address: string; raw: string }
  | { type: 'SET_SELECTED'; address: string | null }
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
      updatedAt: string;
    }
  | { type: 'SET_SAVE_STATE'; state: 'idle' | 'saving' | 'error'; lastSavedAt?: string; error?: string };

export function buildInitialState(): SheetState {
  return {
    cells: buildInitialCells(),
    selected: formatCellAddress(0, 2),
    editing: null,
    editingSeed: null,
    rowStatuses: {},
    refresh: { state: 'idle', lastUpdated: null },
    columnWidths: {},
    rowHeights: {},
    save: { state: 'idle', lastSavedAt: null },
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
      return { ...state, selected: action.address };

    case 'START_EDIT':
      return {
        ...state,
        selected: action.address,
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
        save: { state: 'idle', lastSavedAt: action.updatedAt },
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

    default:
      return state;
  }
}
