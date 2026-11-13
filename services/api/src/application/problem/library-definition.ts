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
import { validateTreeDefinition, checkTreeReference } from './derivation/tree/authoring';

/** Private library validation; this is deliberately not an assignment-admission helper. */
export function libraryProblemDefinition(value: unknown): LibraryProblemDefinition {
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'derivation'
  ) {
    if ('format' in value && value.format === 'tree') return validateTreeDefinition(value);

    return 'format' in value && value.format === 'dependency'
      ? validateDependencyDefinition(value)
      : validateFitchDefinition(value);
  }

  return validateObjectiveDefinition(value);
}

/** New owner work uses availability policy; historical validation above remains format-complete. */
export function authoringDefinition(value: unknown): LibraryProblemDefinition {
  const definition = libraryProblemDefinition(value);
  if (definition.type === 'derivation') assertProofFormatAvailable(definition.format);
  return definition;
}

/** Check the authoritative saved definition with its own format's checker. */
export function libraryReferenceCheck(
  definition: Extract<LibraryProblemDefinition, { type: 'derivation' }>,
): DerivationReferenceCheck {
  if (definition.format === 'tree') return checkTreeReference(definition);

  return definition.format === 'dependency'
    ? checkDependencyReference(definition)
    : checkFitchReference(definition);
}

/** Call under the saved problem's lock immediately before creating its immutable snapshot. */
export function publicationDefinition(value: unknown): LibraryProblemDefinition {
  const definition = authoringDefinition(value);

  if (definition.type === 'derivation') {
    const check = libraryReferenceCheck(definition);

    if (check.status === 'missing') throw new DerivationPublicationError('missing_reference');

    if (check.report.status !== 'accepted')
      throw new DerivationPublicationError('rejected_reference');
  }

  return definition;
}
