import { TRUTH_TREE_LIMITS, truthTreeSchema } from '@logiclab/contracts/truth-tree';
import { TruthTreeResourceLimit } from './structure-context';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundArray(value: unknown, maximum: number) {
  if (Array.isArray(value) && value.length > maximum)
    throw new TruthTreeResourceLimit('Truth-tree list limit exceeded.');
}

/** Bound known collections before Zod walks their elements; malformed shapes still use safeParse. */
export function readTruthTree(input: unknown) {
  if (record(input)) {
    boundArray(input.occurrences, TRUTH_TREE_LIMITS.maxOccurrences);
    boundArray(input.branches, TRUTH_TREE_LIMITS.maxBranches);
    boundArray(input.expansions, TRUTH_TREE_LIMITS.maxExpansions);

    if (Array.isArray(input.occurrences)) {
      for (const occurrence of input.occurrences) {
        if (
          record(occurrence) &&
          typeof occurrence.formula === 'string' &&
          occurrence.formula.length > TRUTH_TREE_LIMITS.maxFormulaLength
        )
          throw new TruthTreeResourceLimit('Truth-tree formula text limit exceeded.');
      }
    }

    let memberships = 0;

    if (Array.isArray(input.branches)) {
      for (const branch of input.branches) {
        if (!record(branch)) continue;

        boundArray(branch.occurrenceIds, TRUTH_TREE_LIMITS.maxOccurrences);
        if (Array.isArray(branch.occurrenceIds)) memberships += branch.occurrenceIds.length;
        if (record(branch.ending)) {
          boundArray(branch.ending.childBranchIds, 2);
          if (record(branch.ending.closure)) boundArray(branch.ending.closure.occurrenceIds, 2);
        }
      }
    }

    if (memberships > TRUTH_TREE_LIMITS.maxOccurrences)
      throw new TruthTreeResourceLimit('Truth-tree membership limit exceeded.');

    if (Array.isArray(input.expansions)) {
      for (const expansion of input.expansions) {
        if (!record(expansion)) continue;

        boundArray(expansion.resultGroups, 2);
        if (Array.isArray(expansion.resultGroups)) {
          for (const group of expansion.resultGroups) {
            if (record(group)) boundArray(group.occurrenceIds, 2);
          }
        }
      }
    }
  }

  return truthTreeSchema.safeParse(input);
}
