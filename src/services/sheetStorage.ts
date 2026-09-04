import type { CellsMap, ConditionalFormatting } from '../types/spreadsheet';

export interface SavedSheet {
  cells: CellsMap;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  conditionalFormatting?: ConditionalFormatting;
  columnDecimals?: Record<number, number>;
  updatedAt: string;
}

export interface SheetPayload {
  cells: CellsMap;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  conditionalFormatting: ConditionalFormatting;
  columnDecimals: Record<number, number>;
}

export async function loadSheet(): Promise<SavedSheet | null> {
  const res = await fetch('/api/sheet', { credentials: 'include' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load saved sheet (${res.status})`);
  return (await res.json()) as SavedSheet;
}

export async function saveSheet(payload: SheetPayload): Promise<{ updatedAt: string }> {
  const res = await fetch('/api/sheet', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to save sheet (${res.status})`);
  }
  return (await res.json()) as { updatedAt: string };
}
