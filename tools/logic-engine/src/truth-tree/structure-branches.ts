import { TRUTH_TREE_LIMITS } from '@logiclab/contracts/truth-tree';
import { TruthTreeResourceLimit, type StructureContext } from './structure-context';

/** IDs must resolve unambiguously, including references accidentally aimed at another table. */
export function indexTruthTree(context: StructureContext) {
  const ids = new Set<string>();

  for (const entry of [
    ...context.tree.branches,
    ...context.tree.occurrences,
    ...context.tree.expansions,
  ]) {
    context.budget.spend();
    if (ids.has(entry.id)) {
      context.diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Submitted identities must be globally unique.',
      });
    }
    ids.add(entry.id);
  }

  // Populate each table separately, retaining its precise value type.
  for (const branch of context.tree.branches) context.branches.set(branch.id, branch);
  for (const occurrence of context.tree.occurrences)
    context.occurrences.set(occurrence.id, occurrence);
  for (const expansion of context.tree.expansions) context.expansions.set(expansion.id, expansion);
}

export function resolveTruthTreeBranches(context: StructureContext) {
  const { tree, branches, diagnostics } = context;
  const root = tree.rootBranchId === null ? undefined : branches.get(tree.rootBranchId);

  if (tree.rootBranchId === null) {
    diagnostics.add({
      code: 'INCOMPLETE_TREE',
      message: 'Choose the initial branch before checking.',
    });
    return;
  }

  if (!root) {
    diagnostics.add({
      code: 'INVALID_REFERENCE',
      message: 'The initial branch must identify a submitted branch.',
    });
    return;
  }

  for (const branch of branches.values()) {
    context.budget.spend();
    const fail = (message: string) =>
      diagnostics.add({ code: 'INVALID_STRUCTURE', message, branchId: branch.id });

    if (branch.id === root.id) {
      if (branch.parentId !== null) fail('The initial branch cannot have a parent.');
    } else {
      const parent = branch.parentId === null ? undefined : branches.get(branch.parentId);
      if (
        !parent ||
        parent.ending.kind !== 'split' ||
        !parent.ending.childBranchIds.includes(branch.id)
      )
        fail('Every other branch must be listed by its splitting parent.');
    }

    if (branch.ending.kind !== 'split') continue;

    const children = branch.ending.childBranchIds;
    if (children.length < 2 || branch.ending.expansionId === null)
      diagnostics.add({
        code: 'INCOMPLETE_TREE',
        message: 'Finish the split and its expansion selection.',
        branchId: branch.id,
      });

    if (new Set(children).size !== children.length)
      fail('A split requires distinct child branches.');

    for (const childId of children) {
      if (branches.get(childId)?.parentId !== branch.id)
        fail('Each split child must exist and point back to this parent.');
    }
  }

  if (diagnostics.invalid) return;

  // Walk parent before child. No recursive calls, including for malformed cyclic submissions.
  const pending = [{ branch: root, ancestors: [] as string[], depth: 0 }];

  while (pending.length) {
    const { branch, ancestors, depth } = pending.pop()!;
    context.budget.spend(1 + ancestors.length + branch.occurrenceIds.length);

    if (depth > TRUTH_TREE_LIMITS.maxBranchDepth)
      throw new TruthTreeResourceLimit('Truth-tree branch nesting limit exceeded.');

    if (context.paths.has(branch.id)) {
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Branch ancestry must be acyclic.',
        branchId: branch.id,
      });
      return;
    }

    const path = [...ancestors, ...branch.occurrenceIds];
    context.paths.set(branch.id, path);
    context.branchOrder.push(branch.id);

    if (branch.ending.kind === 'split') {
      for (const id of [...branch.ending.childBranchIds].reverse())
        pending.push({ branch: branches.get(id)!, ancestors: path, depth: depth + 1 });
    }
  }

  if (context.paths.size !== branches.size)
    diagnostics.add({
      code: 'INVALID_STRUCTURE',
      message:
        'Every submitted branch must descend from the initial branch; detached cycles are not allowed.',
    });
}

export function resolveTruthTreeOccurrences(context: StructureContext) {
  for (const branch of context.branches.values()) {
    let generated = false;

    for (const [index, id] of branch.occurrenceIds.entries()) {
      context.budget.spend();
      const occurrence = context.occurrences.get(id);

      if (!occurrence || context.locations.has(id)) {
        context.diagnostics.add({
          code: 'INVALID_STRUCTURE',
          message: 'Every branch entry must identify a distinct submitted occurrence.',
          branchId: branch.id,
        });
        continue;
      }

      context.locations.set(id, { branchId: branch.id, index });

      if (occurrence.origin.kind === 'expansion') {
        generated = true;
        if (occurrence.origin.expansionId === null)
          context.diagnostics.add({
            code: 'INCOMPLETE_TREE',
            message: 'Select the expansion that generated this occurrence.',
            occurrenceId: id,
          });
      } else {
        if (branch.id !== context.tree.rootBranchId || generated)
          context.diagnostics.add({
            code: 'INVALID_STRUCTURE',
            message: 'Initial formulas must form the beginning of the initial branch.',
            occurrenceId: id,
          });

        if (occurrence.origin.kind === 'premise' && occurrence.origin.premiseId === null)
          context.diagnostics.add({
            code: 'INCOMPLETE_TREE',
            message: 'Select the supplied premise for this occurrence.',
            occurrenceId: id,
          });
      }
    }
  }

  for (const occurrence of context.occurrences.values()) {
    if (!context.locations.has(occurrence.id))
      context.diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Every submitted occurrence must belong to exactly one branch segment.',
        occurrenceId: occurrence.id,
      });
  }
}
