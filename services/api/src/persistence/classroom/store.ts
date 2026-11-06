import type { ClassroomStore } from './types';
import { classroomSummary } from './summary';
import {
  lockInvitedClassroom,
  invitationIsActive,
  ensureEnrollment,
} from './invitation-enrollment';
import { transactionRunner, type DatabaseManager } from '../transactions';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };

/**
 * Implements owner-scoped classes and student-scoped enrollment reads.
 * Invitation redemption uses a transaction and row lock to serialize against code replacement.
 */
export async function createClassroomStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<ClassroomStore> {
  const transact = transactionRunner(orm, transaction);
  const { Classroom, User, Enrollment } = await import('@logiclab/db');

  return {
    async join(studentId, hash) {
      return transact(async (em) => {
        const classroom = await lockInvitedClassroom(em, hash, studentId);

        if (!invitationIsActive(classroom)) return null;

        await ensureEnrollment(em, classroom, studentId);

        return classroomSummary(classroom);
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

      return rows.map((row) => classroomSummary(row.classroom));
    },

    async findEnrolled(studentId, classId) {
      const row = await (transaction ?? orm.em.fork()).findOne(
        Enrollment,
        { student: studentId, classroom: classId },
        { populate: ['classroom'] },
      );

      return row ? classroomSummary(row.classroom) : null;
    },

    async create(ownerId, name) {
      const em = transaction ?? orm.em.fork();
      const classroom = em.create(Classroom, { name, owner: em.getReference(User, ownerId) });

      em.persist(classroom);
      await em.flush();

      return classroomSummary(classroom);
    },

    async list(ownerId, limit, offset) {
      const rows = await (transaction ?? orm.em.fork()).find(
        Classroom,
        { owner: ownerId },
        { limit, offset, orderBy: { createdAt: 'DESC', id: 'DESC' } },
      );

      return rows.map(classroomSummary);
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

      return row ? classroomSummary(row) : null;
    },
  };
}
