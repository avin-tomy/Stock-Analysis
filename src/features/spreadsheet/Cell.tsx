import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
  isSignedColumn: boolean;
  /** Row height in px, applied directly since percentage heights don't resolve reliably inside table cells. */
  rowHeight: number;
  /** Seed text for the editor when editing was started by typing over the cell, instead of the cell's existing value. */
  editingSeed: string | null;
  onSelect: (address: string) => void;
  onStartEdit: (address: string, seed?: string) => void;
  onCommit: (address: string, raw: string) => void;
  onCancelEdit: () => void;
  onNavigate: (direction: NavigateDirection) => void;
}

export function Cell({
  address,
  cellData,
  isSelected,
  isEditing,
  isHeaderRow,
  isNumericColumn,
  isSignedColumn,
  rowHeight,
  editingSeed,
  onSelect,
  onStartEdit,
  onCommit,
  onCancelEdit,
  onNavigate,
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
        onNavigate('up');
        return;
      case 'ArrowDown':
        e.preventDefault();
        onNavigate('down');
        return;
      case 'ArrowLeft':
        e.preventDefault();
        onNavigate('left');
        return;
      case 'ArrowRight':
        e.preventDefault();
        onNavigate('right');
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
        onCommit(address, '');
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

  const isNegative = isSignedColumn && typeof cellData.value === 'number' && cellData.value < 0;
  const isPositive = isSignedColumn && typeof cellData.value === 'number' && cellData.value > 0;

  const classNames = [
    styles.cell,
    isSelected ? styles.selected : '',
    isHeaderRow ? styles.headerRow : '',
    isNumericColumn ? styles.numeric : '',
    cellData.error ? styles.errorValue : isNegative ? styles.negative : isPositive ? styles.positive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={cellRef}
      className={classNames}
      style={{ height: rowHeight }}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onSelect(address)}
      onDoubleClick={() => onStartEdit(address)}
      onKeyDown={handleViewKeyDown}
      title={cellData.error ? `${cellData.error} in ${address}` : undefined}
    >
      {cellData.error ?? formatDisplayValue(cellData.value, isNumericColumn)}
    </div>
  );
}

function formatDisplayValue(value: CellData['value'], isNumericColumn: boolean): string {
  if (value === null) return '';
  if (typeof value === 'number') {
    return isNumericColumn ? value.toFixed(2) : String(value);
  }
  return value;
}
