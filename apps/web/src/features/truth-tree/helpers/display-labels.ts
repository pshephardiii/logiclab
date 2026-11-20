import type {
  TruthTreeBranch,
  TruthTreeExpansion,
  TruthTreeOccurrence,
} from '@logiclab/contracts/truth-tree';

export function occurrenceSourceLabel(
  occurrence: TruthTreeOccurrence,
  expansion: TruthTreeExpansion | null | undefined,
  numbers: ReadonlyMap<string, number>,
): string {
  switch (occurrence.origin.kind) {
    case 'premise':
      return 'Premise';
    case 'negated_conclusion':
      return 'Negated conclusion';
    case 'expansion': {
      const rule = expansion?.ruleId?.replaceAll('_', ' ') ?? 'Expansion';
      const source = expansion?.sourceId ? numbers.get(expansion.sourceId) : '?';

      return `${rule} · source ${source}`;
    }
  }
}

/** Number terminal paths left to right; shared trunks are segments, not additional paths. */
export function terminalBranchNumbers(structure: {
  branchOrder: readonly string[];
  branches: ReadonlyMap<string, TruthTreeBranch>;
}): Map<string, number> {
  const leaves = structure.branchOrder.filter(
    (id) => structure.branches.get(id)!.ending.kind !== 'split',
  );
  return new Map(leaves.map((id, index) => [id, index + 1]));
}

export function branchEndingLabel(
  ending: TruthTreeBranch['ending'],
  numbers: ReadonlyMap<string, number>,
): string {
  switch (ending.kind) {
    case 'open':
      return 'Open';
    case 'split':
      return 'Splits into two branches.';
    case 'closed': {
      const closure = ending.closure;

      if (!closure) return 'Closed · witnesses missing';

      if (closure.kind === 'complement') {
        const witnesses = closure.occurrenceIds.map((id) => numbers.get(id)).join(', ');

        return `Closed · ${witnesses}`;
      }

      return `Closed · ${numbers.get(closure.occurrenceId)}`;
    }
  }
}
