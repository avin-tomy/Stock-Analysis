import { tokenize, type Token } from './tokenizer';

export type Ast =
  | { type: 'number'; value: number }
  | { type: 'cellref'; address: string }
  | { type: 'range'; start: string; end: string }
  | { type: 'unary'; op: '-'; operand: Ast }
  | { type: 'binop'; op: '+' | '-' | '*' | '/'; left: Ast; right: Ast }
  | { type: 'call'; name: string; args: Ast[] };

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(type?: Token['type']): Token {
    const token = this.tokens[this.pos];
    if (type && token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} ("${token.value}")`);
    }
    this.pos += 1;
    return token;
  }

  parseExpression(): Ast {
    const node = this.parseAdditive();
    if (this.peek().type !== 'EOF') {
      throw new Error(`Unexpected token "${this.peek().value}"`);
    }
    return node;
  }

  private parseAdditive(): Ast {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value as '+' | '-';
      const right = this.parseMultiplicative();
      left = { type: 'binop', op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): Ast {
    let left = this.parseUnary();
    while (this.peek().type === 'OP' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.consume().value as '*' | '/';
      const right = this.parseUnary();
      left = { type: 'binop', op, left, right };
    }
    return left;
  }

  private parseUnary(): Ast {
    if (this.peek().type === 'OP' && this.peek().value === '-') {
      this.consume();
      return { type: 'unary', op: '-', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Ast {
    const token = this.peek();

    if (token.type === 'NUMBER') {
      this.consume();
      return { type: 'number', value: parseFloat(token.value) };
    }

    if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const inner = this.parseAdditive();
      this.consume('RPAREN');
      return inner;
    }

    if (token.type === 'CELLREF') {
      this.consume('CELLREF');
      if (this.peek().type === 'COLON') {
        this.consume('COLON');
        const end = this.consume('CELLREF');
        return { type: 'range', start: token.value, end: end.value };
      }
      return { type: 'cellref', address: token.value };
    }

    if (token.type === 'IDENT') {
      this.consume('IDENT');
      this.consume('LPAREN');
      const args: Ast[] = [];
      if (this.peek().type !== 'RPAREN') {
        args.push(this.parseArg());
        while (this.peek().type === 'COMMA') {
          this.consume('COMMA');
          args.push(this.parseArg());
        }
      }
      this.consume('RPAREN');
      return { type: 'call', name: token.value, args };
    }

    throw new Error(`Unexpected token "${token.value}"`);
  }

  private parseArg(): Ast {
    // A range like A1:A5 is only valid directly as a function argument.
    if (this.peek().type === 'CELLREF') {
      const start = this.peek().value;
      const savedPos = this.pos;
      this.consume('CELLREF');
      if (this.peek().type === 'COLON') {
        this.consume('COLON');
        const end = this.consume('CELLREF');
        return { type: 'range', start, end: end.value };
      }
      this.pos = savedPos;
    }
    return this.parseAdditive();
  }
}

export function parseFormula(source: string): Ast {
  const tokens = tokenize(source);
  return new Parser(tokens).parseExpression();
}
