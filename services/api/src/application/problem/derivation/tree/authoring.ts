import {
  treeDerivationContentSchema,
  treeDerivationDefinitionSchema,
  treeDerivationSolutionSchema,
  type TreeDerivationContent,
  type TreeDerivationDefinition,
  type TreeDerivationSolution,
} from '@logiclab/contracts/tree-derivation';
import { checkTreeProof } from '@logiclab/logic-engine/proof';
import { assertDerivationConfiguration } from '../configuration';
import { DerivationAuthoringError, DerivationPublicationError } from '../errors';
import type { DerivationReferenceCheck } from '../reference-check';

export function validateTreeContent(value: unknown): TreeDerivationContent {
  const parsed = treeDerivationContentSchema.safeParse(value);
  if (!parsed.success) throw new DerivationAuthoringError('invalid_definition');
  assertDerivationConfiguration(parsed.data);
  return parsed.data;
}

/** Retain incomplete draft work without treating transport validation as certification. */
export function validateTreeDefinition(value: unknown): TreeDerivationDefinition {
  const parsed = treeDerivationDefinitionSchema.safeParse(value);
  if (!parsed.success) throw new DerivationAuthoringError('invalid_definition');
  assertDerivationConfiguration(parsed.data);
  return parsed.data;
}

/** Always check the exact statement, permitted rules and reference, never a cached acceptance. */
export function checkTreeReference(value: unknown): DerivationReferenceCheck {
  const definition = validateTreeDefinition(value);
  if (definition.referenceProof === null) return { status: 'missing' };
  return {
    status: 'checked',
    report: checkTreeProof({
      problem: {
        ruleCatalogVersion: definition.ruleCatalogVersion,
        premises: definition.premises,
        conclusion: definition.conclusion,
        permittedRuleIds: definition.rules.map((rule) => rule.id),
      },
      proof: definition.referenceProof,
    }),
  };
}

/** Future persistence callers must invoke this under the saved problem lock before snapshotting. */
export function treePublicationDefinition(value: unknown): TreeDerivationDefinition {
  const definition = validateTreeDefinition(value);
  const check = checkTreeReference(definition);
  if (check.status === 'missing') throw new DerivationPublicationError('missing_reference');
  if (check.report.status !== 'accepted')
    throw new DerivationPublicationError('rejected_reference');
  return definition;
}

/** Ordinary statement content never includes the private reference or instructor explanation. */
export function treeContent(value: unknown): TreeDerivationContent {
  const definition = validateTreeDefinition(value);
  return treeDerivationContentSchema.parse({
    type: definition.type,
    definitionVersion: definition.definitionVersion,
    format: definition.format,
    ruleCatalogVersion: definition.ruleCatalogVersion,
    checkerVersion: definition.checkerVersion,
    premises: definition.premises,
    conclusion: definition.conclusion,
    rules: definition.rules,
  });
}

/** Requires acceptance, but does not itself grant answer-reveal authorization. */
export function treeReferenceSolution(value: unknown): TreeDerivationSolution {
  const definition = validateTreeDefinition(value);
  const check = checkTreeReference(definition);
  if (check.status !== 'checked' || check.report.status !== 'accepted')
    throw new DerivationAuthoringError('reference_unavailable');
  return treeDerivationSolutionSchema.parse({
    type: definition.type,
    definitionVersion: definition.definitionVersion,
    format: definition.format,
    ruleCatalogVersion: definition.ruleCatalogVersion,
    checkerVersion: definition.checkerVersion,
    referenceProof: definition.referenceProof,
    explanation: definition.explanation ?? null,
  });
}
