import type { Assignment } from '../../entities/Assignment.js';
import type { ProblemVersion } from '../../entities/ProblemVersion.js';

/** Readable field reference checked against the decorated AssignmentItem entity. */
export interface AssignmentItemFields {
  id: string;
  assignment: Assignment;
  problemVersion: ProblemVersion;
  position: number;
}
