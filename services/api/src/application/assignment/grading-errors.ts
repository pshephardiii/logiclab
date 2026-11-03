export type SubmissionGradingFailure =
  'not_found' | 'archived' | 'grading_unavailable' | 'revision_conflict' | 'invalid_grading';

/** Staged grading failures; transport mapping belongs to the later route slice. */
export class SubmissionGradingError extends Error {
  constructor(public readonly reason: SubmissionGradingFailure) {
    super(reason);
    this.name = 'SubmissionGradingError';
  }
}
