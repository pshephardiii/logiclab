export type StudentWorkFailure =
  | 'incomplete_work'
  | 'submission_unavailable'
  | 'check_locked'
  | 'not_found'
  | 'revision_conflict'
  | 'submitted'
  | 'solution_locked'
  | 'invalid_answer'
  | 'invalid_cell'
  | 'duplicate_cell'
  | 'unsupported_policy';

export class StudentWorkError extends Error {
  constructor(public readonly reason: StudentWorkFailure) {
    super(reason);
  }
}
