import { useState } from 'react';
import { useSheet } from './useSheet';
import { Toolbar } from './Toolbar';
import { FormulaBar } from './FormulaBar';
import { Grid } from './Grid';
import { ConditionalFormattingDialog } from './ConditionalFormattingDialog';
import { columnIndexToLetter, parseCellAddress } from './addressing';
import { DEFAULT_DECIMALS } from './constants';
import styles from './Spreadsheet.module.css';

export function Spreadsheet() {
  const {
    cells,
    selected,
    rangeEnd,
    editing,
    editingSeed,
    rowStatuses,
    refresh,
    columnWidths,
    rowHeights,
    save,
    conditionalFormatting,
    columnDecimals,
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
  } = useSheet();

  const [isFormatDialogOpen, setIsFormatDialogOpen] = useState(false);

  const handleCommit = (address: string, raw: string) => {
    setCellRaw(address, raw);
    endEdit();
  };

  const selectedCol = selected ? parseCellAddress(selected)?.col ?? null : null;

  return (
    <div className={styles.spreadsheet}>
      <Toolbar
        refresh={refresh}
        save={save}
        onRefresh={refreshPrices}
        onSave={saveSheet}
        onOpenFormat={() => setIsFormatDialogOpen(true)}
      />
      <FormulaBar
        selected={selected}
        cellData={selected ? cells[selected] : undefined}
        isCellEditing={editing !== null && editing === selected}
        onCommit={handleCommit}
      />
      <div className={styles.gridArea}>
        <Grid
          cells={cells}
          selected={selected}
          rangeEnd={rangeEnd}
          editing={editing}
          editingSeed={editingSeed}
          rowStatuses={rowStatuses}
          columnWidths={columnWidths}
          rowHeights={rowHeights}
          conditionalFormatting={conditionalFormatting}
          columnDecimals={columnDecimals}
          onSelect={selectCell}
          onSelectRange={selectRange}
          onClearRange={clearRange}
          onStartEdit={startEdit}
          onCommit={handleCommit}
          onCancelEdit={endEdit}
          onColumnResize={setColumnWidth}
          onRowResize={setRowHeight}
          onFillDown={fillDown}
        />
      </div>
      {isFormatDialogOpen && selected !== null && selectedCol !== null && (
        <ConditionalFormattingDialog
          cellAddress={selected}
          columnLabel={columnIndexToLetter(selectedCol)}
          rules={conditionalFormatting[selected] ?? []}
          decimals={columnDecimals[selectedCol] ?? DEFAULT_DECIMALS}
          onSave={(rules, decimals) => {
            setCellRules(selected, rules);
            setColumnDecimals(selectedCol, decimals);
          }}
          onClose={() => setIsFormatDialogOpen(false)}
        />
      )}
    </div>
  );
}
