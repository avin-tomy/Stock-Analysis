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

export type RuleOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq';

export interface ConditionalRule {
  id: string;
  operator: RuleOperator;
  value: number;
  color: string;
}

/** Conditional text-color rules, keyed by cell address (e.g. "C5") — set individually per cell. */
export type ConditionalFormatting = Record<string, ConditionalRule[]>;

export interface SheetState {
  cells: CellsMap;
  /** The active/anchor cell — where the formula bar points and where typing starts an edit. Unchanged in meaning whether or not a multi-cell range is also selected. */
  selected: string | null;
  /** The far corner of a multi-cell selection, opposite `selected`. Null (or equal to `selected`) means a plain single-cell selection — every existing single-cell behavior is keyed off `selected` alone and doesn't look at this. */
  rangeEnd: string | null;
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
  /** Conditional text-color rules, keyed by cell address — set individually per cell. */
  conditionalFormatting: ConditionalFormatting;
  /** Display-only decimal places, keyed by 0-based column index; unset numeric columns default to 2. Doesn't affect the underlying value or formulas. */
  columnDecimals: Record<number, number>;
}
