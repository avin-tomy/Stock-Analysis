import { useCallback, useEffect, useReducer } from 'react';
import { buildInitialState, sheetReducer } from './sheetReducer';
import { formatCellAddress } from './addressing';
import { COL, FIRST_DATA_ROW, ROWS } from './constants';
import { fetchPrices } from '../../services/stockPrice';
import { loadSheet, saveSheet as saveSheetRequest } from '../../services/sheetStorage';
import type { PriceQuote } from '../../types/stock';

export function useSheet() {
  const [state, dispatch] = useReducer(sheetReducer, undefined, buildInitialState);

  // Restore whatever the user last saved, once, on mount. If nothing was
  // ever saved (or the request fails) the seeded demo data stays as-is.
  useEffect(() => {
    let cancelled = false;
    loadSheet()
      .then((saved) => {
        if (saved && !cancelled) {
          dispatch({
            type: 'HYDRATE_SHEET',
            cells: saved.cells,
            columnWidths: saved.columnWidths,
            rowHeights: saved.rowHeights,
            updatedAt: saved.updatedAt,
          });
        }
      })
      .catch(() => {
        // Nothing saved yet or the request failed — keep the seed data.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCellRaw = useCallback((address: string, raw: string) => {
    dispatch({ type: 'SET_CELL_RAW', address, raw });
  }, []);

  const selectCell = useCallback((address: string | null) => {
    dispatch({ type: 'SET_SELECTED', address });
  }, []);

  const startEdit = useCallback((address: string, seed?: string) => {
    dispatch({ type: 'START_EDIT', address, seed });
  }, []);

  const endEdit = useCallback(() => {
    dispatch({ type: 'END_EDIT' });
  }, []);

  const setColumnWidth = useCallback((col: number, width: number) => {
    dispatch({ type: 'SET_COLUMN_WIDTH', col, width });
  }, []);

  const setRowHeight = useCallback((row: number, height: number) => {
    dispatch({ type: 'SET_ROW_HEIGHT', row, height });
  }, []);

  const saveSheet = useCallback(async () => {
    dispatch({ type: 'SET_SAVE_STATE', state: 'saving' });
    try {
      const { updatedAt } = await saveSheetRequest({
        cells: state.cells,
        columnWidths: state.columnWidths,
        rowHeights: state.rowHeights,
      });
      dispatch({ type: 'SET_SAVE_STATE', state: 'idle', lastSavedAt: updatedAt });
    } catch (err) {
      dispatch({
        type: 'SET_SAVE_STATE',
        state: 'error',
        error: err instanceof Error ? err.message : 'Failed to save',
      });
    }
  }, [state.cells, state.columnWidths, state.rowHeights]);

  const refreshPrices = useCallback(async () => {
    const rowsWithSymbols: { row: number; symbol: string }[] = [];
    for (let row = FIRST_DATA_ROW; row < FIRST_DATA_ROW + (ROWS - 1); row++) {
      const symbol = state.cells[formatCellAddress(COL.SYMBOL, row)]?.raw.trim();
      if (symbol) rowsWithSymbols.push({ row, symbol });
    }
    if (rowsWithSymbols.length === 0) return;

    dispatch({ type: 'SET_REFRESH_STATE', state: 'refreshing' });
    rowsWithSymbols.forEach(({ row }) => dispatch({ type: 'SET_ROW_STATUS', rowIndex: row, status: 'loading' }));

    const results = await fetchPrices(rowsWithSymbols.map((r) => r.symbol));

    const updates: Record<number, PriceQuote> = {};
    let successCount = 0;
    rowsWithSymbols.forEach(({ row, symbol }) => {
      const result = results[symbol];
      if (result?.ok && result.data) {
        updates[row] = result.data;
        successCount += 1;
        dispatch({ type: 'SET_ROW_STATUS', rowIndex: row, status: 'success' });
      } else {
        dispatch({
          type: 'SET_ROW_STATUS',
          rowIndex: row,
          status: 'error',
          message: result?.error ?? 'Failed to fetch price',
        });
      }
    });

    if (Object.keys(updates).length > 0) {
      dispatch({ type: 'APPLY_PRICE_UPDATES', updates });
    }

    const failedCount = rowsWithSymbols.length - successCount;
    const summary =
      failedCount === 0
        ? `Updated ${successCount}/${rowsWithSymbols.length}`
        : `Updated ${successCount}/${rowsWithSymbols.length} — ${failedCount} failed`;

    dispatch({
      type: 'SET_REFRESH_STATE',
      state: 'idle',
      lastUpdated: new Date().toLocaleTimeString(),
      summary,
    });
  }, [state.cells]);

  return {
    cells: state.cells,
    selected: state.selected,
    editing: state.editing,
    editingSeed: state.editingSeed,
    rowStatuses: state.rowStatuses,
    refresh: state.refresh,
    columnWidths: state.columnWidths,
    rowHeights: state.rowHeights,
    save: state.save,
    setCellRaw,
    selectCell,
    startEdit,
    endEdit,
    refreshPrices,
    setColumnWidth,
    setRowHeight,
    saveSheet,
  };
}
