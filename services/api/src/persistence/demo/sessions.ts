import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import {
  demoActivityUpdate,
  demoSessionIsUsable,
  validateDemoPolicy,
} from '../../application/demo/policy';
import type { DemoPolicy, DemoSessionStore } from '../../application/demo/types';
import { databaseTime } from '../database-time';
import { createDemoAccess } from './access';

type Database = Awaited<ReturnType<typeof createDatabase>>;

/** All session decisions serialize with reset/cleanup on the workspace row. */
export async function createDemoSessionStore(
  orm: Database,
  policy: DemoPolicy,
): Promise<DemoSessionStore> {
  validateDemoPolicy(policy);
  const { DemoWorkspace, DemoSession, UserRole, LockMode } = await import('@logiclab/db');
  const dbRole = (role: 'student' | 'instructor') =>
    role === 'instructor' ? UserRole.Instructor : UserRole.Student;
  const { actorFor, withSession } = await createDemoAccess(orm);
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
