import { readFitchInput } from './fitch/input';
import { readDependencyInput } from './dependency/input';
import { proofBudget, ProofBudgetExceeded } from './proof-budget';
import { readProblem } from './proof-formulas';
import { readProofSourceFormulas } from './source-analysis';
import { structureDiagnostics } from './structure-diagnostics';

/**
 * Construction metadata only: entered source text with pinned/inherited grouping restored.
 * No correctness, dependency status, target result or instructor reference is returned.
 */
export function proofConstructionSources(value: unknown): ReadonlyMap<string, string> {
  const fitch = readFitchInput(value);
  const read = 'input' in fitch ? fitch : readDependencyInput(value);
  if (!('input' in read) || read.input.problem.ruleCatalogVersion !== 2) return new Map();

  const { input } = read;
  const budget = proofBudget();
  const diagnostics = structureDiagnostics();
  try {
    const problem = readProblem(input, budget, diagnostics);
    if (diagnostics.items.length) return new Map();

    const formulas = readProofSourceFormulas(input, problem.premises, budget);
    if (!formulas) return new Map();

    const sources = new Map<string, string>();
    formulas.forEach((formula, index) => {
      if (formula.status === 'valid' && formula.syntax)
        sources.set(input.proof.steps[index]!.id, formula.syntax.source);
    });
    return sources;
  } catch (error) {
    if (error instanceof ProofBudgetExceeded) return new Map();
    throw error;
  }
}
