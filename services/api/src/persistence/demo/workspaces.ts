import type { DemoPolicy } from '../../application/demo/types';
import type { DemoWorkspaceStore } from '../../application/demo/workspaces';
import { DEMO_TEMPLATE } from '../../application/demo/template';
import {
  initialDemoLifetime,
  demoActivityUpdate,
  validateDemoPolicy,
} from '../../application/demo/policy';
import { databaseTime } from '../database-time';
import { createDemoAccess } from './access';
import { deleteDemoWorkspaceData } from './delete-data';
import { seedDemoWorkspace } from './seed';
import type { Database } from '../transactions';

/** Atomic provisioning/reset: no partially seeded graph or replacement credential can commit. */
export async function createDemoWorkspaceStore(
  orm: Database,
  policy: DemoPolicy,
  capacity?: number,
): Promise<DemoWorkspaceStore> {
  validateDemoPolicy(policy);
  const { DemoWorkspace, DemoWorkspaceStatus, DemoSession, LockMode } =
    await import('@logiclab/db');
  const { withSession, actorFor } = await createDemoAccess(orm);
  return {
    async provision(workspaceId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId))
        throw new Error('Invalid internal workspace request.');
      return orm.em.fork().transactional(async (em) => {
        if (capacity !== undefined) {
          await em.execute('select pg_advisory_xact_lock(?, ?)', [500026, 9]);
          if (
            !(await em.findOne(DemoWorkspace, workspaceId)) &&
            (await em.count(DemoWorkspace, {})) >= capacity
          )
            throw new Error('DEMO_CAPACITY');
        }
        const initialTime = await databaseTime(em);
        await em.upsert(
          DemoWorkspace,
          {
            id: workspaceId,
            templateVersion: DEMO_TEMPLATE.version,
            ...initialDemoLifetime(initialTime, policy),
          },
          { onConflictFields: ['id'], onConflictAction: 'ignore' },
        );
        const workspace = await em.findOneOrFail(DemoWorkspace, workspaceId, {
          lockMode: LockMode.PESSIMISTIC_WRITE,
          refresh: true,
        });
        const now = await databaseTime(em);
        if (
          workspace.status === DemoWorkspaceStatus.Active &&
          workspace.templateVersion === DEMO_TEMPLATE.version &&
          workspace.idleExpiresAt > now &&
          workspace.expiresAt > now
        )
          return {
            workspaceId,
            generation: workspace.generation,
            templateVersion: workspace.templateVersion,
          };
        if (
          workspace.status !== DemoWorkspaceStatus.Provisioning ||
          workspace.idleExpiresAt <= now ||
          workspace.expiresAt <= now
        )
          throw new Error('Demo workspace is unavailable.');
        await seedDemoWorkspace(orm, em, workspace);
        const finishedAt = await databaseTime(em);
        if (workspace.idleExpiresAt <= finishedAt || workspace.expiresAt <= finishedAt)
          throw new Error('Demo provisioning expired.');
        workspace.status = DemoWorkspaceStatus.Active;
        await em.flush();
        return {
          workspaceId,
          generation: workspace.generation,
          templateVersion: workspace.templateVersion,
        };
      });
    },
    reset(hash, replacementHash) {
      return withSession(hash, async (em, workspace, session, now) => {
        if (!(await actorFor(em, workspace.id, session.generation, session.selectedRole)))
          return null;
        const role = session.selectedRole;
        workspace.status = DemoWorkspaceStatus.Resetting;
        workspace.generation += 1;
        await em.flush();
        await deleteDemoWorkspaceData(em, workspace.id);
        // Native deletes leave stale objects in the identity map; detach before rebuilding the graph.
        em.clear();
        const current = await em.findOneOrFail(DemoWorkspace, workspace.id);
        await seedDemoWorkspace(orm, em, current);
        current.templateVersion = DEMO_TEMPLATE.version;
        current.status = DemoWorkspaceStatus.Active;
        const finishedAt = await databaseTime(em);
        if (current.expiresAt <= finishedAt) throw new Error('Demo reset expired.');
        const activity = demoActivityUpdate(current, finishedAt, policy);
        if (activity) Object.assign(current, activity);
        const actor = await actorFor(em, current.id, current.generation, role);
        if (!actor) throw new Error('Demo reset did not provision the selected role.');
        em.persist(
          em.create(DemoSession, {
            id: replacementHash,
            workspace: current,
            generation: current.generation,
            selectedRole: role,
            createdAt: now,
          }),
        );
        await em.flush();
        return actor;
      });
    },
  };
}
