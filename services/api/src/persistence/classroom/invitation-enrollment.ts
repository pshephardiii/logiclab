import type { Classroom as ClassroomEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { DatabaseManager } from '../transactions';

// Caller owns the transaction and retains the invitation lock through enrollment.
export async function lockInvitedClassroom(em: DatabaseManager, hash: string, studentId: string) {
  const { User, Classroom, LockMode, UserIdentityProvider } = await import('@logiclab/db');
  const student = await em.findOne(User, studentId);

  if (!student) return null;

  const owner =
    student.identityProvider === UserIdentityProvider.Demo
      ? { identityProvider: UserIdentityProvider.Demo, demoWorkspace: student.demoWorkspace!.id }
      : { identityProvider: UserIdentityProvider.Cognito };

  // Keep the lock through enrollment insertion to serialize against invitation replacement.
  return em.findOne(
    Classroom,
    { invitationHash: hash, owner },
    { lockMode: LockMode.PESSIMISTIC_WRITE },
  );
}

export function invitationIsActive(
  classroom: ClassroomEntity | null,
): classroom is ClassroomEntity {
  if (!classroom?.invitationExpiresAt) {
    return false;
  }

  return !(classroom.invitationExpiresAt.getTime() <= Date.now());
}

export async function ensureEnrollment(
  em: DatabaseManager,
  classroom: ClassroomEntity,
  studentId: string,
) {
  const { Enrollment, User } = await import('@logiclab/db');
  await em.upsert(
    Enrollment,
    { classroom, student: em.getReference(User, studentId) },
    {
      onConflictFields: ['classroom', 'student'],
      onConflictAction: 'ignore',
    },
  );
}
