import type { Database, DatabaseManager } from '../transactions';
import type { DemoActor } from '../../application/demo/types';
import type { Role } from '../../application/auth/types';
import { demoSessionIsUsable } from '../../application/demo/policy';
import { databaseTime } from '../database-time';

/** Shared lock protocol for session operations and demo resource transactions. */
export async function createDemoAccess(orm: Database) {
  const { DemoWorkspace, DemoSession, User, UserIdentityProvider, UserRole, LockMode } =
    await import('@logiclab/db');
  async function actorFor(
    em: DatabaseManager,
    workspaceId: string,
    generation: number,
    role: Role,
  ): Promise<DemoActor | null> {
    if (role !== 'instructor' && role !== 'student') return null;
    const user = await em.findOne(User, {
      identityProvider: UserIdentityProvider.Demo,
      demoWorkspace: workspaceId,
      role: role === 'instructor' ? UserRole.Instructor : UserRole.Student,
    });
    return user ? { id: user.id, role: user.role, workspaceId, generation } : null;
  }
  async function withSession<T>(
    hash: string,
    work: (
      em: DatabaseManager,
      workspace: InstanceType<typeof DemoWorkspace>,
      session: InstanceType<typeof DemoSession>,
      now: Date,
    ) => Promise<T>,
  ): Promise<T | null> {
    return orm.em.fork().transactional(async (em) => {
      const hint = await em.findOne(DemoSession, hash);
      if (!hint) return null;
      const workspace = await em.findOne(DemoWorkspace, hint.workspace.id, {
        lockMode: LockMode.PESSIMISTIC_WRITE,
      });
      const now = await databaseTime(em);
      const session = await em.findOne(DemoSession, hash, { refresh: true });
      if (
        !workspace ||
        !session ||
        session.workspace.id !== workspace.id ||
        !demoSessionIsUsable(workspace, session.generation, now)
      )
        return null;
      return work(em, workspace, session, now);
    });
  }
  return { actorFor, withSession };
}
