import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDemoSessionStore } from '../../src/persistence/demo/sessions';
import { createDemoSessionService, demoSessionHash } from '../../src/application/demo/service';
import { initialDemoLifetime } from '../../src/application/demo/policy';
import { readDemoPolicy } from '../../src/config/demo';
import { createAuthStore } from '../../src/persistence/auth/store';
import { sessionHash } from '../../src/application/auth/crypto';
import { databaseTime } from '../../src/persistence/database-time';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

async function fixture(
  check: (
    orm: Awaited<ReturnType<typeof createDatabase>>,
    db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
  ) => Promise<void>,
) {
  const db = await import('@logiclab/db');
  const schema = `demo_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await check(orm, db);
  } finally {
    await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}

const policy = readDemoPolicy({});

test('demo sessions isolate role membership, rotate once, and cannot restore normal Cognito sessions', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const now = await databaseTime(em);
    const workspaces = [0, 1].map(() =>
      em.create(db.DemoWorkspace, {
        ...initialDemoLifetime(now, policy),
        templateVersion: 1,
        status: db.DemoWorkspaceStatus.Active,
      }),
    );
    const users = workspaces.flatMap((demoWorkspace) =>
      [db.UserRole.Instructor, db.UserRole.Student].map((role) =>
        em.create(db.User, { identityProvider: db.UserIdentityProvider.Demo, demoWorkspace, role }),
      ),
    );
    const normal = em.create(db.User, {
      cognitoUserPoolId: 'test-pool',
      cognitoSubject: 'real-subject',
      role: db.UserRole.Instructor,
    });
    em.persist([...workspaces, ...users, normal]);
    await em.flush();
    const store = await createDemoSessionStore(orm, policy);
    const service = createDemoSessionService(store);
    const one = await service.issue(workspaces[0]!.id, 'instructor');
    const two = await service.issue(workspaces[1]!.id, 'instructor');
    assert.equal(one.actor.id, users[0]!.id);
    assert.equal(two.actor.id, users[2]!.id);
    assert.notEqual(one.actor.workspaceId, two.actor.workspaceId);
    assert.equal(await em.count(db.DemoSession, { id: one.sessionId }), 0);
    assert.equal(await em.count(db.DemoSession, { id: demoSessionHash(one.sessionId) }), 1);
    assert.equal(await em.count(db.AuthSession, {}), 0);
    // A failed replacement must roll back deletion of the previous credential.
    await assert.rejects(
      store.switchRole(demoSessionHash(one.sessionId), 'student', demoSessionHash(two.sessionId)),
    );
    assert.equal((await service.authenticate(one.sessionId)).id, users[0]!.id);

    const switches = await Promise.allSettled([
      service.switchRole(one.sessionId, 'student'),
      service.switchRole(one.sessionId, 'student'),
    ]);
    const success = switches.filter((result) => result.status === 'fulfilled');
    assert.equal(success.length, 1);
    const switched = (
      success[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof service.switchRole>>>
    ).value;
    assert.equal(switched.actor.id, users[1]!.id);
    assert.equal(switched.actor.workspaceId, one.actor.workspaceId);
    await assert.rejects(service.authenticate(one.sessionId), /DEMO_SESSION_INVALID/);
    assert.equal((await service.authenticate(two.sessionId)).id, users[2]!.id);
    const auth = await createAuthStore(orm, 'test-pool');
    assert.equal(await auth.getSession(demoSessionHash(switched.sessionId)), null);
    assert.equal(await auth.getSession(sessionHash(switched.sessionId)), null);
    assert.equal(await auth.findUser('real-subject').then((user) => user?.id), normal.id);
    // Even a misplaced ordinary-session row cannot authenticate a demo identity.
    em.persist(
      em.create(db.AuthSession, {
        id: 'a'.repeat(64),
        user: users[0]!,
        encryptedTokens: 'unused',
        accessExpiresAt: new Date(now.getTime() + 60000),
        expiresAt: new Date(now.getTime() + 60000),
      }),
    );
    await em.flush();
    assert.equal(await auth.getSession('a'.repeat(64)), null);
    await service.logout(switched.sessionId);
    await assert.rejects(service.authenticate(switched.sessionId), /DEMO_SESSION_INVALID/);
  }));

test('demo sessions reject expired, unavailable, missing-member and prior-generation workspaces', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const now = await databaseTime(em);
    const workspace = em.create(db.DemoWorkspace, {
      ...initialDemoLifetime(now, policy),
      templateVersion: 1,
      status: db.DemoWorkspaceStatus.Active,
    });
    em.persist(
      em.create(db.User, {
        demoWorkspace: workspace,
        identityProvider: db.UserIdentityProvider.Demo,
        role: db.UserRole.Instructor,
      }),
    );
    await em.flush();
    const service = createDemoSessionService(await createDemoSessionStore(orm, policy));
    await assert.rejects(service.issue(workspace.id, 'student'), /DEMO_SESSION_INVALID/);
    const session = await service.issue(workspace.id, 'instructor');
    for (const status of [
      db.DemoWorkspaceStatus.Provisioning,
      db.DemoWorkspaceStatus.Resetting,
      db.DemoWorkspaceStatus.Expired,
    ]) {
      await em.nativeUpdate(db.DemoWorkspace, workspace.id, { status });
      await assert.rejects(service.authenticate(session.sessionId), /DEMO_SESSION_INVALID/);
      await assert.rejects(service.issue(workspace.id, 'instructor'), /DEMO_SESSION_INVALID/);
    }
    await em.nativeUpdate(db.DemoWorkspace, workspace.id, {
      status: db.DemoWorkspaceStatus.Active,
      generation: 2,
    });
    await assert.rejects(service.authenticate(session.sessionId), /DEMO_SESSION_INVALID/);
    const replacement = await service.issue(workspace.id, 'instructor');
    // An already-expired idle deadline still has valid persisted timestamp ordering.
    const past = new Date(now.getTime() - 3600000);
    await em.nativeUpdate(db.DemoWorkspace, workspace.id, {
      createdAt: past,
      lastActivityAt: past,
      idleExpiresAt: new Date(now.getTime() - 1000),
    });
    await assert.rejects(service.authenticate(replacement.sessionId), /DEMO_SESSION_INVALID/);
    await assert.rejects(service.recordActivity(replacement.sessionId), /DEMO_SESSION_INVALID/);
    await assert.rejects(
      service.switchRole(replacement.sessionId, 'instructor'),
      /DEMO_SESSION_INVALID/,
    );
  }));

test('authentication does not keep idle demos alive; explicit activity is throttled and absolutely capped', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const now = await databaseTime(em);
    const past = new Date(now.getTime() - 120000);
    const workspace = em.create(db.DemoWorkspace, {
      templateVersion: 1,
      status: db.DemoWorkspaceStatus.Active,
      createdAt: past,
      lastActivityAt: past,
      idleExpiresAt: new Date(now.getTime() + 120000),
      expiresAt: new Date(now.getTime() + 300000),
    });
    em.persist(
      em.create(db.User, {
        demoWorkspace: workspace,
        identityProvider: db.UserIdentityProvider.Demo,
        role: db.UserRole.Student,
      }),
    );
    await em.flush();
    const service = createDemoSessionService(await createDemoSessionStore(orm, policy));
    const session = await service.issue(workspace.id, 'student');
    await service.authenticate(session.sessionId);
    let saved = await em.findOneOrFail(db.DemoWorkspace, workspace.id, { refresh: true });
    assert.equal(saved.lastActivityAt.getTime(), past.getTime());
    await service.recordActivity(session.sessionId);
    saved = await em.findOneOrFail(db.DemoWorkspace, workspace.id, { refresh: true });
    assert(saved.lastActivityAt >= now);
    assert.equal(saved.idleExpiresAt.getTime(), saved.expiresAt.getTime());
    const touched = saved.lastActivityAt.getTime();
    await service.recordActivity(session.sessionId);
    saved = await em.findOneOrFail(db.DemoWorkspace, workspace.id, { refresh: true });
    assert.equal(saved.lastActivityAt.getTime(), touched);
  }));

test('session resolution rechecks generation after a competing reset releases its workspace lock', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const now = await databaseTime(em);
    const workspace = em.create(db.DemoWorkspace, {
      ...initialDemoLifetime(now, policy),
      templateVersion: 1,
      status: db.DemoWorkspaceStatus.Active,
    });
    em.persist(
      em.create(db.User, {
        demoWorkspace: workspace,
        identityProvider: db.UserIdentityProvider.Demo,
        role: db.UserRole.Student,
      }),
    );
    await em.flush();
    const service = createDemoSessionService(await createDemoSessionStore(orm, policy));
    const session = await service.issue(workspace.id, 'student');
    const reset = orm.em.fork();
    await reset.begin();
    const locked = await reset.findOneOrFail(db.DemoWorkspace, workspace.id, {
      lockMode: db.LockMode.PESSIMISTIC_WRITE,
    });
    const blockerRows = await reset.execute<{ pid: number }[]>('select pg_backend_pid() as pid');
    const blockerPid = blockerRows[0]!.pid;
    const resolution = service.authenticate(session.sessionId);
    // Attach the rejection handler immediately while the resolver waits for this lock.
    const rejected = assert.rejects(resolution, /DEMO_SESSION_INVALID/);
    try {
      const deadline = Date.now() + 5000;
      let blocked = false;
      while (Date.now() < deadline) {
        const rows = await orm.em
          .fork()
          .execute<{ blocked: boolean }[]>(
            'select exists(select 1 from pg_stat_activity where ? = any(pg_blocking_pids(pid))) as blocked',
            [blockerPid],
          );
        if (rows[0]!.blocked) {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(
        blocked,
        true,
        'Resolver must wait for the workspace lock before reset commits.',
      );
      locked.generation += 1;
      await reset.flush();
      await reset.commit();
    } catch (error) {
      await reset.rollback();
      throw error;
    }
    await rejected;
  }));
