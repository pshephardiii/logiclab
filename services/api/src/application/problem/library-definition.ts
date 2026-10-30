import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import { supportedProblemDefinition } from './definition-support';
import { validateDerivationDefinition, checkDerivationReference } from './derivation-authoring';

export class DerivationPublicationError extends Error {
  constructor(readonly code: 'missing_reference' | 'rejected_reference') {
    super('Derivation publication requires an accepted reference proof.');
  }
}

/** Private library validation; this is deliberately not an assignment-admission helper. */
export function libraryProblemDefinition(value: unknown): LibraryProblemDefinition {
  return typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'derivation'
    ? validateDerivationDefinition(value)
    : supportedProblemDefinition(value);
}

/** Call under the saved problem's lock immediately before creating its immutable snapshot. */
export function publicationDefinition(value: unknown): LibraryProblemDefinition {
  const definition = libraryProblemDefinition(value);
  if (definition.type === 'derivation') {
    const check = checkDerivationReference(definition);
    if (check.status === 'missing') throw new DerivationPublicationError('missing_reference');
    if (check.report.status !== 'accepted')
      throw new DerivationPublicationError('rejected_reference');
  }
  return definition;
}
