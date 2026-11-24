import { FormulaParseError } from '@logiclab/logic-engine';
import { parseTruthTreeFormula, type TruthTreeFormula } from '@logiclab/logic-engine/truth-tree';
import { formulaNotation } from '../../../components/formula/formula-notation';

const operators = { and: '∧', or: '∨', implies: '→', iff: '↔' };

function formatted(formula: TruthTreeFormula, nested = false): string {
  switch (formula.type) {
    case 'variable':
      return formula.name;
    case 'bottom':
      return '⊥';
    case 'not':
      return `¬${formatted(formula.operand, true)}`;
    case 'binary': {
      const text = `${formatted(formula.left, true)} ${operators[formula.operator]} ${formatted(formula.right, true)}`;
      return nested ? `(${text})` : text;
    }
  }
}

/** Normalize read-only notation/grouping; retain malformed drafts without repairing entered work. */
export function truthTreeFormulaLabel(value: string, version: 1 | 2 = 1): string {
  try {
    if (version === 2) {
      // Preserve the author's binary boundaries rather than printing the parser's left fold.
      parseTruthTreeFormula(value);
      return formulaNotation(value).replace(/\(\s*([A-Z]|⊥)\s*\)|\[\s*([A-Z]|⊥)\s*\]/g, '$1$2');
    }
    return formatted(parseTruthTreeFormula(value));
  } catch {
    return formulaNotation(value) || '(blank)';
  }
}

/** Preserve UTF-16 offsets from the parser while marking an entire Unicode character. */
export function unexpectedFormulaCharacter(formula: string) {
  try {
    parseTruthTreeFormula(formula);
  } catch (error) {
    if (error instanceof FormulaParseError && error.code === 'INVALID_CHARACTER') {
      const position = error.position;
      const length = String.fromCodePoint(formula.codePointAt(position)!).length;
      return { formula, position, length };
    }
  }
  return null;
}
