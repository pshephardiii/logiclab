import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoWorkspace, DemoWorkspaceStatus, type createDatabase } from '../src/index.ts';

/** Runs after the shared suite applies migrations; each test rolls back its own fixtures. */
export function registerDemoWorkspacePersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  const start = new Date('2026-10-19T12:00:00Z');
  // Fixture durations illustrate ordering; they are not production expiration defaults.
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const idleLifetimeMs = 30 * minuteMs;
  const absoluteLifetimeMs = 4 * hourMs;
  const fixture = () => ({
    templateVersion: 1,
    createdAt: start,
    lastActivityAt: start,
    idleExpiresAt: new Date(start.getTime() + idleLifetimeMs),
    expiresAt: new Date(start.getTime() + absoluteLifetimeMs),
  });

  test('demo workspace persists explicit lifetimes and starts unavailable for access', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const workspace = em.create(DemoWorkspace, fixture());
      em.persist(workspace);
      await em.flush();
      em.clear();
      const saved = await em.findOneOrFail(DemoWorkspace, workspace.id);
      assert.equal(saved.status, DemoWorkspaceStatus.Provisioning);
      assert.equal(saved.generation, 1);
      assert.equal(saved.templateVersion, 1);
      assert.deepEqual(saved.createdAt, start);
      assert.deepEqual(saved.idleExpiresAt, fixture().idleExpiresAt);
      assert.deepEqual(saved.expiresAt, fixture().expiresAt);
      saved.status = DemoWorkspaceStatus.Active;
      saved.generation += 1;
      await em.flush();
      em.clear();
      assert.equal((await em.findOneOrFail(DemoWorkspace, workspace.id)).generation, 2);
    } finally {
      await em.rollback();
    }
  });

  const invalidCases = [
    { name: 'unknown status', changes: { status: 'unknown' }, constraint: 'status' },
    { name: 'zero template version', changes: { templateVersion: 0 }, constraint: 'version' },
    { name: 'zero generation', changes: { generation: 0 }, constraint: 'version' },
    {
      name: 'activity before creation',
      changes: { lastActivityAt: new Date(start.getTime() - hourMs) },
      constraint: 'lifetime',
    },
    {
      name: 'idle deadline at last activity',
      changes: { idleExpiresAt: start },
      constraint: 'lifetime',
    },
    {
      name: 'idle deadline past absolute expiry',
      changes: { idleExpiresAt: new Date(start.getTime() + absoluteLifetimeMs + hourMs) },
      constraint: 'lifetime',
    },
  ];
  for (const invalid of invalidCases) {
    test(`demo workspace rejects ${invalid.name}`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const workspace = em.create(DemoWorkspace, fixture());
        em.persist(workspace);
        await em.flush();
        // Raw SQL also verifies callers cannot bypass lifecycle field constraints.
        const column = Object.keys(invalid.changes)[0]!;
        const columns: Record<string, string> = {
          status: 'status',
          templateVersion: 'template_version',
          generation: 'generation',
          lastActivityAt: 'last_activity_at',
          idleExpiresAt: 'idle_expires_at',
        };
        await assert.rejects(
          em.execute(`update demo_workspaces set ${columns[column]} = ? where id = ?`, [
            Object.values(invalid.changes)[0],
            workspace.id,
          ]),
          new RegExp(`demo_workspaces_${invalid.constraint}_check`),
        );
      } finally {
        await em.rollback();
      }
    });
  }
}
