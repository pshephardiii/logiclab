import { transactionRunner, type DatabaseManager } from '../transactions';
import type { Classroom as ClassroomEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { ClassroomSummary } from '@logiclab/contracts';

export interface ClassroomStore {
  join(studentId: string, hash: string): Promise<ClassroomSummary | null>;
  listEnrolled(studentId: string, limit: number, offset: number): Promise<ClassroomSummary[]>;
  findEnrolled(studentId: string, classId: string): Promise<ClassroomSummary | null>;
  create(ownerId: string, name: string): Promise<ClassroomSummary>;
  list(ownerId: string, limit: number, offset: number): Promise<ClassroomSummary[]>;
  replaceInvitation(
    ownerId: string,
    classId: string,
    hash: string,
    expiresAt: Date,
  ): Promise<boolean>;
  findOwned(ownerId: string, classId: string): Promise<ClassroomSummary | null>;
}

/**
 * Implements owner-scoped classes and student-scoped enrollment reads.
 * Invitation redemption uses a transaction and row lock to serialize against code replacement.
 */
export async function createClassroomStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<ClassroomStore> {
  const transact = transactionRunner(orm, transaction);
  const { Classroom, User, Enrollment, LockMode, UserIdentityProvider } =
    await import('@logiclab/db');
  const summary = (value: ClassroomEntity): ClassroomSummary => ({
    id: value.id,
    name: value.name,
    createdAt: value.createdAt.toISOString(),
  });
  type TransactionManager = typeof orm.em;

  async function lockInvitedClassroom(em: TransactionManager, hash: string, studentId: string) {
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

  function invitationIsActive(classroom: ClassroomEntity | null): classroom is ClassroomEntity {
    if (!classroom?.invitationExpiresAt) {
      return false;
    }
    return !(classroom.invitationExpiresAt.getTime() <= Date.now());
  }

  async function ensureEnrollment(
    em: TransactionManager,
    classroom: ClassroomEntity,
    studentId: string,
  ) {
    await em.upsert(
      Enrollment,
      { classroom, student: em.getReference(User, studentId) },
      {
        onConflictFields: ['classroom', 'student'],
        onConflictAction: 'ignore',
      },
    );
  }

  return {
    async join(studentId, hash) {
      return transact(async (em) => {
        const classroom = await lockInvitedClassroom(em, hash, studentId);
        if (!invitationIsActive(classroom)) return null;
        await ensureEnrollment(em, classroom, studentId);
        return summary(classroom);
      });
    },
    async listEnrolled(studentId, limit, offset) {
      const rows = await (transaction ?? orm.em.fork()).find(
        Enrollment,
        { student: studentId },
        {
          populate: ['classroom'],
          limit,
          offset,
          orderBy: { classroom: { createdAt: 'DESC', id: 'DESC' } },
        },
      );
      return rows.map((row) => summary(row.classroom));
    },
    async findEnrolled(studentId, classId) {
      const row = await (transaction ?? orm.em.fork()).findOne(
        Enrollment,
        { student: studentId, classroom: classId },
        { populate: ['classroom'] },
      );
      return row ? summary(row.classroom) : null;
    },
    async create(ownerId, name) {
      const em = transaction ?? orm.em.fork();
      const classroom = em.create(Classroom, { name, owner: em.getReference(User, ownerId) });
      em.persist(classroom);
      await em.flush();
      return summary(classroom);
    },
    async list(ownerId, limit, offset) {
      const rows = await (transaction ?? orm.em.fork()).find(
        Classroom,
        { owner: ownerId },
        { limit, offset, orderBy: { createdAt: 'DESC', id: 'DESC' } },
      );
      return rows.map(summary);
    },
    async replaceInvitation(ownerId, classId, hash, expiresAt) {
      // One owner-scoped update atomically invalidates the previous invitation.
      return (
        (await (transaction ?? orm.em.fork()).nativeUpdate(
          Classroom,
          { id: classId, owner: ownerId },
          {
            invitationHash: hash,
            invitationExpiresAt: expiresAt,
          },
        )) > 0
      );
    },
    async findOwned(ownerId, classId) {
      const row = await (transaction ?? orm.em.fork()).findOne(Classroom, {
        id: classId,
        owner: ownerId,
      });
      return row ? summary(row) : null;
    },
  };
}
