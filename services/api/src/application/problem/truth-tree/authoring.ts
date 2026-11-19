import {
  truthTreeContentSchema,
  truthTreeDefinitionSchema,
  truthTreeSolutionSchema,
  type TruthTreeContent,
  type TruthTreeDefinition,
  type TruthTreeSolution,
  type TruthTreeReferenceCheck,
} from '@logiclab/contracts/truth-tree-authoring';
import { checkTruthTree, isFinishedTruthTreeAttempt } from '@logiclab/logic-engine/truth-tree';
import { TruthTreeAuthoringError, TruthTreePublicationError } from './errors';

/** Retain unfinished statements/references without treating draft shape validation as certification. */
export function validateTruthTreeDefinition(value: unknown): TruthTreeDefinition {
  const parsed = truthTreeDefinitionSchema.safeParse(value);

  if (!parsed.success) throw new TruthTreeAuthoringError('invalid_definition');

  return parsed.data;
}

export function validateTruthTreeContent(value: unknown): TruthTreeContent {
  const parsed = truthTreeContentSchema.safeParse(value);

  if (!parsed.success) throw new TruthTreeAuthoringError('invalid_definition');

  return parsed.data;
}

/** Recompute using this exact saved argument and reference, never a client/cached verdict. */
export function checkTruthTreeReference(value: unknown): TruthTreeReferenceCheck {
  const definition = validateTruthTreeDefinition(value);

  if (definition.referenceTree === null) return { status: 'missing' };

  return {
    status: 'checked',
    report: checkTruthTree({
      problem: {
        ruleCatalogVersion: definition.ruleCatalogVersion,
        premises: definition.premises,
        conclusion: definition.conclusion,
      },
      tree: definition.referenceTree,
    }),
  };
}

/** Publication callers must recheck the locked saved definition immediately before snapshotting. */
export function truthTreePublicationDefinition(value: unknown): TruthTreeDefinition {
  const definition = validateTruthTreeDefinition(value);
  const check = checkTruthTreeReference(definition);

  if (check.status === 'missing') throw new TruthTreePublicationError('missing_reference');

  if (check.report.status !== 'verified') throw new TruthTreePublicationError('rejected_reference');

  return definition;
}

/** Completion students must finish every path, so their pinned reference must do the same. */
export function hasFinishedTruthTreeReference(value: unknown): boolean {
  const definition = validateTruthTreeDefinition(value);
  const check = checkTruthTreeReference(definition);

  return (
    check.status === 'checked' &&
    check.report.status === 'verified' &&
    isFinishedTruthTreeAttempt({
      problem: {
        ruleCatalogVersion: definition.ruleCatalogVersion,
        premises: definition.premises,
        conclusion: definition.conclusion,
      },
      tree: definition.referenceTree,
    })
  );
}

/** Explicit public projection: no reference, explanation, computed verdict or counterexample. */
export function truthTreeContent(value: unknown): TruthTreeContent {
  const definition = validateTruthTreeDefinition(value);

  return truthTreeContentSchema.parse({
    type: definition.type,
    definitionVersion: definition.definitionVersion,
    checkerVersion: definition.checkerVersion,
    ruleCatalogVersion: definition.ruleCatalogVersion,
    premises: definition.premises,
    conclusion: definition.conclusion,
  });
}

/** Requires fresh verification; the caller must separately authorize independent answer reveal. */
export function truthTreeReferenceSolution(value: unknown): TruthTreeSolution {
  const definition = validateTruthTreeDefinition(value);
  const check = checkTruthTreeReference(definition);

  if (check.status !== 'checked' || check.report.status !== 'verified')
    throw new TruthTreeAuthoringError('reference_unavailable');

  return truthTreeSolutionSchema.parse({
    type: definition.type,
    definitionVersion: definition.definitionVersion,
    checkerVersion: definition.checkerVersion,
    ruleCatalogVersion: definition.ruleCatalogVersion,
    referenceTree: definition.referenceTree,
    argumentStatus: check.report.argumentStatus,
    counterexample: check.report.counterexample,
    explanation: definition.explanation ?? null,
  });
}
