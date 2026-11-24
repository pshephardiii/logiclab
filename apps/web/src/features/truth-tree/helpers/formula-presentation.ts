import { FormulaParseError, formulaChainMembers } from '@logiclab/logic-engine';
import type { TruthTree } from '@logiclab/contracts/truth-tree';
import {
  parseTruthTreeFormula,
  parseTruthTreeFormulaWithSyntax,
  decomposeTruthTreeFormula,
  type TruthTreeFormula,
} from '@logiclab/logic-engine/truth-tree';
import { formulaNotation } from '../../../components/formula/formula-notation';
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

export type FormulaProgress =
  'applied' | 'partial' | 'literal' | 'constant' | 'pending' | 'invalid';

/** Entered applications track path coverage only; they never certify a correct decomposition. */
export function truthTreeFormulaProgress(
  tree: TruthTree,
  sources?: ReadonlyMap<string, string>,
): Map<string, FormulaProgress> {
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
      const source = parseTruthTreeFormulaWithSyntax(
        sources?.get(occurrence.id) ?? occurrence.formula,
      );
      const tracksConjuncts =
        tree.treeVersion === 2 &&
        source.formula.type === 'binary' &&
        source.formula.operator === 'and';
      const memberCount = tracksConjuncts ? formulaChainMembers(source).length : 0;
      let used = false;
      const covered = containing.filter((path) => {
        const local = applications.filter((expansion) =>
          expansion.resultGroups.some((group) => group.occurrenceIds.some((id) => path.has(id))),
        );
        used ||= local.length > 0;
        if (
          !tracksConjuncts ||
          local.some((expansion) => expansion.ruleId !== 'conjunct_extraction')
        )
          return local.length > 0;

        // Count distinct positions, not repeated selections or work done only on a sibling path.
        const indices = new Set(
          local.flatMap((expansion) => {
            const choice = expansion.chainChoice;
            return choice?.ruleId === 'conjunct_extraction' && choice.memberIndex < memberCount
              ? [choice.memberIndex]
              : [];
          }),
        );
        return indices.size === memberCount;
      }).length;
      result.set(
        occurrence.id,
        !used ? 'pending' : covered === containing.length ? 'applied' : 'partial',
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
