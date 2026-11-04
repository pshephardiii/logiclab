import {
  dependencyDerivationContentSchema,
  dependencyDerivationDefinitionSchema,
  dependencyDerivationSolutionSchema,
  type DependencyDerivationContent,
  type DependencyDerivationDefinition,
  type DependencyDerivationSolution,
} from '@logiclab/contracts/dependency-derivation';
import { checkDependencyProof } from '@logiclab/logic-engine/proof';
import { assertDerivationConfiguration } from '../configuration';
import { DerivationAuthoringError, DerivationPublicationError } from '../errors';
import type { DerivationReferenceCheck } from '../reference-check';

export function validateDependencyContent(value: unknown): DependencyDerivationContent {
  const parsed = dependencyDerivationContentSchema.safeParse(value);
  if (!parsed.success) throw new DerivationAuthoringError('invalid_definition');
  assertDerivationConfiguration(parsed.data);
  return parsed.data;
}

/** Retain unfinished drafts without treating schema validation as proof certification. */
export function validateDependencyDefinition(value: unknown): DependencyDerivationDefinition {
  const parsed = dependencyDerivationDefinitionSchema.safeParse(value);
  if (!parsed.success) throw new DerivationAuthoringError('invalid_definition');
  assertDerivationConfiguration(parsed.data);
  return parsed.data;
}

/** Check the exact supplied authoritative definition, never a cached flag or a Fitch conversion. */
export function checkDependencyReference(value: unknown): DerivationReferenceCheck {
  const definition = validateDependencyDefinition(value);
  if (definition.referenceProof === null) return { status: 'missing' };
  return {
    status: 'checked',
    report: checkDependencyProof({
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

/** Persistence must call this under the saved problem lock before constructing a publication. */
export function dependencyPublicationDefinition(value: unknown): DependencyDerivationDefinition {
  const definition = validateDependencyDefinition(value);
  const check = checkDependencyReference(definition);
  if (check.status === 'missing') throw new DerivationPublicationError('missing_reference');
  if (check.report.status !== 'accepted')
    throw new DerivationPublicationError('rejected_reference');
  return definition;
}

/** Explicit ordinary-content projection excludes the private reference and explanation. */
export function dependencyContent(value: unknown): DependencyDerivationContent {
  const definition = validateDependencyDefinition(value);
  return dependencyDerivationContentSchema.parse({
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

/** Caller owns answer-reveal authorization; an accepted reference is also required here. */
export function dependencyReferenceSolution(value: unknown): DependencyDerivationSolution {
  const definition = validateDependencyDefinition(value);
  const check = checkDependencyReference(definition);
  if (check.status !== 'checked' || check.report.status !== 'accepted')
    throw new DerivationAuthoringError('reference_unavailable');
  return dependencyDerivationSolutionSchema.parse({
    type: definition.type,
    definitionVersion: definition.definitionVersion,
    format: definition.format,
    ruleCatalogVersion: definition.ruleCatalogVersion,
    checkerVersion: definition.checkerVersion,
    referenceProof: definition.referenceProof,
    explanation: definition.explanation ?? null,
  });
}
