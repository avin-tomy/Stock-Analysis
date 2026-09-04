import { useRef, type MouseEvent as ReactMouseEvent } from 'react';
import type { CellsMap, RowStatusInfo } from '../../types/spreadsheet';
import { columnIndexToLetter, formatCellAddress, parseCellAddress } from './addressing';
import {
  COLS,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  HEADER_ROW,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  NUMERIC_COLS,
  ROW_HEADER_WIDTH,
  ROWS,
  SIGNED_COLS,
} from './constants';
import { Cell, type NavigateDirection } from './Cell';
import styles from './Grid.module.css';

interface GridProps {
  cells: CellsMap;
  selected: string | null;
  editing: string | null;
  editingSeed: string | null;
  rowStatuses: Record<number, RowStatusInfo>;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  onSelect: (address: string) => void;
  onStartEdit: (address: string, seed?: string) => void;
  onCommit: (address: string, raw: string) => void;
  onCancelEdit: () => void;
  onColumnResize: (col: number, width: number) => void;
  onRowResize: (row: number, height: number) => void;
}

const EMPTY_CELL = { raw: '', value: null };

export function Grid({
  cells,
  selected,
  editing,
  editingSeed,
  rowStatuses,
  columnWidths,
  rowHeights,
  onSelect,
  onStartEdit,
  onCommit,
  onCancelEdit,
  onColumnResize,
  onRowResize,
}: GridProps) {
  const columnLetters = Array.from({ length: COLS }, (_, i) => columnIndexToLetter(i));
  const rowNumbers = Array.from({ length: ROWS }, (_, i) => i + 1);
  const colRefs = useRef(new Map<number, HTMLTableColElement>());
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>());
  const tableRef = useRef<HTMLTableElement>(null);

  // table-layout: fixed only honors the colgroup widths if the table itself
  // has an explicit total width — left at "auto" it resolves to the
  // scroll container's width and squeezes every column to fit, ignoring the
  // widths we set. Giving it the exact sum lets columns overflow into the
  // wrapper's horizontal scroll instead.
  const totalWidth =
    ROW_HEADER_WIDTH + columnLetters.reduce((sum, _, col) => sum + (columnWidths[col] ?? DEFAULT_COL_WIDTH), 0);

  const handleNavigate = (direction: NavigateDirection) => {
    if (!selected) return;
    const parsed = parseCellAddress(selected);
    if (!parsed) return;
    let { col, row } = parsed;
    if (direction === 'up') row = Math.max(HEADER_ROW, row - 1);
    if (direction === 'down') row = Math.min(ROWS, row + 1);
    if (direction === 'left') col = Math.max(0, col - 1);
    if (direction === 'right') col = Math.min(COLS - 1, col + 1);
    onSelect(formatCellAddress(col, row));
  };

  const handleColumnResizeStart = (e: ReactMouseEvent, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[col] ?? DEFAULT_COL_WIDTH;
    const colEl = colRefs.current.get(col);

    const startTotalWidth = totalWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const width = Math.max(MIN_COL_WIDTH, startWidth + (moveEvent.clientX - startX));
      if (colEl) colEl.style.width = `${width}px`;
      if (tableRef.current) tableRef.current.style.width = `${startTotalWidth - startWidth + width}px`;
    };
    const onMouseUp = (upEvent: MouseEvent) => {
      const width = Math.max(MIN_COL_WIDTH, startWidth + (upEvent.clientX - startX));
      onColumnResize(col, width);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleRowResizeStart = (e: ReactMouseEvent, row: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = rowHeights[row] ?? DEFAULT_ROW_HEIGHT;
    const rowEl = rowRefs.current.get(row);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const height = Math.max(MIN_ROW_HEIGHT, startHeight + (moveEvent.clientY - startY));
      if (rowEl) {
        rowEl.style.height = `${height}px`;
        // Cells size themselves from an explicit px prop (not a CSS
        // percentage, which table cells don't resolve reliably), so keep
        // them in sync with the row while dragging, not just on commit.
        rowEl.querySelectorAll<HTMLElement>(':scope > td > div').forEach((cellEl) => {
          cellEl.style.height = `${height}px`;
        });
      }
    };
    const onMouseUp = (upEvent: MouseEvent) => {
      const height = Math.max(MIN_ROW_HEIGHT, startHeight + (upEvent.clientY - startY));
      onRowResize(row, height);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={styles.gridWrapper}>
      <table ref={tableRef} className={styles.grid} style={{ width: totalWidth }}>
        <colgroup>
          <col style={{ width: ROW_HEADER_WIDTH }} />
          {columnLetters.map((_, col) => (
            <col
              key={col}
              ref={(el) => {
                if (el) colRefs.current.set(col, el);
              }}
              style={{ width: columnWidths[col] ?? DEFAULT_COL_WIDTH }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className={styles.cornerCell} />
            {columnLetters.map((letter, col) => (
              <th key={letter} className={styles.colHeaderCell}>
                {letter}
                <div
                  className={styles.colResizeHandle}
                  onMouseDown={(e) => handleColumnResizeStart(e, col)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowNumbers.map((row) => {
            const rowStatus = rowStatuses[row];
            const rowHeight = rowHeights[row] ?? DEFAULT_ROW_HEIGHT;
            return (
              <tr
                key={row}
                ref={(el) => {
                  if (el) rowRefs.current.set(row, el);
                }}
                style={{ height: rowHeight }}
              >
                <th className={styles.rowHeaderCell}>
                  {row}
                  {rowStatus && <RowStatusIcon info={rowStatus} />}
                  <div
                    className={styles.rowResizeHandle}
                    onMouseDown={(e) => handleRowResizeStart(e, row)}
                  />
                </th>
                {columnLetters.map((_, col) => {
                  const address = formatCellAddress(col, row);
                  const cellData = cells[address] ?? EMPTY_CELL;
                  return (
                    <td key={address} className={styles.dataCell}>
                      <Cell
                        address={address}
                        cellData={cellData}
                        isSelected={selected === address}
                        isEditing={editing === address}
                        editingSeed={editing === address ? editingSeed : null}
                        isHeaderRow={row === HEADER_ROW}
                        isNumericColumn={row !== HEADER_ROW && NUMERIC_COLS.has(col)}
                        isSignedColumn={row !== HEADER_ROW && SIGNED_COLS.has(col)}
                        rowHeight={rowHeight}
                        onSelect={onSelect}
                        onStartEdit={onStartEdit}
                        onCommit={onCommit}
                        onCancelEdit={onCancelEdit}
                        onNavigate={handleNavigate}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowStatusIcon({ info }: { info: RowStatusInfo }) {
  if (info.status === 'loading') {
    return <span className={`${styles.rowStatusIcon} ${styles.statusLoading}`}>●</span>;
  }
  if (info.status === 'success') {
    return <span className={`${styles.rowStatusIcon} ${styles.statusSuccess}`}>✓</span>;
  }
  if (info.status === 'error') {
    return (
      <span className={`${styles.rowStatusIcon} ${styles.statusError}`} title={info.message}>
        !
      </span>
    );
  }
  return null;
}
