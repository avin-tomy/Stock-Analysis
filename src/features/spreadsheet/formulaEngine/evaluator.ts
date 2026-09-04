import type { Ast } from './parser';
import { expandRange } from '../addressing';
import { FormulaEvalError, FORMULA_ERRORS } from './errors';
import { callFunction } from './functions';

export interface EvalContext {
  getCellNumericValue: (address: string) => number;
}

export function evaluateAst(ast: Ast, ctx: EvalContext): number {
  switch (ast.type) {
    case 'number':
      return ast.value;
    case 'cellref':
      return ctx.getCellNumericValue(ast.address);
    case 'range':
      throw new FormulaEvalError(FORMULA_ERRORS.ERROR, 'Range used outside of a function');
    case 'unary':
      return -evaluateAst(ast.operand, ctx);
    case 'binop': {
      const left = evaluateAst(ast.left, ctx);
      const right = evaluateAst(ast.right, ctx);
      switch (ast.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          // Guard divide-by-zero (common for P/L % before a position has cost
          // basis) by returning 0 instead of Infinity/NaN.
          if (right === 0) return 0;
          return left / right;
      }
      break;
    }
    case 'call': {
      const values: number[] = [];
      for (const arg of ast.args) {
        if (arg.type === 'range') {
          for (const addr of expandRange(arg.start, arg.end)) {
            values.push(ctx.getCellNumericValue(addr));
          }
        } else {
          values.push(evaluateAst(arg, ctx));
        }
      }
      return callFunction(ast.name, values);
    }
  }
  throw new FormulaEvalError(FORMULA_ERRORS.ERROR, 'Unknown formula node');
}
