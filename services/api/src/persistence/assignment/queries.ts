import type { Assignment as AssignmentEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { AssignmentDetail } from '@logiclab/contracts';
import type { DatabaseManager } from '../transactions';
import { AssignmentOperationError } from '../../application/assignment/errors';
import { assignmentAdmissionDefinition } from '../../application/assignment/definition-support';
import { assignmentDetail } from './detail-response';

// Use the caller's manager so ownership checks and locks stay in the operation's transaction.
export async function ownedClass(em: DatabaseManager, ownerId: string, classId: string) {
  const { Classroom } = await import('@logiclab/db');
  const classroom = await em.findOne(Classroom, { id: classId, owner: ownerId });

  if (!classroom) throw new AssignmentOperationError('not_found');

  return classroom;
}

export async function ownedAssignment(
  em: DatabaseManager,
  ownerId: string,
  id: string,
  lock = false,
) {
  const { Assignment, LockMode } = await import('@logiclab/db');

  const assignment = await em.findOne(
    Assignment,
    { id, classroom: { owner: ownerId } },
    lock ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {},
  );

  if (!assignment) throw new AssignmentOperationError('not_found');

  return assignment;
}

export async function ownedVersions(
  em: DatabaseManager,
  ownerId: string,
  ids: string[],
  policy: Pick<AssignmentEntity, 'assessmentMode' | 'feedbackTiming'>,
) {
  const { ProblemVersion } = await import('@logiclab/db');
  const uniqueIds = [...new Set(ids)];

  const versions = await em.find(ProblemVersion, {
    id: { $in: uniqueIds },
    problem: { owner: ownerId },
  });

  if (versions.length !== uniqueIds.length) throw new AssignmentOperationError('version_not_found');

  versions.forEach((version) => assignmentAdmissionDefinition(version.definition, policy));
  return new Map(versions.map((version) => [version.id, version]));
}

export async function detail(
  em: DatabaseManager,
  assignment: AssignmentEntity,
): Promise<AssignmentDetail> {
  const { AssignmentItem } = await import('@logiclab/db');

  const items = await em.find(
    AssignmentItem,
    { assignment: assignment.id },
    { orderBy: { position: 'ASC' }, populate: ['problemVersion.problem'] },
  );

  return assignmentDetail(assignment, items);
}
