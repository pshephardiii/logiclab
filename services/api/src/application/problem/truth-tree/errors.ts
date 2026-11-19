export class TruthTreeAuthoringError extends Error {
  constructor(readonly code: 'invalid_definition' | 'reference_unavailable') {
    super('Truth-tree authoring data is invalid or its reference is unavailable.');
  }
}

export class TruthTreePublicationError extends Error {
  constructor(readonly code: 'missing_reference' | 'rejected_reference') {
    super('Truth-tree publication requires a verified reference tree.');
  }
}
