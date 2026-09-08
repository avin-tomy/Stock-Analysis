import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { CellData } from '../../types/spreadsheet';
import styles from './FormulaBar.module.css';

interface FormulaBarProps {
  selected: string | null;
  cellData: CellData | undefined;
  /** True while the selected cell is being edited in-place in the grid, so this bar doesn't fight over the same value. */
  isCellEditing: boolean;
  onCommit: (address: string, raw: string) => void;
}

export function FormulaBar({ selected, cellData, isCellEditing, onCommit }: FormulaBarProps) {
  const [draft, setDraft] = useState(cellData?.raw ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // The cell being edited through this bar, snapshotted when the input
  // gains focus. Clicking a different grid cell updates the `selected` prop
  // (and re-renders this bar with the new cell's `cellData`) before this
  // input's blur event actually fires, so reading `selected`/`cellData` at
  // blur time — as this used to — commits the pending edit into the newly
  // clicked cell instead of the one it was written for. Re-deriving the
  // snapshot from `selected` on every render (e.g. in the effect below)
  // doesn't help either, since that same effect re-runs — and overwrites
  // the snapshot — the moment `selected` changes, which is exactly what
  // happens just before blur fires.
  const editingCellRef = useRef({ address: selected, raw: cellData?.raw ?? '' });

  // Escape's revert (`setDraft`) doesn't apply until the next render, but
  // blur() fires synchronously right after it — so handleBlur would still
  // see the pre-revert `draft` from this render's closure and commit the
  // discarded text anyway. This flag tells the blur handler that key runs
  // was just a cancel, not an edit to save.
  const skipNextBlurCommitRef = useRef(false);

  useEffect(() => {
    setDraft(cellData?.raw ?? '');
  }, [selected, cellData?.raw]);

  const handleFocus = () => {
    editingCellRef.current = { address: selected, raw: cellData?.raw ?? '' };
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { address } = editingCellRef.current;
    if (!address) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(address, draft);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      skipNextBlurCommitRef.current = true;
      setDraft(editingCellRef.current.raw);
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    if (skipNextBlurCommitRef.current) {
      skipNextBlurCommitRef.current = false;
      return;
    }
    const { address, raw } = editingCellRef.current;
    if (address && draft !== raw) {
      onCommit(address, draft);
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.nameBox}>{selected ?? ''}</div>
      <div className={styles.fx}>fx</div>
      <input
        ref={inputRef}
        className={styles.input}
        value={isCellEditing ? (cellData?.raw ?? '') : draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={selected ? '' : 'Select a cell'}
        disabled={!selected || isCellEditing}
      />
    </div>
  );
}
