export type TokenType =
  | 'NUMBER'
  | 'CELLREF'
  | 'IDENT'
  | 'OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'COLON'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
}

const CELLREF_RE = /^[A-Za-z]+[0-9]+/;
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const NUMBER_RE = /^\d+(\.\d+)?/;

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const rest = input.slice(pos);
    const ch = rest[0];

    if (/\s/.test(ch)) {
      pos += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: ch });
      pos += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ch });
      pos += 1;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ch });
      pos += 1;
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'COLON', value: ch });
      pos += 1;
      continue;
    }
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      pos += 1;
      continue;
    }

    const cellMatch = CELLREF_RE.exec(rest);
    if (cellMatch) {
      tokens.push({ type: 'CELLREF', value: cellMatch[0].toUpperCase() });
      pos += cellMatch[0].length;
      continue;
    }

    const identMatch = IDENT_RE.exec(rest);
    if (identMatch) {
      tokens.push({ type: 'IDENT', value: identMatch[0].toUpperCase() });
      pos += identMatch[0].length;
      continue;
    }

    const numberMatch = NUMBER_RE.exec(rest);
    if (numberMatch) {
      tokens.push({ type: 'NUMBER', value: numberMatch[0] });
      pos += numberMatch[0].length;
      continue;
    }

    throw new Error(`Unexpected character "${ch}" in formula`);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}
