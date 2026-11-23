import type { ParsedProofFormula } from './proof-formulas';
import type { ProofFormula } from './types';
import { restoreFormulaGrouping } from '../formula/grouping-source';
import { requireExplicitGrouping } from '../parser/grouping';
import { FormulaParseError } from '../parser/errors';
import { parseProofFormulaWithSyntax, PROOF_FORMULA_LIMITS } from './parse-formula';
import { ProofBudgetExceeded, type ProofBudget } from './proof-budget';

type ValidFormula = Extract<ParsedProofFormula, { status: 'valid' }>;

/** Replace internal provenance only. Submitted formulas and stable proof identities are untouched. */
export function setProofSource(current: ValidFormula, source: string, budget: ProofBudget) {
  try {
    budget.spend(source.length + 1);
    const syntax = requireExplicitGrouping(parseProofFormulaWithSyntax(source));
    budget.spend(syntax.nodes.size);
    current.syntax = syntax;
    current.formula = syntax.formula;
  } catch (error) {
    if (!(error instanceof FormulaParseError)) throw error;
    throw new ProofBudgetExceeded(
      'Inherited formula grouping cannot be retained within proof limits.',
      error.position,
    );
  }
}

/**
 * Copy only the subformula correspondences from the successful rule variant. Equal-looking
 * but unused operands, failed alternatives and unrelated earlier lines contribute no constraints.
 */
export function carryProofGrouping(
  current: ValidFormula,
  pairs: readonly (readonly [ProofFormula, ProofFormula])[],
  sources: readonly ParsedProofFormula[],
  budget: ProofBudget,
) {
  if (!current.syntax) throw new ProofBudgetExceeded('Source grouping is unavailable.');
  const actual = current.syntax;
  const required = new Set<ProofFormula>();
  for (const [left, right] of pairs) {
    budget.spend(1);
    const result = actual.nodes.has(left) ? left : actual.nodes.has(right) ? right : undefined;
    if (!result) continue;
    const from = result === left ? right : left;
    // A rule may compare two parts of its own conclusion (for example excluded middle).
    // That establishes shape, not inherited constraints from an earlier line.
    if (actual.nodes.has(from)) continue;
    const owner = sources.find(
      (source) => source.status === 'valid' && source.syntax?.nodes.has(from),
    );
    if (!owner || owner.status !== 'valid' || !owner.syntax)
      throw new ProofBudgetExceeded('Authoritative source grouping is unavailable.');

    const pending: [ProofFormula, ProofFormula, boolean][] = [[result, from, true]];
    while (pending.length) {
      budget.spend(1);
      const [target, origin, root] = pending.pop()!;
      // Extracting a grouped member opens that member; descendant boundaries remain mandatory.
      if (!root && origin.type === 'binary' && owner.syntax.nodes.get(origin)!.groups.length)
        required.add(target);
      if (target.type === 'binary' && origin.type === 'binary')
        pending.push([target.left, origin.left, false], [target.right, origin.right, false]);
      else if (target.type === 'not' && origin.type === 'not')
        pending.push([target.operand, origin.operand, false]);
    }
  }
  try {
    const text = restoreFormulaGrouping(actual, required, budget, PROOF_FORMULA_LIMITS.maxLength);
    if (text !== actual.source) setProofSource(current, text, budget);
  } catch (error) {
    if (!(error instanceof FormulaParseError)) throw error;
    throw new ProofBudgetExceeded(
      'Preserving inherited formula grouping exceeds proof limits.',
      error.position,
    );
  }
}
