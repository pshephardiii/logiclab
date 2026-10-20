import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { cleanupExpiredDemoWorkspaces } from '../../src/persistence/demo/cleanup';
import { createDemoWorkspaceStore } from '../../src/persistence/demo/workspaces';
import { createDemoSessionStore } from '../../src/persistence/demo/sessions';
import { createDemoSessionService } from '../../src/application/demo/service';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { readDemoPolicy } from '../../src/config/demo';
import { databaseTime } from '../../src/persistence/database-time';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const policy = readDemoPolicy({});
async function fixture(
  check: (
    orm: Awaited<ReturnType<typeof createDatabase>>,
    db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
  ) => Promise<void>,
) {
  const db = await import('@logiclab/db');
  const schema = `demo_cleanup_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await check(orm, db);
  } finally {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}

test('cleanup removes frozen demo work, sessions and financial data while retaining normal data, shared plans and audit findings', async () =>
  fixture(async (orm, db) => {
    const store = await createDemoWorkspaceStore(orm, policy, 2);
    const expired = await store.provision(randomUUID());
    const live = await store.provision(randomUUID());
    const sessions = createDemoSessionService(await createDemoSessionStore(orm, policy));
    const session = await sessions.issue(expired.workspaceId, 'student');
    const em = orm.em.fork();
    const assignment = await em.findOneOrFail(db.Assignment, {
      classroom: { owner: { demoWorkspace: expired.workspaceId } },
    });
    await (await createStudentWorkStore(orm)).submit(session.actor.id, assignment.id, 0);
    const purchase = await em.findOneOrFail(db.ClassPurchase, {
      payer: { demoWorkspace: expired.workspaceId },
    });
    const user = em.create(db.User, {
      cognitoUserPoolId: 'normal',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    const classroom = em.create(db.Classroom, { name: 'Normal class', owner: user });
    const job = em.create(db.DurableJob, {
      jobType: db.JobType.BillingReconciliation,
      deduplicationKey: randomUUID(),
    });
    const finding = em.create(db.ReconciliationFinding, {
      job,
      kind: db.FindingKind.PaidPurchaseMissingGrant,
      purchaseId: purchase.id,
      classId: purchase.classroom.id,
    });
    em.persist([user, classroom, job, finding]);
    await em.flush();
    await em.nativeUpdate(db.DemoWorkspace, expired.workspaceId, {
      status: db.DemoWorkspaceStatus.Expired,
    });
    assert.deepEqual(await cleanupExpiredDemoWorkspaces(orm), { removed: 1 });
    em.clear();
    assert.equal(await em.count(db.DemoWorkspace, { id: expired.workspaceId }), 0);
    assert.equal(await em.count(db.User, { demoWorkspace: expired.workspaceId }), 0);
    assert.equal(await em.count(db.DemoSession, {}), 0);
    assert.equal(await em.count(db.AssignmentAttempt, {}), 0);
    assert.equal(await em.count(db.ClassPurchase, { id: purchase.id }), 0);
    assert.equal(
      await em.count(db.PaymentEvent, { sourceReference: purchase.checkoutReference }),
      0,
    );
    assert.equal(
      await em.count(db.ClassEntitlement, { sourceReference: purchase.checkoutReference }),
      0,
    );
    assert.equal(await em.count(db.ProblemVersion, {}), 1);
    assert.equal(await em.count(db.DemoWorkspace, { id: live.workspaceId }), 1);
    assert.equal(await em.count(db.Classroom, { id: classroom.id }), 1);
    assert.equal(await em.count(db.BillingPlan, {}), 1);
    assert.equal(
      (await em.findOneOrFail(db.ReconciliationFinding, finding.id)).purchaseId,
      purchase.id,
    );
    await assert.rejects(sessions.authenticate(session.sessionId), /DEMO_SESSION_INVALID/);
    assert.deepEqual(await cleanupExpiredDemoWorkspaces(orm), { removed: 0 });
    // Physical deletion frees a slot in the existing persisted provisioning cap.
    assert.equal((await store.provision(randomUUID())).generation, 1);
  }));

test('bounded concurrent batches reclaim abandoned provisioning/reset states without double deletion', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const now = await databaseTime(em);
    const past = new Date(now.getTime() - 60000);
    const future = new Date(now.getTime() + 60000);
    for (const status of [
      db.DemoWorkspaceStatus.Provisioning,
      db.DemoWorkspaceStatus.Resetting,
      db.DemoWorkspaceStatus.Active,
    ]) {
      em.persist(
        em.create(db.DemoWorkspace, {
          status,
          templateVersion: 1,
          createdAt: past,
          lastActivityAt: past,
          idleExpiresAt: new Date(now.getTime() - 1000),
          expiresAt: future,
        }),
      );
    }
    await em.flush();
    assert.deepEqual(await cleanupExpiredDemoWorkspaces(orm, 1), { removed: 1 });
    const results = await Promise.all([
      cleanupExpiredDemoWorkspaces(orm, 1),
      cleanupExpiredDemoWorkspaces(orm, 1),
    ]);
    assert.equal(
      results.reduce((sum, result) => sum + result.removed, 0),
      2,
    );
    assert.equal(await em.count(db.DemoWorkspace, {}), 0);
  }));

test('cleanup skips a locked workspace and preserves an activity extension committed before reconsideration', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const now = await databaseTime(em);
    const past = new Date(now.getTime() - 60000);
    const workspace = em.create(db.DemoWorkspace, {
      status: db.DemoWorkspaceStatus.Active,
      templateVersion: 1,
      createdAt: past,
      lastActivityAt: past,
      idleExpiresAt: new Date(now.getTime() - 1000),
      expiresAt: new Date(now.getTime() + 3600000),
    });
    em.persist(workspace);
    await em.flush();
    const activity = orm.em.fork();
    await activity.begin();
    try {
      const locked = await activity.findOneOrFail(db.DemoWorkspace, workspace.id, {
        lockMode: db.LockMode.PESSIMISTIC_WRITE,
      });
      assert.deepEqual(await cleanupExpiredDemoWorkspaces(orm), { removed: 0 });
      locked.lastActivityAt = now;
      locked.idleExpiresAt = new Date(now.getTime() + 60000);
      await activity.flush();
      await activity.commit();
    } catch (error) {
      await activity.rollback();
      throw error;
    }
    assert.deepEqual(await cleanupExpiredDemoWorkspaces(orm), { removed: 0 });
    assert.equal(await em.count(db.DemoWorkspace, { id: workspace.id }), 1);
  }));

test('unsafe cross-workspace data rolls back an earlier deletion in the same batch', async () =>
  fixture(async (orm, db) => {
    const store = await createDemoWorkspaceStore(orm, policy);
    const first = await store.provision(randomUUID());
    const other = await store.provision(randomUUID());
    const em = orm.em.fork();
    const student = await em.findOneOrFail(db.User, {
      demoWorkspace: other.workspaceId,
      role: db.UserRole.Student,
    });
    const classroom = await em.findOneOrFail(db.Classroom, {
      owner: { demoWorkspace: first.workspaceId },
    });
    em.persist(em.create(db.Enrollment, { student, classroom }));
    await em.flush();
    await em.nativeUpdate(db.DemoWorkspace, first.workspaceId, {
      status: db.DemoWorkspaceStatus.Expired,
    });
    const now = await databaseTime(em);
    const past = new Date(now.getTime() - 3600000);
    const recoverable = em.create(db.DemoWorkspace, {
      status: db.DemoWorkspaceStatus.Provisioning,
      templateVersion: 1,
      createdAt: past,
      lastActivityAt: past,
      idleExpiresAt: new Date(past.getTime() + 1000),
      expiresAt: new Date(now.getTime() + 60000),
    });
    em.persist(recoverable);
    await em.flush();
    await assert.rejects(cleanupExpiredDemoWorkspaces(orm), /cross-workspace/);
    assert.equal(await em.count(db.DemoWorkspace, {}), 3);
    em.clear();
    assert.equal(
      (await em.findOneOrFail(db.DemoWorkspace, recoverable.id)).status,
      db.DemoWorkspaceStatus.Provisioning,
    );
    assert.equal(await em.count(db.User, {}), 4);
    assert.equal(await em.count(db.Enrollment, { student: student.id }), 3);
  }));
