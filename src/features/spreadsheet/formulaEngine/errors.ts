export const FORMULA_ERRORS = {
  CIRCULAR: '#CIRCULAR!',
  REF: '#REF!',
  ERROR: '#ERROR!',
} as const;

export class FormulaEvalError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}
