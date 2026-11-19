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

export function branchEndingLabel(
  ending: TruthTreeBranch['ending'],
  numbers: ReadonlyMap<string, number>,
  branchNumbers: ReadonlyMap<string, number>,
): string {
  switch (ending.kind) {
    case 'open':
      return 'Open';
    case 'split': {
      const children = ending.childBranchIds.map((id) => branchNumbers.get(id)).join(' and ');

      return `Splits into branches ${children}.`;
    }
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
