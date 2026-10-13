import type { Classroom as ClassroomEntity } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { ClassroomSummary } from '@logiclab/contracts';

export interface ClassroomStore {
  create(ownerId: string, name: string): Promise<ClassroomSummary>;
  list(ownerId: string, limit: number, offset: number): Promise<ClassroomSummary[]>;
  replaceInvitation(ownerId: string, classId: string, hash: string, expiresAt: Date): Promise<boolean>;
  findOwned(ownerId: string, classId: string): Promise<ClassroomSummary | null>;
}
export async function createClassroomStore(orm: Awaited<ReturnType<typeof createDatabase>>): Promise<ClassroomStore> {
  const { Classroom, User } = await import('@logiclab/db');
  const summary = (value: ClassroomEntity): ClassroomSummary => ({ id: value.id, name: value.name, createdAt: value.createdAt.toISOString() });
  return {
    async create(ownerId, name) {
      const em = orm.em.fork();
      const classroom = em.create(Classroom, { name, owner: em.getReference(User, ownerId) });
      em.persist(classroom); await em.flush();
      return summary(classroom);
    },
    async list(ownerId, limit, offset) {
      const rows = await orm.em.fork().find(Classroom, { owner: ownerId }, { limit, offset, orderBy: { createdAt: 'DESC', id: 'DESC' } });
      return rows.map(summary);
    },
    async replaceInvitation(ownerId, classId, hash, expiresAt) {
      // One owner-scoped update atomically invalidates the previous invitation.
      return (await orm.em.fork().nativeUpdate(Classroom, { id: classId, owner: ownerId }, {
        invitationHash: hash, invitationExpiresAt: expiresAt,
      })) > 0;
    },
    async findOwned(ownerId, classId) {
      const row = await orm.em.fork().findOne(Classroom, { id: classId, owner: ownerId });
      return row ? summary(row) : null;
    },
  };
}
