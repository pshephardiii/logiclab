import {
  TRUTH_TREE_LIMITS,
  truthTreeProblemSchema,
  type TruthTreeDiagnostic,
} from '@logiclab/contracts/truth-tree';
import { FormulaParseError } from '../parser/errors';
import { analyzeTruthTreeStructure } from './structure';
import {
  TruthTreeResourceLimit,
  type TruthTreeBudget,
  type TruthTreeStructure,
} from './structure-context';
import { parseArgument } from './step-formulas';

type ReadResult =
  | {
      status: 'ready';
      argument: NonNullable<ReturnType<typeof parseArgument>>;
      structure: TruthTreeStructure;
    }
  | { status: 'unassessable' | 'invalid' | 'incomplete'; diagnostics: TruthTreeDiagnostic[] };

function failed(
  status: 'unassessable' | 'invalid' | 'incomplete',
  diagnostics: TruthTreeDiagnostic[],
): ReadResult {
  return { status, diagnostics };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Shared bounded argument/structure preparation; no student formula or rule correctness checks. */
export function readTruthTreeInput(input: unknown, budget: TruthTreeBudget): ReadResult {
  if (
    !record(input) ||
    Object.keys(input).length !== 2 ||
    !Object.hasOwn(input, 'problem') ||
    !Object.hasOwn(input, 'tree')
  )
    return failed('unassessable', [
      {
        code: 'INVALID_STRUCTURE',
        message: 'Provide exactly an authoritative problem and a submitted tree.',
      },
    ]);

  // Bound argument data before contract parsing; the structural reader bounds the tree itself.
  if (record(input.problem)) {
    const { premises, conclusion, ruleCatalogVersion } = input.problem;
    if (ruleCatalogVersion !== 1)
      return failed('unassessable', [
        { code: 'UNSUPPORTED_VERSION', message: 'Unsupported truth-tree rule catalog.' },
      ]);
    if (
      (Array.isArray(premises) && premises.length > TRUTH_TREE_LIMITS.maxPremises) ||
      (typeof conclusion === 'string' && conclusion.length > TRUTH_TREE_LIMITS.maxFormulaLength) ||
      (Array.isArray(premises) &&
        premises.some(
          (premise) =>
            record(premise) &&
            typeof premise.formula === 'string' &&
            premise.formula.length > TRUTH_TREE_LIMITS.maxFormulaLength,
        ))
    )
      throw new TruthTreeResourceLimit('Truth-tree argument limit exceeded.');
  }
  const parsed = truthTreeProblemSchema.safeParse(input.problem);
  if (!parsed.success)
    return failed('unassessable', [
      {
        code: 'INVALID_PROBLEM',
        message: 'The supplied argument does not match the supported contract.',
      },
    ]);

  let argument;
  try {
    argument = parseArgument(parsed.data, budget);
  } catch (error) {
    if (!(error instanceof FormulaParseError)) throw error;
    return failed('unassessable', [
      { code: 'INVALID_PROBLEM', message: 'The supplied argument contains an invalid formula.' },
    ]);
  }
  if (!argument)
    return failed('unassessable', [
      { code: 'INVALID_PROBLEM', message: 'Supplied premise identities must be distinct.' },
    ]);

  const resolved = analyzeTruthTreeStructure(input.tree, budget);
  if (resolved.status !== 'resolved') return failed(resolved.status, resolved.diagnostics);

  return { status: 'ready', argument, structure: resolved.structure };
}
