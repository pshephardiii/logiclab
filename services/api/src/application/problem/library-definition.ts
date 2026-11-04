import { DerivationPublicationError } from './derivation/errors';
import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import { supportedProblemDefinition } from './definition-support';
import { validateFitchDefinition, checkFitchReference } from './derivation/fitch/authoring';

/** Private library validation; this is deliberately not an assignment-admission helper. */
export function libraryProblemDefinition(value: unknown): LibraryProblemDefinition {
  return typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'derivation'
    ? validateFitchDefinition(value)
    : supportedProblemDefinition(value);
}

/** Call under the saved problem's lock immediately before creating its immutable snapshot. */
export function publicationDefinition(value: unknown): LibraryProblemDefinition {
  const definition = libraryProblemDefinition(value);
  if (definition.type === 'derivation') {
    const check = checkFitchReference(definition);
    if (check.status === 'missing') throw new DerivationPublicationError('missing_reference');
    if (check.report.status !== 'accepted')
      throw new DerivationPublicationError('rejected_reference');
  }
  return definition;
}
