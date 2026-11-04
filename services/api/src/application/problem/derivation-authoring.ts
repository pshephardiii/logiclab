import { DerivationAuthoringError } from './derivation-errors';
import { assertDerivationConfiguration } from './derivation-configuration';
import type { ProofCheckReport } from '@logiclab/contracts';
import {
  derivationDefinitionSchema,
  derivationContentSchema,
  derivationSolutionSchema,
  type DerivationDefinition,
  type DerivationContent,
  type DerivationSolution,
} from '@logiclab/contracts/derivation';
import { checkProof } from '@logiclab/logic-engine/proof';

/** Validate public statement/configuration without admitting private reference fields. */
export function validateDerivationContent(value: unknown): DerivationContent {
  const parsed = derivationContentSchema.safeParse(value);
  if (!parsed.success) throw new DerivationAuthoringError('invalid_definition');
  assertDerivationConfiguration(parsed.data);
  return parsed.data;
}

/** Validate declarative configuration while retaining incomplete formulas/reference work. */
export function validateDerivationDefinition(value: unknown): DerivationDefinition {
  const parsed = derivationDefinitionSchema.safeParse(value);
  if (!parsed.success) throw new DerivationAuthoringError('invalid_definition');
  const { referenceProof: _reference, explanation: _explanation, ...content } = parsed.data;
  validateDerivationContent(content);
  return parsed.data;
}

export type DerivationReferenceCheck =
  { status: 'missing' } | { status: 'checked'; report: ProofCheckReport };

/** Recompute against the current saved statement/rules; never accept a client validation flag. */
export function checkDerivationReference(value: unknown): DerivationReferenceCheck {
  const definition = validateDerivationDefinition(value);
  if (definition.referenceProof === null) return { status: 'missing' };
  return {
    status: 'checked',
    report: checkProof({
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

/** Whitelist only ordinary content, even when given a private instructor definition. */
export function derivationContent(value: unknown): DerivationContent {
  const definition = validateDerivationDefinition(value);
  return derivationContentSchema.parse({
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

/** Caller must authorize answer reveal; this helper does not grant access or release grades. */
export function derivationReferenceSolution(value: unknown): DerivationSolution {
  const definition = validateDerivationDefinition(value);
  const check = checkDerivationReference(definition);
  if (check.status !== 'checked' || check.report.status !== 'accepted')
    throw new DerivationAuthoringError('reference_unavailable');
  return derivationSolutionSchema.parse({
    type: definition.type,
    definitionVersion: definition.definitionVersion,
    format: definition.format,
    ruleCatalogVersion: definition.ruleCatalogVersion,
    checkerVersion: definition.checkerVersion,
    referenceProof: definition.referenceProof,
    explanation: definition.explanation ?? null,
  });
}
