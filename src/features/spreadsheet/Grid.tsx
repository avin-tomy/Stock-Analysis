import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { CellsMap, ConditionalFormatting, RowStatusInfo } from '../../types/spreadsheet';
import {
  columnIndexToLetter,
  formatCellAddress,
  getRangeBounds,
  isWithinBounds,
  parseCellAddress,
} from './addressing';
import { getMatchedColor } from './conditionalFormatting';
import {
  COLS,
  DEFAULT_COL_WIDTH,
  DEFAULT_DECIMALS,
  DEFAULT_ROW_HEIGHT,
  HEADER_ROW,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  NUMERIC_COLS,
  ROW_HEADER_WIDTH,
  ROWS,
} from './constants';
import { Cell, type NavigateDirection } from './Cell';
import styles from './Grid.module.css';

interface GridProps {
  cells: CellsMap;
  selected: string | null;
  /** Far corner of a multi-cell selection, opposite `selected`. Null (or equal to `selected`) means a plain single-cell selection. */
  rangeEnd: string | null;
  editing: string | null;
  editingSeed: string | null;
  rowStatuses: Record<number, RowStatusInfo>;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  conditionalFormatting: ConditionalFormatting;
  columnDecimals: Record<number, number>;
  onSelect: (address: string) => void;
  onSelectRange: (anchor: string, end: string) => void;
  onClearRange: (anchor: string, end: string) => void;
  onStartEdit: (address: string, seed?: string) => void;
  onCommit: (address: string, raw: string) => void;
  onCancelEdit: () => void;
  onColumnResize: (col: number, width: number) => void;
  onRowResize: (row: number, height: number) => void;
  onFillDown: (fromCol: number, toCol: number, sourceRow: number, toRow: number) => void;
}

const EMPTY_CELL = { raw: '', value: null };

