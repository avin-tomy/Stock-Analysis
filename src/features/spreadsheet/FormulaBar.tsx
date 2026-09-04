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

  useEffect(() => {
    setDraft(cellData?.raw ?? '');
  }, [selected, cellData?.raw]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!selected) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(selected, draft);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(cellData?.raw ?? '');
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    if (selected && draft !== (cellData?.raw ?? '')) {
      onCommit(selected, draft);
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
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={selected ? '' : 'Select a cell'}
        disabled={!selected || isCellEditing}
      />
    </div>
  );
}
