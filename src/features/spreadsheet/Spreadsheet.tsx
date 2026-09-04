import { useSheet } from './useSheet';
import { Toolbar } from './Toolbar';
import { FormulaBar } from './FormulaBar';
import { Grid } from './Grid';
import styles from './Spreadsheet.module.css';

export function Spreadsheet() {
  const {
    cells,
    selected,
    editing,
    editingSeed,
    rowStatuses,
    refresh,
    columnWidths,
    rowHeights,
    save,
    setCellRaw,
    selectCell,
    startEdit,
    endEdit,
    refreshPrices,
    setColumnWidth,
    setRowHeight,
    saveSheet,
  } = useSheet();

  const handleCommit = (address: string, raw: string) => {
    setCellRaw(address, raw);
    endEdit();
  };

  return (
    <div className={styles.spreadsheet}>
      <Toolbar refresh={refresh} save={save} onRefresh={refreshPrices} onSave={saveSheet} />
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
          editing={editing}
          editingSeed={editingSeed}
          rowStatuses={rowStatuses}
          columnWidths={columnWidths}
          rowHeights={rowHeights}
          onSelect={selectCell}
          onStartEdit={startEdit}
          onCommit={handleCommit}
          onCancelEdit={endEdit}
          onColumnResize={setColumnWidth}
          onRowResize={setRowHeight}
        />
      </div>
    </div>
  );
}
