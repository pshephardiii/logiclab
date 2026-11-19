import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import type { StructureContext } from './structure-context';

/** Resolve generated occurrences before checking their formulas against a decomposition rule. */
export function resolveTruthTreeExpansions(context: StructureContext) {
  const claimed = new Set<string>();

  for (const expansion of context.expansions.values()) {
    const { diagnostics, budget } = context;
    budget.spend();
    const at = { expansionId: expansion.id };
    const fail = (message: string) =>
      diagnostics.add({ code: CheckerDiagnosticCode.InvalidReference, message, ...at });
    const branch = context.branches.get(expansion.branchId);

    if (!branch) {
      fail('An expansion must belong to a submitted branch.');
      continue;
    }

    const splitting = branch.ending.kind === 'split' && branch.ending.expansionId === expansion.id;
    const groups = expansion.resultGroups;

    if (expansion.sourceId === null || expansion.ruleId === null || groups.length === 0)
      diagnostics.add({
        code: CheckerDiagnosticCode.IncompleteTree,
        message: 'Select a source, rule and generated results for this expansion.',
        ...at,
      });

    if (splitting) {
      if (groups.length < 2)
        diagnostics.add({
          code: CheckerDiagnosticCode.IncompleteTree,
          message: 'A split needs results for both child branches.',
          ...at,
        });
    } else if (groups.length > 1) {
      fail('Multiple result groups require this expansion to split its branch.');
    }

    const groupBranches = new Set<string>();
    let firstResult = branch.occurrenceIds.length;

    for (const group of groups) {
      budget.spend(1 + group.occurrenceIds.length);

      if (groupBranches.has(group.branchId))
        fail('Expansion alternatives must use distinct branches.');
      groupBranches.add(group.branchId);

      if (splitting && branch.ending.kind === 'split') {
        if (!branch.ending.childBranchIds.includes(group.branchId))
          fail('Split results must belong to the splitting branch’s direct children.');
      } else if (group.branchId !== branch.id) {
        fail('Nonbranching results must belong to the current segment.');
      }

      if (group.occurrenceIds.length === 0)
        diagnostics.add({
          code: CheckerDiagnosticCode.IncompleteTree,
          message: 'Fill the generated occurrences in this result group.',
          ...at,
        });

      const positions: number[] = [];

      for (const id of group.occurrenceIds) {
        const occurrence = context.occurrences.get(id);
        const location = context.locations.get(id);

        if (
          !occurrence ||
          !location ||
          location.branchId !== group.branchId ||
          occurrence.origin.kind !== 'expansion' ||
          occurrence.origin.expansionId !== expansion.id ||
          claimed.has(id)
        ) {
          fail('Each result must identify its own generated occurrence in the specified segment.');
          continue;
        }

        claimed.add(id);
        positions.push(location.index);
        if (group.branchId === branch.id) firstResult = Math.min(firstResult, location.index);
      }

      positions.sort((a, b) => a - b);

      // One expansion is one insertion, regardless of the order of its component formulas.
      if (positions.some((position, index) => index > 0 && position !== positions[index - 1]! + 1))
        fail('Results of one expansion must be adjacent in their segment.');

      if (splitting && positions.length && positions[0] !== 0)
        fail('Split results must begin each child segment.');
    }

    if (
      splitting &&
      branch.ending.kind === 'split' &&
      groups.length === 2 &&
      branch.ending.childBranchIds.some((id) => !groupBranches.has(id))
    )
      fail('Split alternatives must cover both child branches.');

    if (expansion.sourceId !== null) {
      // Ancestors precede this whole segment. Local sources must precede the first result;
      // a split occurs after the segment, so it can cite any formula already in that segment.
      const source = context.locations.get(expansion.sourceId);
      const path = context.paths.get(branch.id)!;
      budget.spend(path.length);

      if (
        !source ||
        !path.includes(expansion.sourceId) ||
        (source.branchId === branch.id && source.index >= firstResult)
      )
        fail('The source must be an earlier occurrence on this branch or its ancestor path.');
    }
  }

  // Orphaned or misattributed results cannot acquire support just by naming an expansion.
  for (const occurrence of context.occurrences.values()) {
    if (
      occurrence.origin.kind === 'expansion' &&
      occurrence.origin.expansionId !== null &&
      !claimed.has(occurrence.id)
    )
      context.diagnostics.add({
        code: CheckerDiagnosticCode.InvalidReference,
        message: 'A generated occurrence must be listed exactly once by its originating expansion.',
        occurrenceId: occurrence.id,
      });
  }

  for (const branch of context.branches.values()) {
    if (branch.ending.kind !== 'split' || branch.ending.expansionId === null) continue;

    const expansion = context.expansions.get(branch.ending.expansionId);
    if (!expansion || expansion.branchId !== branch.id)
      context.diagnostics.add({
        code: CheckerDiagnosticCode.InvalidReference,
        message: 'The split must cite an expansion applied on this segment.',
        branchId: branch.id,
      });
  }
}

export function resolveTruthTreeClosures(context: StructureContext) {
  for (const branch of context.branches.values()) {
    if (branch.ending.kind !== 'closed') continue;

    const closure = branch.ending.closure;
    if (closure === null) {
      context.diagnostics.add({
        code: CheckerDiagnosticCode.IncompleteTree,
        message: 'Select the evidence for closing this branch.',
        branchId: branch.id,
      });
      continue;
    }

    const ids = closure.kind === 'falsity' ? [closure.occurrenceId] : closure.occurrenceIds;
    const path = context.paths.get(branch.id)!;
    context.budget.spend(1 + path.length);

    if (new Set(ids).size !== ids.length || ids.some((id) => !path.includes(id)))
      context.diagnostics.add({
        code: CheckerDiagnosticCode.InvalidReference,
        message:
          'Closure witnesses must be distinct occurrences on this branch or its ancestor path.',
        branchId: branch.id,
      });
  }
}
