export interface CellData {
  /** Exactly what the user typed, e.g. "=F2*G2" or "2500" or "RELIANCE" */
  raw: string;
  /** Computed/display value */
  value: number | string | null;
  /** Error token, e.g. "#CIRCULAR!", "#REF!", "#ERROR!" */
  error?: string;
}

export type CellsMap = Record<string, CellData>;

export type RowStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RowStatusInfo {
  status: RowStatus;
  message?: string;
}

export interface RefreshInfo {
  state: 'idle' | 'refreshing';
  lastUpdated: string | null;
  summary?: string;
}

export interface SaveInfo {
  state: 'idle' | 'saving' | 'error';
  lastSavedAt: string | null;
  error?: string;
}

export interface SheetState {
  cells: CellsMap;
  selected: string | null;
  editing: string | null;
  /** Initial text to seed the editor with when editing starts by typing directly over a cell, instead of the cell's existing raw value. */
  editingSeed: string | null;
  rowStatuses: Record<number, RowStatusInfo>;
  refresh: RefreshInfo;
  /** Custom column widths (px) keyed by 0-based column index; unset columns use the default width. */
  columnWidths: Record<number, number>;
  /** Custom row heights (px) keyed by 1-based row number; unset rows use the default height. */
  rowHeights: Record<number, number>;
  save: SaveInfo;
}
