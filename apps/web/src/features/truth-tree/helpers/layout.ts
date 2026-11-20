import type { TruthTree } from '@logiclab/contracts/truth-tree';
import { editableTree } from './construction';

type BranchPosition = {
  column: number;
  firstLeaf: number;
  lastLeaf: number;
  startRow: number;
  endRow: number;
};

type ForkPosition = {
  expansionId: string;
  row: number;
  leftColumn: number;
  rightColumn: number;
  parentOffset: number;
};

/** Presentation only: preserve identities, segment order and one expansion per global stage. */
export function truthTreeLayout(tree: TruthTree) {
  const structure = editableTree(tree);
  if (!structure || !structure.tree.rootBranchId) return null;

  const branches = new Map<string, BranchPosition>();
  let leafCount = 0;

  // Allocate horizontal space by terminal paths, not depth: unbalanced forks cannot overlap.
  for (const id of structure.branchOrder) {
    if (structure.branches.get(id)!.ending.kind === 'split') continue;

    branches.set(id, {
      column: leafCount * 2 + 2,
      firstLeaf: leafCount,
      lastLeaf: leafCount,
      startRow: 1,
      endRow: 1,
    });
    leafCount++;
  }

  for (const id of [...structure.branchOrder].reverse()) {
    const branch = structure.branches.get(id)!;
    if (branch.ending.kind !== 'split') continue;

    const left = branches.get(branch.ending.childBranchIds[0]!)!;
    const right = branches.get(branch.ending.childBranchIds[1]!)!;
    branches.set(id, {
      column: left.firstLeaf + right.lastLeaf + 2,
      firstLeaf: left.firstLeaf,
      lastLeaf: right.lastLeaf,
      startRow: 1,
      endRow: 1,
    });
  }

  const rows = new Map<string, number>();
  const root = structure.branches.get(structure.tree.rootBranchId)!;
  const initial = root.occurrenceIds.filter(
    (id) => structure.occurrences.get(id)!.origin.kind !== 'expansion',
  );
  initial.forEach((id, index) => rows.set(id, index + 1));
  let nextRow = initial.length + 1;

  // Saved arrays may be reordered. Segment order and parent creation must still come first.
  const predecessors = new Map<string, string | null>();
  for (const id of structure.branchOrder) {
    const branch = structure.branches.get(id)!;
    const parent = branch.parentId ? structure.branches.get(branch.parentId)! : null;
    let previous = parent?.ending.kind === 'split' ? parent.ending.expansionId : null;

    for (const occurrenceId of branch.occurrenceIds) {
      const origin = structure.occurrences.get(occurrenceId)!.origin;
      if (origin.kind !== 'expansion' || !origin.expansionId) continue;

      const expansion = structure.expansions.get(origin.expansionId)!;
      if (expansion.branchId !== id || predecessors.has(expansion.id)) continue;

      predecessors.set(expansion.id, previous);
      previous = expansion.id;
    }

    if (branch.ending.kind === 'split') predecessors.set(branch.ending.expansionId!, previous);
  }

  const pending = [...structure.tree.expansions];
  const placed = new Set<string>();
  const forks: ForkPosition[] = [];

  while (pending.length) {
    const index = pending.findIndex((expansion) => {
      const previous = predecessors.get(expansion.id);
      return previous === null || (previous !== undefined && placed.has(previous));
    });
    if (index === -1) return null;

    const expansion = pending.splice(index, 1)[0]!;
    const branch = structure.branches.get(expansion.branchId)!;
    const position = branches.get(branch.id)!;

    if (branch.ending.kind === 'split' && branch.ending.expansionId === expansion.id) {
      const left = branches.get(branch.ending.childBranchIds[0]!)!;
      const right = branches.get(branch.ending.childBranchIds[1]!)!;
      position.endRow = nextRow;
      forks.push({
        expansionId: expansion.id,
        row: nextRow,
        leftColumn: left.column,
        rightColumn: right.column,
        parentOffset: ((position.column - left.column) / (right.column - left.column)) * 100,
      });
      nextRow++;
    }

    let height = 0;
    for (const group of expansion.resultGroups) {
      const destination = structure.branches.get(group.branchId)!;
      const resultIds = new Set(group.occurrenceIds);
      const ordered = destination.occurrenceIds.filter((id) => resultIds.has(id));
      ordered.forEach((id, index) => rows.set(id, nextRow + index));
      height = Math.max(height, ordered.length);

      if (group.branchId !== branch.id) branches.get(group.branchId)!.startRow = nextRow;
    }

    nextRow += height;
    placed.add(expansion.id);
  }

  for (const id of structure.branchOrder) {
    const branch = structure.branches.get(id)!;
    if (branch.ending.kind === 'split') continue;

    const position = branches.get(id)!;
    const lastRow = Math.max(0, ...branch.occurrenceIds.map((id) => rows.get(id) ?? 0));
    // Keep live paths available at the bottom; closed paths stop just after their last formula.
    position.endRow = branch.ending.kind === 'open' ? nextRow : lastRow + 1;
  }

  return {
    structure,
    branches,
    rows,
    forks,
    leafCount,
    rowCount: Math.max(1, nextRow),
    rootStemRow: Math.max(1, initial.length),
    numbers: new Map(structure.tree.occurrences.map((item, index) => [item.id, index + 1])),
    branchNumbers: new Map(structure.branchOrder.map((id, index) => [id, index + 1])),
  };
}