export function Grid({
  cells,
  selected,
  rangeEnd,
  editing,
  editingSeed,
  rowStatuses,
  columnWidths,
  rowHeights,
  conditionalFormatting,
  columnDecimals,
  onSelect,
  onSelectRange,
  onClearRange,
  onStartEdit,
  onCommit,
  onCancelEdit,
  onColumnResize,
  onRowResize,
  onFillDown,
}: GridProps) {
  const columnLetters = Array.from({ length: COLS }, (_, i) => columnIndexToLetter(i));
  const rowNumbers = Array.from({ length: ROWS }, (_, i) => i + 1);
  const colRefs = useRef(new Map<number, HTMLTableColElement>());
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>());
  const tableRef = useRef<HTMLTableElement>(null);
  const [fillDrag, setFillDrag] = useState<{
    fromCol: number;
    toCol: number;
    sourceRow: number;
    targetRow: number;
  } | null>(null);

  // The full selected area as a rectangle — collapses to exactly the single
  // `selected` cell when there's no range, so every "is this the corner /
  // is this in range" check below behaves identically to the old
  // single-cell-only logic in that case.
  const selectionBounds = selected ? getRangeBounds(selected, rangeEnd ?? selected) : null;
  const hasRealRange = rangeEnd !== null && rangeEnd !== selected;

  // table-layout: fixed only honors the colgroup widths if the table itself
  // has an explicit total width — left at "auto" it resolves to the
  // scroll container's width and squeezes every column to fit, ignoring the
  // widths we set. Giving it the exact sum lets columns overflow into the
  // wrapper's horizontal scroll instead.
  const totalWidth =
    ROW_HEADER_WIDTH + columnLetters.reduce((sum, _, col) => sum + (columnWidths[col] ?? DEFAULT_COL_WIDTH), 0);

  const handleNavigate = (direction: NavigateDirection, extend = false) => {
    if (!selected) return;
    // Plain navigation always moves from (and collapses back to) the anchor
    // cell itself — unchanged from before ranges existed. Shift+navigate
    // instead grows/shrinks the range by moving its far corner, keeping the
    // anchor fixed, so the currently-focused cell never changes mid-extend.
    const basisAddress = extend && rangeEnd ? rangeEnd : selected;
    const parsed = parseCellAddress(basisAddress);
    if (!parsed) return;
    let { col, row } = parsed;
    if (direction === 'up') row = Math.max(HEADER_ROW, row - 1);
    if (direction === 'down') row = Math.min(ROWS, row + 1);
    if (direction === 'left') col = Math.max(0, col - 1);
    if (direction === 'right') col = Math.min(COLS - 1, col + 1);
    const target = formatCellAddress(col, row);
    if (extend) {
      onSelectRange(selected, target);
    } else {
      onSelect(target);
    }
  };

  const handleCellMouseDown = (e: ReactMouseEvent, address: string) => {
    if (e.shiftKey && selected) {
      onSelectRange(selected, address);
      return;
    }

    onSelect(address);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const hoveredAddress = el?.closest('[data-address]')?.getAttribute('data-address');
      if (hoveredAddress) onSelectRange(address, hoveredAddress);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDeleteKey = (address: string) => {
    if (hasRealRange && selected && rangeEnd) {
      onClearRange(selected, rangeEnd);
    } else {
      onCommit(address, '');
    }
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

  const handleFillHandleMouseDown = (e: ReactMouseEvent, fromCol: number, toCol: number, sourceRow: number) => {
    e.preventDefault();
    e.stopPropagation();
    // A plain mutable object tracked in this closure, not React state — it's
    // updated synchronously from native DOM events during the drag so
    // mouseup can read the final target row directly, without needing a
    // setState functional-updater (calling onFillDown from inside one, as a
    // side effect of computing state, is what previously triggered React's
    // "update a component while rendering a different component" warning).
    const dragState = { fromCol, toCol, sourceRow, targetRow: sourceRow };
    setFillDrag({ ...dragState });

    const onMouseMove = (moveEvent: MouseEvent) => {
      const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const rowEl = el?.closest('tr[data-row]');
      const row = rowEl ? Number(rowEl.getAttribute('data-row')) : null;
      if (row !== null && row >= sourceRow) {
        dragState.targetRow = Math.min(row, ROWS);
        setFillDrag({ ...dragState });
      }
    };
    const onMouseUp = () => {
      setFillDrag(null);
      if (dragState.targetRow > dragState.sourceRow) {
        onFillDown(dragState.fromCol, dragState.toCol, dragState.sourceRow, dragState.targetRow);
      }
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
                data-row={row}
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
                  const isFillPreview =
                    fillDrag !== null &&
                    col >= fillDrag.fromCol &&
                    col <= fillDrag.toCol &&
                    row > fillDrag.sourceRow &&
                    row <= fillDrag.targetRow;
                  const isInRange =
                    hasRealRange && selectionBounds !== null && isWithinBounds(col, row, selectionBounds);
                  const isFillHandleAnchor =
                    selectionBounds !== null && col === selectionBounds.maxCol && row === selectionBounds.maxRow;
                  const matchedColor =
                    row !== HEADER_ROW && typeof cellData.value === 'number'
                      ? getMatchedColor(cellData.value, conditionalFormatting[col] ?? [])
                      : null;
                  const decimals = columnDecimals[col] ?? DEFAULT_DECIMALS;
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
                        rowHeight={rowHeight}
                        isFillPreview={isFillPreview}
                        isInRange={isInRange}
                        isFillHandleAnchor={isFillHandleAnchor}
                        matchedColor={matchedColor}
                        decimals={decimals}
                        onCellMouseDown={handleCellMouseDown}
                        onStartEdit={onStartEdit}
                        onCommit={onCommit}
                        onCancelEdit={onCancelEdit}
                        onNavigate={handleNavigate}
                        onDeleteKey={handleDeleteKey}
                        onFillHandleMouseDown={(e) =>
                          handleFillHandleMouseDown(
                            e,
                            selectionBounds?.minCol ?? col,
                            selectionBounds?.maxCol ?? col,
                            selectionBounds?.maxRow ?? row
                          )
                        }
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
