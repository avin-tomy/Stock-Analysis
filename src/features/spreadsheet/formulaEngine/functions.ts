import { FormulaEvalError, FORMULA_ERRORS } from './errors';

export function callFunction(name: string, args: number[]): number {
  switch (name) {
    case 'SUM':
      return args.reduce((a, b) => a + b, 0);
    case 'AVERAGE':
    case 'AVG':
      if (args.length === 0) return 0;
      return args.reduce((a, b) => a + b, 0) / args.length;
    default:
      throw new FormulaEvalError(FORMULA_ERRORS.ERROR, `Unknown function "${name}"`);
  }
}
