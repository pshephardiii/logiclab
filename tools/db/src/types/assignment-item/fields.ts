import type { Assignment } from '../../entities/Assignment.ts';
import type { ProblemVersion } from '../../entities/ProblemVersion.ts';

/** Readable field reference checked against the decorated AssignmentItem entity. */
export interface AssignmentItemFields {
  id: string;
  assignment: Assignment;
  problemVersion: ProblemVersion;
  position: number;
}
