import {
  TRUTH_TREE_LIMITS,
  type TruthTree,
  type TruthTreeBranch,
  type TruthTreeOccurrence,
  type TruthTreeExpansion,
  type TruthTreeDiagnostic,
} from '@logiclab/contracts/truth-tree';

export class TruthTreeResourceLimit extends Error {}

export function truthTreeBudget() {
  let remaining = TRUTH_TREE_LIMITS.maxCheckWork;

  return {
    spend(units = 1) {
      remaining -= units;

      if (remaining < 0)
        throw new TruthTreeResourceLimit('Truth-tree checking work limit exceeded.');
    },
  };
}

export type TruthTreeBudget = ReturnType<typeof truthTreeBudget>;

export type OccurrenceLocation = { branchId: string; index: number };

export type TruthTreeStructure = {
  tree: TruthTree;
  branches: Map<string, TruthTreeBranch>;
  occurrences: Map<string, TruthTreeOccurrence>;
  expansions: Map<string, TruthTreeExpansion>;
  locations: Map<string, OccurrenceLocation>;
  paths: Map<string, string[]>;
  branchOrder: string[];
};

export function structureDiagnostics() {
  const items: TruthTreeDiagnostic[] = [];

  function add(diagnostic: TruthTreeDiagnostic) {
    if (items.length >= TRUTH_TREE_LIMITS.maxDiagnostics)
      throw new TruthTreeResourceLimit('Truth-tree diagnostic limit exceeded.');

    items.push(diagnostic);
  }

  return {
    items,
    add,
    get invalid() {
      return items.some((item) => item.code !== 'INCOMPLETE_TREE');
    },
  };
}

export type StructureContext = TruthTreeStructure & {
  budget: TruthTreeBudget;
  diagnostics: ReturnType<typeof structureDiagnostics>;
};
