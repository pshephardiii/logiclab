import { readTreeInput } from './input';
import { analyzeTreeStructure } from './structure';
import { readFormula, readProblem } from '../proof-formulas';
import { proofBudget, ProofBudgetExceeded } from '../proof-budget';
import { structureDiagnostics } from '../structure-diagnostics';
import { getPropositionalRule } from '../rule-catalog';
import { sameFormula } from '../formula-equality';

/**
 * A filled strict tree with a matching conclusion root, not a correctness verdict.
 * Invalid rule applications and discharge choices can still need post-submission review.
 */
export function isFinishedTreeProofAttempt(value: unknown): boolean {
  // Reject unsupported or oversized transport before inspecting the student's draft.
  const read = readTreeInput(value);

  if ('diagnostic' in read) return false;

  const { input } = read;
  const budget = proofBudget();
  const diagnostics = structureDiagnostics();

  try {
    // Establish a usable authoritative problem before interpreting the submitted work.
    const problem = readProblem(input, budget, diagnostics);

    if (diagnostics.items.length || !problem.conclusion.formula) return false;

    // Completion still needs one connected, unambiguous tree with all references selected.
    const structure = analyzeTreeStructure(input.proof, budget);

    if (structure.status !== 'resolved') return false;

    const root = input.proof.nodes[structure.rootIndex]!;

    // Merely writing the requested conclusion as a temporary assumption is not a finished proof.
    if (root.kind === 'assumption') return false;

    const permitted = new Set(input.problem.permittedRuleIds);

    for (const node of input.proof.nodes) {
      budget.spend(1);

      // Intermediate formulas need only be filled. Syntax and inference mistakes are checked later.
      if (!node.formula.trim()) return false;

      if (node.kind === 'premise') {
        if (node.premiseId === null || !problem.premises.has(node.premiseId)) return false;
      } else if (node.kind === 'inference') {
        // Require the permitted rule's fields, without deciding whether its formula pattern matches.
        const rule = node.ruleId ? getPropositionalRule(node.ruleId) : undefined;

        if (
          !rule ||
          !permitted.has(rule.id) ||
          node.lineReferences.length !== rule.lineReferences ||
          node.branches.length !== rule.subproofReferences
        )
          return false;

        budget.spend(node.branches.length);

        if (node.branches.some((branch) => !branch.assumptionFormula.trim())) return false;
      }
    }

    // Only the selected root must parse and match the target; array order has no logical meaning.
    const final = readFormula(root.formula, budget, diagnostics);

    if (!final.formula) return false;

    budget.spend(2 * (final.size + problem.conclusion.size));

    return sameFormula(final.formula, problem.conclusion.formula);
  } catch (error) {
    if (!(error instanceof ProofBudgetExceeded)) throw error;

    // Exhaustion cannot establish completeness; unrelated programming errors must still surface.
    return false;
  }
}
