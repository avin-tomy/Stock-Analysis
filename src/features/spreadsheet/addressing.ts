/** Converts a 0-based column index to a spreadsheet-style letter: 0->A, 25->Z, 26->AA */
export function columnIndexToLetter(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/** Converts a column letter ("A", "AA") to a 0-based column index. */
export function letterToColumnIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result - 1;
}

export function formatCellAddress(colIndex: number, rowIndex: number): string {
  return `${columnIndexToLetter(colIndex)}${rowIndex}`;
}

const CELL_ADDRESS_RE = /^([A-Za-z]+)(\d+)$/;

export function isCellAddress(text: string): boolean {
  return CELL_ADDRESS_RE.test(text);
}

export function parseCellAddress(address: string): { col: number; row: number } | null {
  const match = CELL_ADDRESS_RE.exec(address.trim());
  if (!match) return null;
  return {
    col: letterToColumnIndex(match[1].toUpperCase()),
    row: parseInt(match[2], 10),
  };
}

/** Expands a range like "A1:A5" or "A1:C1" into a flat list of cell addresses. */
export function expandRange(startAddress: string, endAddress: string): string[] {
  const start = parseCellAddress(startAddress);
  const end = parseCellAddress(endAddress);
  if (!start || !end) return [];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const addresses: string[] = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      addresses.push(formatCellAddress(col, row));
    }
  }
  return addresses;
}
