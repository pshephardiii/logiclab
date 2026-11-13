import {
  naturalDeductionTreeDerivationContentSchema,
  naturalDeductionTreeDerivationDefinitionSchema,
  naturalDeductionTreeDerivationSolutionSchema,
  type NaturalDeductionTreeDerivationContent,
  type NaturalDeductionTreeDerivationDefinition,
  type NaturalDeductionTreeDerivationSolution,
} from '@logiclab/contracts/natural-deduction-tree-derivation';
import { checkNaturalDeductionTreeProof } from '@logiclab/logic-engine/proof';
import { assertDerivationConfiguration } from '../configuration';
import { DerivationAuthoringError, DerivationPublicationError } from '../errors';
import type { DerivationReferenceCheck } from '../reference-check';

export function validateNaturalDeductionTreeContent(
  value: unknown,
): NaturalDeductionTreeDerivationContent {
  const parsed = naturalDeductionTreeDerivationContentSchema.safeParse(value);

  if (!parsed.success) throw new DerivationAuthoringError('invalid_definition');

  assertDerivationConfiguration(parsed.data);
  return parsed.data;
}

/** Retain incomplete draft work without treating transport validation as certification. */
export function validateNaturalDeductionTreeDefinition(
  value: unknown,
): NaturalDeductionTreeDerivationDefinition {
  const parsed = naturalDeductionTreeDerivationDefinitionSchema.safeParse(value);

  if (!parsed.success) throw new DerivationAuthoringError('invalid_definition');

  assertDerivationConfiguration(parsed.data);
  return parsed.data;
}

/** Always check the exact statement, permitted rules and reference, never a cached acceptance. */
export function checkNaturalDeductionTreeReference(value: unknown): DerivationReferenceCheck {
  const definition = validateNaturalDeductionTreeDefinition(value);

  if (definition.referenceProof === null) return { status: 'missing' };

  return {
    status: 'checked',
    report: checkNaturalDeductionTreeProof({
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

/** Certification helper; publication must recheck under the saved problem lock before snapshotting. */
export function naturalDeductionTreePublicationDefinition(
  value: unknown,
): NaturalDeductionTreeDerivationDefinition {
  const definition = validateNaturalDeductionTreeDefinition(value);
  const check = checkNaturalDeductionTreeReference(definition);

  if (check.status === 'missing') throw new DerivationPublicationError('missing_reference');

  if (check.report.status !== 'accepted')
    throw new DerivationPublicationError('rejected_reference');

  return definition;
}

/** Ordinary statement content never includes the private reference or instructor explanation. */
export function naturalDeductionTreeContent(value: unknown): NaturalDeductionTreeDerivationContent {
  const definition = validateNaturalDeductionTreeDefinition(value);

  return naturalDeductionTreeDerivationContentSchema.parse({
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
export function naturalDeductionTreeReferenceSolution(
  value: unknown,
): NaturalDeductionTreeDerivationSolution {
  const definition = validateNaturalDeductionTreeDefinition(value);
  const check = checkNaturalDeductionTreeReference(definition);

  if (check.status !== 'checked' || check.report.status !== 'accepted')
    throw new DerivationAuthoringError('reference_unavailable');

  return naturalDeductionTreeDerivationSolutionSchema.parse({
    type: definition.type,
    definitionVersion: definition.definitionVersion,
    format: definition.format,
    ruleCatalogVersion: definition.ruleCatalogVersion,
    checkerVersion: definition.checkerVersion,
    referenceProof: definition.referenceProof,
    explanation: definition.explanation ?? null,
  });
}
