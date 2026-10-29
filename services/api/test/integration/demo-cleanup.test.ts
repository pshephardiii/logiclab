import { DEMO_TEMPLATE } from '../../src/application/demo/template';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { createJobRuntime } from '../../src/bootstrap/jobs';
import { runJobsCommand } from '../../src/operator/jobs/run';
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
      assessmentMode: db.AssessmentMode.Graded,
      title: DEMO_TEMPLATE.assignmentTitle,
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
    assert.equal(await em.count(db.ProblemVersion, {}), 3);
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

test('operator cleanup setup stays disabled, executes bounded deletion and records durable history', async () =>
  fixture(async (orm, db) => {
    const schema = orm.config.get('schema');
    async function command(args: string[]) {
      const output: string[] = [];
      const errors: string[] = [];
      const code = await runJobsCommand(
        args,
        { DATABASE_URL: url },
        { out: (value) => output.push(value), error: (value) => errors.push(value) },
        async (connectionString, options) =>
          db.createDatabase(connectionString, { ...options, schema }),
      );
      assert.equal(code, 0, errors.join('\n'));
      return JSON.parse(output[0]!);
    }
    const setup = await command(['setup', 'demo_cleanup']);
    const em = orm.em.fork();
    const schedule = await em.findOneOrFail(db.JobSchedule, setup.scheduleId);
    assert.equal(schedule.enabled, false);
    assert.equal(schedule.intervalSeconds, 300);
    await em.nativeUpdate(db.JobSchedule, schedule.id, { intervalSeconds: 900 });
    assert.equal((await command(['setup', 'demo_cleanup'])).scheduleId, schedule.id);
    assert.equal((await em.fork().findOneOrFail(db.JobSchedule, schedule.id)).intervalSeconds, 900);
    assert.equal((await command(['scheduler'])).scheduled, 0);
    const now = await databaseTime(em);
    for (let index = 0; index < 11; index += 1) {
      em.create(db.DemoWorkspace, {
        status: db.DemoWorkspaceStatus.Provisioning,
        templateVersion: 1,
        generation: 1,
        createdAt: new Date(now.getTime() - 60000),
        lastActivityAt: new Date(now.getTime() - 60000),
        idleExpiresAt: new Date(now.getTime() - 1000),
        expiresAt: new Date(now.getTime() + 60000),
      });
    }
    await em.flush();
    const enqueue = await command(['enqueue', 'demo_cleanup', 'cleanup-test']);
    assert.equal((await command(['enqueue', 'demo_cleanup', 'cleanup-test'])).jobId, enqueue.jobId);
    assert.equal((await command(['worker', '1'])).succeeded, 1);
    assert.equal(await em.count(db.DemoWorkspace, {}), 1);
    const job = await em.fork().findOneOrFail(db.DurableJob, enqueue.jobId);
    assert.equal(job.status, db.JobStatus.Succeeded);
    assert.equal((await em.findOneOrFail(db.JobRun, { job: job.id })).recordsChecked, 10);
    assert.equal(await em.count(db.ReconciliationFinding, { job: job.id }), 0);
    assert.equal(await em.count(db.JobRun, { job: job.id }), 1);
    await command(['enqueue', 'demo_cleanup', 'cleanup-remainder']);
    assert.equal((await command(['worker', '1'])).succeeded, 1);
    assert.equal(await em.count(db.DemoWorkspace, {}), 0);
    const runtime = await createJobRuntime(orm);
    assert.equal(runtime.registry.demo_cleanup.defaultIntervalSeconds, 300);
  }));

test('aborted cleanup leaves expired data intact', async () =>
  fixture(async (orm, db) => {
    const now = await databaseTime(orm.em.fork());
    const em = orm.em.fork();
    em.create(db.DemoWorkspace, {
      status: db.DemoWorkspaceStatus.Provisioning,
      templateVersion: 1,
      generation: 1,
      createdAt: new Date(now.getTime() - 60000),
      lastActivityAt: new Date(now.getTime() - 60000),
      idleExpiresAt: new Date(now.getTime() - 1000),
      expiresAt: new Date(now.getTime() + 60000),
    });
    await em.flush();
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(cleanupExpiredDemoWorkspaces(orm, 10, controller.signal));
    assert.equal(await em.count(db.DemoWorkspace, {}), 1);
  }));
