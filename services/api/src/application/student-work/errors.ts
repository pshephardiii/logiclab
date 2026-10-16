export type StudentWorkFailure =
  | 'not_found'
  | 'revision_conflict'
  | 'submitted'
  | 'solution_locked'
  | 'invalid_cell'
  | 'duplicate_cell'
  | 'unsupported_policy';

export class StudentWorkError extends Error {
  constructor(public readonly reason: StudentWorkFailure) {
    super(reason);
  }
}
