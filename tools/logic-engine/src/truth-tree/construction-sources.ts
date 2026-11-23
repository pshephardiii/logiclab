import { analyzeTruthTreeSteps } from './check-steps';
import { truthTreeBudget } from './structure-context';

/**
 * Construction-only projection of entered sources with inherited grouping restored. Reuse the
 * bounded provenance analysis so editors do not invent a second interpretation of boundaries.
 * No diagnostics, correctness statuses, verdicts or instructor reference are returned. Callers
 * still use a separate check to obtain feedback; this is never evidence for grading.
 */
export function truthTreeConstructionSources(input: unknown): ReadonlyMap<string, string> {
  const analysis = analyzeTruthTreeSteps(input, truthTreeBudget());
  return new Map(analysis.context?.authoritativeSources);
}
