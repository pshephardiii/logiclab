import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import {
  demoActivityUpdate,
  demoSessionIsUsable,
  validateDemoPolicy,
} from '../../application/demo/policy';
import type { DemoActor, DemoPolicy, DemoSessionStore } from '../../application/demo/types';
import { databaseTime } from '../database-time';
import type { Role } from '../../application/auth/types';

type Database = Awaited<ReturnType<typeof createDatabase>>;
type Manager = Database['em'];

/** All session decisions serialize with reset/cleanup on the workspace row. */
export async function createDemoSessionStore(
  orm: Database,
  policy: DemoPolicy,
): Promise<DemoSessionStore> {
  validateDemoPolicy(policy);
  const { DemoWorkspace, DemoSession, User, UserIdentityProvider, UserRole, LockMode } =
    await import('@logiclab/db');
  const dbRole = (role: Role) => (role === 'instructor' ? UserRole.Instructor : UserRole.Student);
  async function actorFor(
    em: Manager,
    workspaceId: string,
    generation: number,
    role: Role,
  ): Promise<DemoActor | null> {
    if (role !== 'instructor' && role !== 'student') return null;
    const user = await em.findOne(User, {
      identityProvider: UserIdentityProvider.Demo,
      demoWorkspace: workspaceId,
      role: dbRole(role),
    });
    return user ? { id: user.id, role: user.role, workspaceId, generation } : null;
  }
  async function withSession<T>(
    hash: string,
    work: (
      em: Manager,
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
      // Re-read after locking: a preceding rotation may have removed this credential.
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
  return {
    async issue(workspaceId, role, hash) {
      return orm.em.fork().transactional(async (em) => {
        const workspace = await em.findOne(DemoWorkspace, workspaceId, {
          lockMode: LockMode.PESSIMISTIC_WRITE,
        });
        const now = await databaseTime(em);
        if (!workspace || !demoSessionIsUsable(workspace, workspace.generation, now)) return null;
        const actor = await actorFor(em, workspace.id, workspace.generation, role);
        if (!actor) return null;
        em.persist(
          em.create(DemoSession, {
            id: hash,
            workspace,
            generation: workspace.generation,
            selectedRole: dbRole(role),
            createdAt: now,
          }),
        );
        await em.flush();
        return actor;
      });
    },
    resolve(hash, recordActivity) {
      return withSession(hash, async (em, workspace, session, now) => {
        const actor = await actorFor(em, workspace.id, session.generation, session.selectedRole);
        if (!actor) return null;
        if (recordActivity) {
          const update = demoActivityUpdate(workspace, now, policy);
          if (update) {
            Object.assign(workspace, update);
            await em.flush();
          }
        }
        return actor;
      });
    },
    switchRole(hash, role, replacementHash) {
      return withSession(hash, async (em, workspace, session, now) => {
        const actor = await actorFor(em, workspace.id, session.generation, role);
        if (!actor) return null;
        await em.nativeDelete(DemoSession, session.id);
        em.persist(
          em.create(DemoSession, {
            id: replacementHash,
            workspace,
            generation: session.generation,
            selectedRole: dbRole(role),
            createdAt: now,
          }),
        );
        const update = demoActivityUpdate(workspace, now, policy);
        if (update) Object.assign(workspace, update);
        await em.flush();
        return actor;
      });
    },
    async revoke(hash) {
      await withSession(hash, async (em, _workspace, session) => {
        await em.nativeDelete(DemoSession, session.id);
      });
    },
  };
}
