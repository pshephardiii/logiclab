import type { Assignment, AssignmentItem } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { AssignmentDetail } from '@logiclab/contracts';
import { readableAssignmentDefinition } from '../../application/assignment/definition-support';
import { libraryProblemVersion } from '../problem/version-response';
import { assignmentSummary } from './summary';

/** Owner-only projection. Caller must authorize and load the ordered pinned versions. */
export function assignmentDetail(
  assignment: Assignment,
  items: AssignmentItem[],
): AssignmentDetail {
  items.forEach((item) => readableAssignmentDefinition(item.problemVersion.definition, assignment));
  return {
    ...assignmentSummary(assignment),
    items: items.map((item) => ({
      id: item.id,
      position: item.position,
      maxPoints: item.maxPoints,
      problemVersion: libraryProblemVersion(item.problemVersion),
    })),
  };
}
