export type AssignmentFailure =
  'not_found' | 'version_not_found' | 'published' | 'archived' | 'empty';

/** Domain failures are mapped to transport responses by the assignment routes. */
export class AssignmentOperationError extends Error {
  constructor(public readonly reason: AssignmentFailure) {
    super(reason);
  }
}
