import type { DatabaseManager } from '../transactions';
import { AssignmentOperationError } from '../../application/assignment/errors';

export async function ownedReviewAssignment(em: DatabaseManager, ownerId: string, id: string) {
  const { Assignment } = await import('@logiclab/db');
  const assignment = await em.findOne(Assignment, { id, classroom: { owner: ownerId } });
  if (!assignment || assignment.assessmentMode === 'ungraded_practice')
    throw new AssignmentOperationError('not_found');
  return assignment;
}
