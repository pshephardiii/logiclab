import { parseProofFormulaWithSyntax } from '@logiclab/logic-engine/proof';
import { FORMULA_GROUPING_POLICY_VERSION } from '@logiclab/contracts/formula-policy-values';
import {
  parseFormulaWithSyntax,
  requireExplicitGrouping,
  FormulaParseError,
} from '@logiclab/logic-engine';
import { ProblemType } from '@logiclab/contracts/problem-type';
import { assertProofFormatAvailable } from '../proof/availability';
import { DerivationPublicationError } from './derivation/errors';
import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import { validateObjectiveDefinition } from './definition-support';
import { validateFitchDefinition, checkFitchReference } from './derivation/fitch/authoring';
import {
  validateDependencyDefinition,
  checkDependencyReference,
} from './derivation/dependency/authoring';
import type { DerivationReferenceCheck } from './derivation/reference-check';
import type { TruthTreeReferenceCheck } from '@logiclab/contracts/truth-tree-authoring';
import {
  validateTruthTreeDefinition,
  checkTruthTreeReference,
  truthTreePublicationDefinition,
} from './truth-tree/authoring';
import {
  validateNaturalDeductionTreeDefinition,
  checkNaturalDeductionTreeReference,
} from './derivation/natural-deduction-tree/authoring';

/** Private library validation; this is deliberately not an assignment-admission helper. */
export function libraryProblemDefinition(value: unknown): LibraryProblemDefinition {
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === ProblemType.TruthTree
  )
    return validateTruthTreeDefinition(value);

  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === ProblemType.Derivation
  ) {
    if ('format' in value && value.format === 'tree')
      return validateNaturalDeductionTreeDefinition(value);

    return 'format' in value && value.format === 'dependency'
      ? validateDependencyDefinition(value)
      : validateFitchDefinition(value);
  }

  return validateObjectiveDefinition(value);
}

/** New owner work uses availability policy; historical validation above remains format-complete. */
export function editableLibraryDefinition(value: unknown): LibraryProblemDefinition {
  const definition = libraryProblemDefinition(value);
  if (definition.type === ProblemType.Derivation) assertProofFormatAvailable(definition.format);
  return definition;
}

/** New/replaced table content and newly published snapshots pin explicit grouping on the server. */
export function authoringDefinition(value: unknown): LibraryProblemDefinition {
  const definition = editableLibraryDefinition(value);
  if (definition.type === ProblemType.TruthTable) {
    requireExplicitGrouping(parseFormulaWithSyntax(definition.formula));
    return { ...definition, formulaGroupingVersion: FORMULA_GROUPING_POLICY_VERSION };
  }

  if (definition.type === ProblemType.Derivation || definition.type === ProblemType.TruthTree) {
    for (const formula of [
      ...definition.premises.map((premise) => premise.formula),
      definition.conclusion,
    ]) {
      try {
        requireExplicitGrouping(parseProofFormulaWithSyntax(formula));
      } catch (error) {
        // Incomplete/malformed drafts remain saveable; publication/checking diagnoses them.
        if (!(error instanceof FormulaParseError) || error.code === 'GROUPING_REQUIRED')
          throw error;
      }
    }
    return { ...definition, formulaGroupingVersion: FORMULA_GROUPING_POLICY_VERSION };
  }

  return definition;
}

/** Check the authoritative saved definition with its own format's checker. */
export function libraryReferenceCheck(
  definition: Extract<LibraryProblemDefinition, { type: typeof ProblemType.Derivation }>,
): DerivationReferenceCheck;
export function libraryReferenceCheck(
  definition: Extract<LibraryProblemDefinition, { type: typeof ProblemType.TruthTree }>,
): TruthTreeReferenceCheck;
export function libraryReferenceCheck(
  definition: Extract<
    LibraryProblemDefinition,
    { type: typeof ProblemType.Derivation | typeof ProblemType.TruthTree }
  >,
): DerivationReferenceCheck | TruthTreeReferenceCheck;
export function libraryReferenceCheck(
  definition: Extract<
    LibraryProblemDefinition,
    { type: typeof ProblemType.Derivation | typeof ProblemType.TruthTree }
  >,
): DerivationReferenceCheck | TruthTreeReferenceCheck {
  if (definition.type === ProblemType.TruthTree) return checkTruthTreeReference(definition);

  if (definition.format === 'tree') return checkNaturalDeductionTreeReference(definition);

  return definition.format === 'dependency'
    ? checkDependencyReference(definition)
    : checkFitchReference(definition);
}

/** Call under the saved problem's lock immediately before creating its immutable snapshot. */
export function publicationDefinition(value: unknown): LibraryProblemDefinition {
  const definition = authoringDefinition(value);

  if (definition.type === ProblemType.TruthTree) return truthTreePublicationDefinition(definition);

  if (definition.type === ProblemType.Derivation) {
    const check = libraryReferenceCheck(definition);

    if (check.status === 'missing') throw new DerivationPublicationError('missing_reference');

    if (check.report.status !== 'accepted')
      throw new DerivationPublicationError('rejected_reference');
  }

  return definition;
}
