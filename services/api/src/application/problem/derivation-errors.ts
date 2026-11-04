export class DerivationAuthoringError extends Error {
  constructor(readonly code: 'invalid_definition' | 'unknown_rule' | 'reference_unavailable') {
    super('Derivation authoring data is invalid or its reference is unavailable.');
  }
}

export class DerivationPublicationError extends Error {
  constructor(readonly code: 'missing_reference' | 'rejected_reference') {
    super('Derivation publication requires an accepted reference proof.');
  }
}
