import { FormulaParseError } from './errors';
import type { Token, TokenKind } from './types';

const symbols: Readonly<Record<string, TokenKind>> = {
  '¬': 'not',
  '!': 'not',
  '∧': 'and',
  '&': 'and',
  '∨': 'or',
  '|': 'or',
  '→': 'implies',
  '(': 'open',
  ')': 'close',
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  for (let position = 0; position < source.length;) {
    const text = source[position]!;
    if (/\s/u.test(text)) {
      position++;
      continue;
    }
    if (source.startsWith('->', position)) {
      tokens.push({ kind: 'implies', text: '->', position });
      position += 2;
      continue;
    }
    const kind = /^[A-Z]$/.test(text) ? 'variable' : symbols[text];
    if (!kind) {
      throw new FormulaParseError(
        'INVALID_CHARACTER', position,
        `Unexpected character ${JSON.stringify(text)}; use A–Z, ¬/!, ∧/&, ∨/|, →/->, or parentheses`,
      );
    }
    tokens.push({ kind, text, position });
    position++;
  }
  tokens.push({ kind: 'end', text: '', position: source.length });
  return tokens;
}
