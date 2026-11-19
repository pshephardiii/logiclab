import type { TruthTreeBudget, TruthTreeStructure } from './structure-context';

/** Each child inherits only its ancestors' expansions, never work done on a sibling branch. */
export function truthTreeCoverage(structure: TruthTreeStructure, budget: TruthTreeBudget) {
  const localSources = new Map<string, string[]>();
  for (const expansion of structure.expansions.values()) {
    const sources = localSources.get(expansion.branchId) ?? [];
    sources.push(expansion.sourceId!);
    localSources.set(expansion.branchId, sources);
  }

  const coverage = new Map<string, Set<string>>();
  for (const branchId of structure.branchOrder) {
    const branch = structure.branches.get(branchId)!;
    const inherited = branch.parentId === null ? undefined : coverage.get(branch.parentId);
    budget.spend(1 + (inherited?.size ?? 0));
    const expanded = new Set(inherited);
    for (const sourceId of localSources.get(branchId) ?? []) expanded.add(sourceId);
    coverage.set(branchId, expanded);
  }
  return coverage;
}
