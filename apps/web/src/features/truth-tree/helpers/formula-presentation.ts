import { FormulaParseError } from '@logiclab/logic-engine';
import type { TruthTree } from '@logiclab/contracts/truth-tree';
import {
  parseTruthTreeFormula,
  decomposeTruthTreeFormula,
  type TruthTreeFormula,
} from '@logiclab/logic-engine/truth-tree';
import { proofNotation } from '../../proof/helpers/proof-notation';
import { editableTree } from './construction';

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
export function truthTreeFormulaLabel(value: string): string {
  try {
    return formatted(parseTruthTreeFormula(value));
  } catch {
    return proofNotation(value) || '(blank)';
  }
}

export type FormulaProgress =
  'applied' | 'partial' | 'literal' | 'constant' | 'pending' | 'invalid';

/** Entered applications track path coverage only; they never certify a correct decomposition. */
export function truthTreeFormulaProgress(tree: TruthTree): Map<string, FormulaProgress> {
  const result = new Map<string, FormulaProgress>();
  const structure = editableTree(tree);
  if (!structure) return result;

  const paths = structure.branchOrder
    .filter((id) => structure.branches.get(id)!.ending.kind !== 'split')
    .map((id) => new Set(structure.paths.get(id)!));

  for (const occurrence of tree.occurrences) {
    try {
      const decomposition = decomposeTruthTreeFormula(parseTruthTreeFormula(occurrence.formula));
      if (decomposition.kind !== 'expansion') {
        result.set(occurrence.id, decomposition.kind);
        continue;
      }

      const containing = paths.filter((path) => path.has(occurrence.id));
      const applications = tree.expansions.filter(
        (expansion) => expansion.sourceId === occurrence.id,
      );
      const covered = containing.filter((path) =>
        applications.some((expansion) =>
          expansion.resultGroups.some((group) => group.occurrenceIds.some((id) => path.has(id))),
        ),
      ).length;
      result.set(
        occurrence.id,
        covered === 0 ? 'pending' : covered === containing.length ? 'applied' : 'partial',
      );
    } catch {
      result.set(occurrence.id, 'invalid');
    }
  }
  return result;
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
