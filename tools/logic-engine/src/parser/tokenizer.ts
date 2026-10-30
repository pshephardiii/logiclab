import { FormulaParseError } from './errors';
import type { Token, TokenKind } from './types';

const symbols: Readonly<Record<string, TokenKind>> = {
  '¬': 'not',
  '!': 'not',
  '~': 'not',
  '∧': 'and',
  '&': 'and',
  '∨': 'or',
  '|': 'or',
  v: 'or',
  '→': 'implies',
  '↔': 'iff',
  '(': 'open',
  ')': 'close',
  '[': 'open',
  ']': 'close',
};

export function tokenize(source: string, allowContradiction = false): Token[] {
  const tokens: Token[] = [];
  for (let position = 0; position < source.length;) {
    const text = source[position]!;
    if (/\s/u.test(text)) {
      position++;
      continue;
    }
    if (allowContradiction && (text === '⊥' || source.startsWith('_|_', position))) {
      const spelling = text === '⊥' ? text : '_|_';
      tokens.push({ kind: 'bottom', text: spelling, position });
      position += spelling.length;
      continue;
    }
    // Match the longer alias before implication so <-> is one token.
    if (source.startsWith('<->', position)) {
      tokens.push({ kind: 'iff', text: '<->', position });
      position += 3;
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
        'INVALID_CHARACTER',
        position,
        `Unexpected character ${JSON.stringify(text)}; use A–Z, ¬/!/~, ∧/&, ∨/v/|, →/->, ↔/<->, parentheses, or square brackets${allowContradiction ? ', and ⊥/_|_' : ''}`,
      );
    }
    tokens.push({ kind, text, position });
    position++;
  }
  tokens.push({ kind: 'end', text: '', position: source.length });
  return tokens;
}
