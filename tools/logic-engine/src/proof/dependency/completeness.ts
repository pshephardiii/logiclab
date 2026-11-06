import { readDependencyInput } from './input';
import { readFormula, readProblem } from '../proof-formulas';
import { proofBudget, ProofBudgetExceeded } from '../proof-budget';
import { structureDiagnostics } from '../structure-diagnostics';
import { getPropositionalRule } from '../rule-catalog';
import { sameFormula } from '../formula-equality';

/**
 * A filled attempt ending at the target, not proof verification. Written support may be wrong,
 * including undischarged assumptions; verification records those mistakes after submission.
 * Missing targets/identities, blank fields and unfilled citations are unfinished work.
 */
export function isFinishedDependencyProofAttempt(value: unknown): boolean {
  // Reject unsupported transport before resolving any written source sets or citations.
  const read = readDependencyInput(value);
  if ('diagnostic' in read) return false;
  const { input } = read;
  const last = input.proof.steps.at(-1);
  if (!last || last.kind === 'assumption') return false;
  const budget = proofBudget();
  const diagnostics = structureDiagnostics();
  try {
    const problem = readProblem(input, budget, diagnostics);
    if (diagnostics.items.length || !problem.conclusion.formula) return false;
    // Stable IDs must be unambiguous even though display order can change while editing.
    const lines = new Map(input.proof.steps.map((step) => [step.id, step]));
    if (lines.size !== input.proof.steps.length) return false;
    const permitted = new Set(input.problem.permittedRuleIds);
    // Require filled fields and existing sources, not correct annotations or inference patterns.
    for (const step of input.proof.steps) {
      budget.spend(1 + step.dependencies.length);
      if (!step.formula.trim()) return false;
      if (step.dependencies.some((id) => !lines.has(id) || lines.get(id)!.kind === 'inference'))
        return false;
      if (step.kind === 'premise') {
        if (step.premiseId === null || !problem.premises.has(step.premiseId)) return false;
      } else if (step.kind === 'inference') {
        const rule = step.ruleId ? getPropositionalRule(step.ruleId) : undefined;
        if (
          !rule ||
          !permitted.has(rule.id) ||
          step.lineReferences.length !== rule.lineReferences ||
          step.discharges.length !== rule.subproofReferences
        )
          return false;
        budget.spend(step.lineReferences.length + step.discharges.length * 2);
        if (step.lineReferences.some((id) => !lines.has(id))) return false;
        // A discharge needs both endpoints selected; its logical support is verified later.
        if (
          step.discharges.some(
            (pair) =>
              !pair.assumptionId ||
              !pair.conclusionId ||
              lines.get(pair.assumptionId)?.kind !== 'assumption' ||
              !lines.has(pair.conclusionId),
          )
        )
          return false;
      }
    }
    // Completion requires the actual last line to match the target; earlier syntax is reviewable.
    const final = readFormula(last.formula, budget, diagnostics);
    if (!final.formula) return false;
    budget.spend(2 * (final.size + problem.conclusion.size));
    return sameFormula(final.formula, problem.conclusion.formula);
  } catch (error) {
    if (!(error instanceof ProofBudgetExceeded)) throw error;
    // Return unfinished when the bounded check cannot establish completeness.
    return false;
  }
}
