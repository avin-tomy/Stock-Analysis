import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { CellData } from '../../types/spreadsheet';
import styles from './Cell.module.css';

export type NavigateDirection = 'up' | 'down' | 'left' | 'right';

interface CellProps {
  address: string;
  cellData: CellData;
  isSelected: boolean;
  isEditing: boolean;
  isHeaderRow: boolean;
  isNumericColumn: boolean;
  /** Row height in px, applied directly since percentage heights don't resolve reliably inside table cells. */
  rowHeight: number;
  /** Seed text for the editor when editing was started by typing over the cell, instead of the cell's existing value. */
  editingSeed: string | null;
  /** True while this cell is inside the range being previewed during a fill-handle drag. */
  isFillPreview: boolean;
  /** True while this cell is part of a multi-cell selection range (not the anchor itself, which uses isSelected). */
  isInRange: boolean;
  /** True for whichever cell should show the fill handle — the anchor for a single cell, or the range's bottom-right corner for a multi-cell selection. */
  isFillHandleAnchor: boolean;
  /** Text color from a matching conditional-formatting rule for this cell's column, or null if none matched (or the cell holds an error, which always wins). */
  matchedColor: string | null;
  /** Decimal places to display for a numeric column — display-only, doesn't affect the stored value or formulas. */
  decimals: number;
  onCellMouseDown: (e: MouseEvent, address: string) => void;
  onStartEdit: (address: string, seed?: string) => void;
  onCommit: (address: string, raw: string) => void;
  onCancelEdit: () => void;
  onNavigate: (direction: NavigateDirection, extend?: boolean) => void;
  onDeleteKey: (address: string) => void;
  onFillHandleMouseDown: (e: MouseEvent) => void;
}

export function Cell({
  address,
  cellData,
  isSelected,
  isEditing,
  isHeaderRow,
  isNumericColumn,
  rowHeight,
  editingSeed,
  isFillPreview,
  isInRange,
  isFillHandleAnchor,
  matchedColor,
  decimals,
  onCellMouseDown,
  onStartEdit,
  onCommit,
  onCancelEdit,
  onNavigate,
  onDeleteKey,
  onFillHandleMouseDown,
}: CellProps) {
  const cellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const needsCursorPlacementRef = useRef(false);
  const [draft, setDraft] = useState(cellData.raw);

  // Seed the editor's text when edit mode starts: either the value typed to
  // trigger it, or the cell's existing value (double-click / Enter).
  useEffect(() => {
    if (isEditing) {
      setDraft(editingSeed ?? cellData.raw);
      needsCursorPlacementRef.current = true;
    }
    // Only re-seed when an edit session starts, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useEffect(() => {
    if (isSelected && !isEditing) cellRef.current?.focus();
  }, [isSelected, isEditing]);

  // Runs once draft has actually been committed to the DOM (this effect
  // depends on `draft`, so it fires on the render after the seed above takes
  // effect) — placing the cursor here, rather than in the seeding effect,
  // avoids reading/measuring the input before its value has caught up.
  useEffect(() => {
    if (isEditing && needsCursorPlacementRef.current) {
      const input = inputRef.current;
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
      needsCursorPlacementRef.current = false;
    }
  }, [isEditing, draft]);

  const commitAndNavigate = (direction: NavigateDirection) => {
    onCommit(address, draft);
    onNavigate(direction);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitAndNavigate('down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitAndNavigate(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  const handleViewKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onNavigate('up', e.shiftKey);
        return;
      case 'ArrowDown':
        e.preventDefault();
        onNavigate('down', e.shiftKey);
        return;
      case 'ArrowLeft':
        e.preventDefault();
        onNavigate('left', e.shiftKey);
        return;
      case 'ArrowRight':
        e.preventDefault();
        onNavigate('right', e.shiftKey);
        return;
      case 'Tab':
        e.preventDefault();
        onNavigate(e.shiftKey ? 'left' : 'right');
        return;
      case 'Enter':
        e.preventDefault();
        onStartEdit(address);
        return;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        onDeleteKey(address);
        return;
    }

    // Typing directly into a selected cell (Excel/Sheets behavior) replaces
    // its content and opens the editor, rather than requiring double-click
    // or Enter first.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      onStartEdit(address, e.key);
    }
  };

  if (isEditing) {
    return (
      <div className={`${styles.cell} ${styles.selected}`} style={{ height: rowHeight }}>
        <input
          ref={inputRef}
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => onCommit(address, draft)}
        />
      </div>
    );
  }

  const classNames = [
    styles.cell,
    isSelected ? styles.selected : '',
    !isSelected && isInRange ? styles.inRange : '',
    isHeaderRow ? styles.headerRow : '',
    isNumericColumn ? styles.numeric : '',
    isFillPreview ? styles.fillPreview : '',
    cellData.error ? styles.errorValue : '',
  ]
    .filter(Boolean)
    .join(' ');

  // A formula error's red text always takes priority over a rule color.
  const cellStyle = matchedColor && !cellData.error ? { height: rowHeight, color: matchedColor } : { height: rowHeight };

  return (
    <div
      ref={cellRef}
      className={classNames}
      style={cellStyle}
      tabIndex={isSelected ? 0 : -1}
      data-address={address}
      onMouseDown={(e) => onCellMouseDown(e, address)}
      onDoubleClick={() => onStartEdit(address)}
      onKeyDown={handleViewKeyDown}
      title={cellData.error ? `${cellData.error} in ${address}` : undefined}
    >
      {cellData.error ?? formatDisplayValue(cellData.value, isNumericColumn, decimals)}
      {isFillHandleAnchor && <div className={styles.fillHandle} onMouseDown={onFillHandleMouseDown} />}
    </div>
  );
}

function formatDisplayValue(value: CellData['value'], isNumericColumn: boolean, decimals: number): string {
  if (value === null) return '';
  if (typeof value === 'number') {
    return isNumericColumn ? roundForDisplay(value, decimals) : String(value);
  }
  return value;
}

// value.toFixed(decimals) truncates instead of rounding for values that land
// exactly on a rounding boundary in binary floating point — e.g.
// (1.005).toFixed(2) is "1.00", not "1.01" — because 1.005 is actually stored
// as slightly less than 1.005. Shifting the decimal point via string
// exponent notation (rather than multiplying, which reintroduces the same
// float error) avoids that and rounds as expected.
function roundForDisplay(value: number, decimals: number): string {
  const shifted = Number(`${value}e${decimals}`);
  const rounded = Math.round(shifted);
  return Number(`${rounded}e-${decimals}`).toFixed(decimals);
}
