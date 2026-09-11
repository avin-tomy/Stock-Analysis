import { useCallback, useEffect, useReducer, useRef } from 'react';
import { buildInitialState, sheetReducer } from './sheetReducer';
import { formatCellAddress } from './addressing';
import { AUTOSAVE_INTERVAL_MS, COL, FIRST_DATA_ROW, ROWS } from './constants';
import { fetchPrices } from '../../services/stockPrice';
import { loadSheet, saveSheet as saveSheetRequest } from '../../services/sheetStorage';
import type { PriceQuote } from '../../types/stock';
import type { ConditionalRule } from '../../types/spreadsheet';

function snapshotOf(
  cells: unknown,
  columnWidths: unknown,
  rowHeights: unknown,
  conditionalFormatting: unknown,
  columnDecimals: unknown
): string {
  return JSON.stringify({ cells, columnWidths, rowHeights, conditionalFormatting, columnDecimals });
}

export function useSheet() {
  const [state, dispatch] = useReducer(sheetReducer, undefined, buildInitialState);

  // Always-current state for the save logic below, so `performSave` and the
  // autosave interval can read the latest cells without needing to be
  // recreated (and the interval reset) on every keystroke.
  const stateRef = useRef(state);
  stateRef.current = state;

  // What was actually last persisted — used to skip redundant autosaves
  // when nothing has changed. Starts as the seed data; updated again once
  // a previously-saved sheet is hydrated in, and after every save.
  const lastSavedSnapshotRef = useRef(
    snapshotOf(
      state.cells,
      state.columnWidths,
      state.rowHeights,
      state.conditionalFormatting,
      state.columnDecimals
    )
  );

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
            conditionalFormatting: saved.conditionalFormatting ?? {},
            columnDecimals: saved.columnDecimals ?? {},
            updatedAt: saved.updatedAt,
          });
          lastSavedSnapshotRef.current = snapshotOf(
            saved.cells,
            saved.columnWidths,
            saved.rowHeights,
            saved.conditionalFormatting ?? {},
            saved.columnDecimals ?? {}
          );
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

  const selectRange = useCallback((anchor: string, end: string) => {
    dispatch({ type: 'SET_SELECTION_RANGE', anchor, end });
  }, []);

  const clearRange = useCallback((anchor: string, end: string) => {
    dispatch({ type: 'CLEAR_RANGE', anchor, end });
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

  const fillDown = useCallback((fromCol: number, toCol: number, sourceRow: number, toRow: number) => {
    dispatch({ type: 'FILL_DOWN', fromCol, toCol, sourceRow, toRow });
  }, []);

  const setCellRules = useCallback((address: string, rules: ConditionalRule[]) => {
    dispatch({ type: 'SET_CELL_RULES', address, rules });
  }, []);

  const setColumnDecimals = useCallback((col: number, decimals: number) => {
    dispatch({ type: 'SET_COLUMN_DECIMALS', col, decimals });
  }, []);

  // Stable across renders (reads via stateRef instead of closing over
  // `state`) so the autosave interval below never needs to be torn down
  // and recreated — it keeps a fixed 30s cadence for the life of the sheet.
  const performSave = useCallback(async () => {
    const { cells, columnWidths, rowHeights, conditionalFormatting, columnDecimals } = stateRef.current;
    dispatch({ type: 'SET_SAVE_STATE', state: 'saving' });
    try {
      const { updatedAt } = await saveSheetRequest({
        cells,
        columnWidths,
        rowHeights,
        conditionalFormatting,
        columnDecimals,
      });
      lastSavedSnapshotRef.current = snapshotOf(
        cells,
        columnWidths,
        rowHeights,
        conditionalFormatting,
        columnDecimals
      );
      dispatch({ type: 'SET_SAVE_STATE', state: 'idle', lastSavedAt: updatedAt });
    } catch (err) {
      dispatch({
        type: 'SET_SAVE_STATE',
        state: 'error',
        error: err instanceof Error ? err.message : 'Failed to save',
      });
    }
  }, []);

  const saveSheet = performSave;

  // Autosave heartbeat: every 30s, save only if something actually changed
  // since the last successful save (manual or automatic) — avoids spamming
  // the server with identical writes while the user is just looking at the
  // sheet.
  useEffect(() => {
    const id = setInterval(() => {
      const { cells, columnWidths, rowHeights, conditionalFormatting, columnDecimals } = stateRef.current;
      if (
        snapshotOf(cells, columnWidths, rowHeights, conditionalFormatting, columnDecimals) !==
        lastSavedSnapshotRef.current
      ) {
        performSave();
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [performSave]);

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
    rangeEnd: state.rangeEnd,
    editing: state.editing,
    editingSeed: state.editingSeed,
    rowStatuses: state.rowStatuses,
    refresh: state.refresh,
    columnWidths: state.columnWidths,
    rowHeights: state.rowHeights,
    save: state.save,
    conditionalFormatting: state.conditionalFormatting,
    columnDecimals: state.columnDecimals,
    setCellRaw,
    selectCell,
    selectRange,
    clearRange,
    startEdit,
    endEdit,
    refreshPrices,
    setColumnWidth,
    setRowHeight,
    saveSheet,
    fillDown,
    setCellRules,
    setColumnDecimals,
  };
}
