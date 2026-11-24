import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import type { TruthTreeDiagnostic } from '@logiclab/contracts/truth-tree';
import { readTruthTree } from './structure-input';
import {
  structureDiagnostics,
  truthTreeBudget,
  TruthTreeResourceLimit,
  type TruthTreeBudget,
  type TruthTreeStructure,
  type StructureContext,
} from './structure-context';
import {
  indexTruthTree,
  resolveTruthTreeBranches,
  resolveTruthTreeOccurrences,
} from './structure-branches';
import { resolveTruthTreeExpansions, resolveTruthTreeClosures } from './structure-expansions';

export type TruthTreeStructureResult =
  | { status: 'invalid' | 'incomplete' | 'unassessable'; diagnostics: TruthTreeDiagnostic[] }
  | { status: 'resolved'; diagnostics: []; structure: TruthTreeStructure };

/** Resolve structure only. No formula parsing, rule matching, closure truth or argument verdict. */
export function analyzeTruthTreeStructure(
  input: unknown,
  budget: TruthTreeBudget = truthTreeBudget(),
): TruthTreeStructureResult {
  try {
    budget.spend();
    const parsed = readTruthTree(input);

    if (!parsed.success) {
      const unsupported =
        input !== null &&
        typeof input === 'object' &&
        (('treeVersion' in input && input.treeVersion !== 1 && input.treeVersion !== 2) ||
          ('format' in input && input.format !== 'truth_tree'));
      return {
        status: 'unassessable',
        diagnostics: [
          {
            code: unsupported
              ? CheckerDiagnosticCode.UnsupportedVersion
              : CheckerDiagnosticCode.InvalidStructure,
            message: unsupported
              ? 'Unsupported truth-tree format or version.'
              : 'Truth-tree input does not match the bounded transport contract.',
          },
        ],
      };
    }

    const diagnostics = structureDiagnostics();
    const context: StructureContext = {
      tree: parsed.data,
      branches: new Map(),
      occurrences: new Map(),
      expansions: new Map(),
      locations: new Map(),
      paths: new Map(),
      branchOrder: [],
      budget,
      diagnostics,
    };

    // Do not resolve citations against ambiguous identities or unsafe branch graphs.
    indexTruthTree(context);
    if (!diagnostics.invalid) resolveTruthTreeBranches(context);
    if (
      !diagnostics.invalid &&
      context.paths.size === context.branches.size &&
      context.tree.rootBranchId !== null
    ) {
      resolveTruthTreeOccurrences(context);
      if (!diagnostics.invalid) {
        resolveTruthTreeExpansions(context);
        resolveTruthTreeClosures(context);
      }
    }

    if (diagnostics.items.length)
      return {
        status: diagnostics.invalid ? 'invalid' : 'incomplete',
        diagnostics: diagnostics.items,
      };

    const { tree, branches, occurrences, expansions, locations, paths, branchOrder } = context;
    return {
      status: 'resolved',
      diagnostics: [],
      structure: { tree, branches, occurrences, expansions, locations, paths, branchOrder },
    };
  } catch (error) {
    if (!(error instanceof TruthTreeResourceLimit)) throw error;

    return {
      status: 'unassessable',
      diagnostics: [{ code: CheckerDiagnosticCode.ResourceLimit, message: error.message }],
    };
  }
}
