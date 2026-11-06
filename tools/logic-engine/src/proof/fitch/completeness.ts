import { readFitchInput } from './input';
import { readFormula, readProblem } from '../proof-formulas';
import { proofBudget, ProofBudgetExceeded } from '../proof-budget';
import { structureDiagnostics } from '../structure-diagnostics';
import { buildFitchLayout } from './layout';
import { getPropositionalRule } from '../rule-catalog';
import { sameFormula } from '../formula-equality';

/**
 * Filled, closed Fitch work with a final root target, not proof verification.
 * Existing but wrong citations, premise formulas and inference patterns may remain mistakes.
 * Nonfinal formulas need only be nonblank; diagnostics belong to explicit/post-submission checking.
 */
export function isFinishedFitchProofAttempt(value: unknown): boolean {
  // Validate transport before looking up any student-supplied line or block identity.
  const read = readFitchInput(value);

  if ('diagnostic' in read) return false;

  const { input } = read;
  const proof = input.proof;
  const last = proof.steps.at(-1);

  // The final target must be outside all subproofs, and each started box needs an endpoint.
  if (!last || last.blockId !== null || proof.blocks.some((block) => block.endId === null))
    return false;

  const budget = proofBudget();
  const diagnostics = structureDiagnostics();

  try {
    const problem = readProblem(input, budget, diagnostics);

    if (diagnostics.items.length || !problem.conclusion.formula) return false;

    // Establish consistent boxes/identities, without applying inference or citation-scope rules.
    const layout = buildFitchLayout(proof, diagnostics);

    if (!layout || diagnostics.items.length) return false;

    const permitted = new Set(input.problem.permittedRuleIds);

    // Filled fields and existing citations suffice here; logical errors belong to verification.
    for (const step of proof.steps) {
      if (!step.formula.trim()) return false;

      if (step.kind === 'premise') {
        if (step.premiseId === null || !problem.premises.has(step.premiseId)) return false;
      } else if (step.kind === 'inference') {
        const rule = step.ruleId ? getPropositionalRule(step.ruleId) : undefined;

        if (
          !rule ||
          !permitted.has(rule.id) ||
          step.lineReferences.length !== rule.lineReferences ||
          step.subproofReferences.length !== rule.subproofReferences
        )
          return false;

        if (
          step.lineReferences.some((id) => !layout.stepIndices.has(id)) ||
          step.subproofReferences.some((id) => !layout.blocks.has(id))
        )
          return false;
      }
    }

    // Parse only the final target for this comparison; nonfinal syntax mistakes remain reviewable.
    const final = readFormula(last.formula, budget, diagnostics);

    if (!final.formula) return false;

    budget.spend(2 * (final.size + problem.conclusion.size));

    return sameFormula(final.formula, problem.conclusion.formula);
  } catch (error) {
    if (!(error instanceof ProofBudgetExceeded)) throw error;

    // Resource exhaustion means completeness could not be established, not an invented grade.
    return false;
  }
}
