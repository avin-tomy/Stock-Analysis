import type { CellsMap } from '../../../types/spreadsheet';
import { formatCellAddress, parseCellAddress } from '../addressing';
import { parseFormula } from './parser';
import { evaluateAst } from './evaluator';
import { tokenize } from './tokenizer';
import { FormulaEvalError, FORMULA_ERRORS } from './errors';

export { parseFormula } from './parser';
export { FORMULA_ERRORS } from './errors';

export function isFormula(raw: string): boolean {
  return raw.trim().startsWith('=');
}

/**
 * Re-addresses every cell reference in a formula by (rowDelta, colDelta) —
 * the same "relative reference" adjustment Excel does when you drag a
 * formula's fill handle to another cell. Every reference shifts equally;
 * there's no $A$1-style absolute reference syntax to hold anything fixed.
 * Non-cellref tokens (numbers, operators, function names, punctuation) are
 * reprinted as-is, so the formula is rebuilt token-by-token rather than
 * re-parsed into an AST.
 */
export function shiftFormula(raw: string, rowDelta: number, colDelta: number): string {
  if (!isFormula(raw)) return raw;

  const tokens = tokenize(raw.slice(1));
  const parts: string[] = [];
  for (const token of tokens) {
    if (token.type === 'EOF') break;
    if (token.type === 'CELLREF') {
      const parsed = parseCellAddress(token.value);
      if (parsed) {
        parts.push(formatCellAddress(parsed.col + colDelta, parsed.row + rowDelta));
        continue;
      }
    }
    parts.push(token.value);
  }
  return '=' + parts.join('');
}

/**
 * Re-evaluates every formula cell in the sheet. Non-formula cells are
 * normalized (numeric text becomes a number, everything else stays text).
 * Formula cells are resolved lazily/recursively so evaluation order doesn't
 * matter; a `visiting` set threaded through the recursion catches circular
 * references instead of recursing forever.
 */
export function recalcAll(cells: CellsMap): CellsMap {
  const result: CellsMap = {};
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  function getCellNumericValue(address: string): number {
    if (visiting.has(address)) {
      throw new FormulaEvalError(FORMULA_ERRORS.CIRCULAR, 'Circular reference');
    }
    if (memo.has(address)) {
      return memo.get(address)!;
    }
    if (!parseCellAddress(address)) {
      throw new FormulaEvalError(FORMULA_ERRORS.REF, `Invalid reference "${address}"`);
    }

    const source = cells[address];
    if (!source || source.raw.trim() === '') {
      memo.set(address, 0);
      return 0;
    }

    if (isFormula(source.raw)) {
      visiting.add(address);
      try {
        const ast = parseFormula(source.raw.slice(1));
        const value = evaluateAst(ast, { getCellNumericValue });
        memo.set(address, value);
        return value;
      } finally {
        visiting.delete(address);
      }
    }

    const numeric = parseFloat(source.raw);
    if (Number.isNaN(numeric)) {
      throw new FormulaEvalError(
        FORMULA_ERRORS.REF,
        `Cell ${address} does not contain a number`
      );
    }
    memo.set(address, numeric);
    return numeric;
  }

  for (const [address, cell] of Object.entries(cells)) {
    if (isFormula(cell.raw)) {
      try {
        const value = getCellNumericValue(address);
        result[address] = { raw: cell.raw, value };
      } catch (err) {
        const code = err instanceof FormulaEvalError ? err.code : FORMULA_ERRORS.ERROR;
        result[address] = { raw: cell.raw, value: null, error: code };
      }
    } else {
      const trimmed = cell.raw.trim();
      if (trimmed === '') {
        result[address] = { raw: cell.raw, value: null };
      } else {
        const numeric = parseFloat(trimmed);
        const isNumeric = trimmed !== '' && !Number.isNaN(numeric) && /^-?\d+(\.\d+)?$/.test(trimmed);
        result[address] = { raw: cell.raw, value: isNumeric ? numeric : cell.raw };
      }
    }
  }

  return result;
}
