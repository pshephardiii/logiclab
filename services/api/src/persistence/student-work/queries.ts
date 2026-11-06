import type { DatabaseManager } from '../transactions';
import { assignmentLearningCapabilities } from '../../application/assignment/learning-policy';
import { StudentWorkError } from '../../application/student-work/errors';
import { policyFor } from './validation';

// Use the caller's manager to retain assignment/enrollment locks through the operation.
export async function enrolled(
  em: DatabaseManager,
  studentId: string,
  classId: string,
  lock = false,
) {
  const { Enrollment, LockMode } = await import('@logiclab/db');

  const enrollment = await em.findOne(
    Enrollment,
    { student: studentId, classroom: classId },
    lock ? { lockMode: LockMode.PESSIMISTIC_READ } : {},
  );

  if (!enrollment) throw new StudentWorkError('not_found');
}

export async function accessible(em: DatabaseManager, studentId: string, assignmentId: string) {
  const { Assignment, LockMode } = await import('@logiclab/db');

  const assignment = await em.findOne(
    Assignment,
    { id: assignmentId },
    { lockMode: LockMode.PESSIMISTIC_READ },
  );

  if (!assignment || !assignment.publishedAt || assignment.archivedAt)
    throw new StudentWorkError('not_found');

  await enrolled(em, studentId, assignment.classroom.id, true);

  policyFor(assignment);
  return assignment;
}

export async function submittableAssignment(
  em: DatabaseManager,
  studentId: string,
  assignmentId: string,
) {
  const assignment = await accessible(em, studentId, assignmentId);

  if (!assignmentLearningCapabilities(policyFor(assignment)).hasFinalSubmission)
    throw new StudentWorkError('submission_unavailable');

  return assignment;
}

export async function items(em: DatabaseManager, assignmentId: string) {
  const { AssignmentItem } = await import('@logiclab/db');

  return em.find(
    AssignmentItem,
    { assignment: assignmentId },
    { orderBy: { position: 'ASC' }, populate: ['problemVersion'] },
  );
}

export async function lockedAttempt(em: DatabaseManager, studentId: string, assignmentId: string) {
  const { AssignmentAttempt, Assignment, User, LockMode } = await import('@logiclab/db');

  await em.upsert(
    AssignmentAttempt,
    {
      assignment: em.getReference(Assignment, assignmentId),
      student: em.getReference(User, studentId),
    },
    { onConflictFields: ['assignment', 'student'], onConflictAction: 'ignore' },
  );

  // Refresh after any conflicting transaction finishes; never reuse a stale upsert identity-map row.
  return em.findOneOrFail(
    AssignmentAttempt,
    { assignment: assignmentId, student: studentId },
    { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
  );
}
