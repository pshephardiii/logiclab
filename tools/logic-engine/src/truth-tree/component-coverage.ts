import type { TruthTreeBudget, TruthTreeStructure } from './structure-context';

export type ChainCoverage = ReadonlyMap<
  string,
  { memberCount: number; coveredMemberIndices: readonly number[] }
>;

/** Each child gets its own component sets; repeated selections never count as another conjunct. */
export function truthTreeComponentCoverage(
  structure: TruthTreeStructure,
  matches: ChainCoverage,
  budget: TruthTreeBudget,
) {
  const coverage = new Map<string, Set<string>>();
  const partial = new Map<string, Map<string, Set<number>>>();
  const local = new Map<string, typeof structure.tree.expansions>();
  for (const expansion of structure.expansions.values()) {
    const entries = local.get(expansion.branchId) ?? [];
    entries.push(expansion);
    local.set(expansion.branchId, entries);
  }
  for (const id of structure.branchOrder) {
    const branch = structure.branches.get(id)!;
    const inherited = branch.parentId === null ? undefined : coverage.get(branch.parentId);
    budget.spend(1 + (inherited?.size ?? 0));
    const expanded = new Set(inherited);
    const selections = new Map<string, Set<number>>();
    if (branch.parentId !== null)
      for (const [source, indices] of partial.get(branch.parentId) ?? []) {
        budget.spend(indices.size + 1);
        selections.set(source, new Set(indices));
      }
    for (const expansion of local.get(id) ?? []) {
      budget.spend();
      if (expansion.ruleId !== 'conjunct_extraction') {
        expanded.add(expansion.sourceId!);
        continue;
      }
      const match = matches.get(expansion.id);
      if (!match) continue;
      const indices = selections.get(expansion.sourceId!) ?? new Set<number>();
      for (const index of match.coveredMemberIndices) {
        budget.spend();
        indices.add(index);
      }
      selections.set(expansion.sourceId!, indices);
      if (indices.size === match.memberCount) expanded.add(expansion.sourceId!);
    }
    partial.set(id, selections);
    coverage.set(id, expanded);
  }
  return coverage;
}
