import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createJobRegistry } from '../../src/application/jobs/registry';
import { runSchedulerCycle, runWorkerCycle } from '../../src/application/jobs/cycles';
import { createJobStore } from '../../src/persistence/jobs/store';
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
  const schema = `jobs_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await check(orm, db);
  } finally {
    await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}

test('scheduler cycles preserve overrides, deduplicate concurrent occurrences and bound catch-up', async () =>
  fixture(async (orm, db) => {
    const registry = createJobRegistry();
    const store = await createJobStore(orm, registry);
    const em = orm.em.fork();
    const type = db.JobType.BillingReconciliation;
    const [id, repeated] = await Promise.all([
      store.setupSchedule(type),
      store.setupSchedule(type),
    ]);
    assert.equal(id, repeated);
    let schedule = await em.findOneOrFail(db.JobSchedule, id);
    assert.equal(schedule.enabled, false);
    assert.equal(schedule.intervalSeconds, 3600);
    assert.equal((await runSchedulerCycle(store)).scheduled, 0);
    const overdue = new Date('2000-01-01T00:00:00Z');
    await em.nativeUpdate(db.JobSchedule, id, {
      enabled: true,
      intervalSeconds: 600,
      maxAttempts: 2,
      nextRunAt: overdue,
    });
    await store.setupSchedule(type);
    em.clear();
    schedule = await em.findOneOrFail(db.JobSchedule, id);
    assert.equal(schedule.enabled, true);
    assert.equal(schedule.intervalSeconds, 600);
    assert.equal(schedule.maxAttempts, 2);
    const cycles = await Promise.all([runSchedulerCycle(store, 1), runSchedulerCycle(store, 1)]);
    assert.equal(
      cycles.reduce((count, value) => count + value.scheduled, 0),
      1,
    );
    assert.equal(await em.count(db.DurableJob, {}), 1);
    em.clear();
    schedule = await em.findOneOrFail(db.JobSchedule, id);
    assert(schedule.nextRunAt > new Date());
    assert.equal((schedule.nextRunAt.getTime() - overdue.getTime()) % 600000, 0);
    const job = await em.findOneOrFail(db.DurableJob, { schedule: id });
    assert.equal(job.scheduledFor!.getTime(), overdue.getTime());
    assert.equal(job.maxAttempts, 2);
    assert.equal((await runSchedulerCycle(store)).scheduled, 0);
    const manual = await Promise.all([
      store.enqueue(type, 'manual-key'),
      store.enqueue(type, 'manual-key'),
    ]);
    assert.equal(manual[0], manual[1]);
    assert.equal(await em.count(db.DurableJob, {}), 2);
  }));

test('workers claim separately, skip locks, finalize results once, and retain deduplicated findings', async () =>
  fixture(async (orm, db) => {
    const kind = db.JobType.BillingReconciliation;
    const registry = createJobRegistry();
    const store = await createJobStore(orm, registry);
    const em = orm.em.fork();
    const first = await store.enqueue(kind, 'first');
    const second = await store.enqueue(kind, 'second');
    const lock = orm.em.fork();
    await lock.begin();
    let claimed;
    try {
      await lock.findOneOrFail(db.DurableJob, first, { lockMode: db.LockMode.PESSIMISTIC_WRITE });
      claimed = await store.claim();
      assert.equal(claimed!.id, second);
      await lock.commit();
    } finally {
      if (lock.isInTransaction()) await lock.rollback();
    }
    const other = await store.claim();
    assert.equal(other!.id, first);
    assert.equal(await store.claim(), null);
    const finding = {
      kind: db.FindingKind.PaidPurchaseMissingGrant,
      purchaseId: randomUUID(),
      classId: randomUUID(),
    };
    assert.equal(
      await store.finish(claimed!, {
        ok: true,
        result: { recordsChecked: 4, findings: [finding, finding] },
      }),
      'succeeded',
    );
    assert.equal(
      await store.finish(claimed!, {
        ok: true,
        result: { recordsChecked: 4, findings: [finding] },
      }),
      'stale',
    );
    assert.equal(await em.count(db.ReconciliationFinding, { job: second }), 1);
    assert.equal((await em.findOneOrFail(db.JobRun, { job: second })).findingsCount, 1);
    await store.finish(other!, { ok: true, result: { recordsChecked: 0, findings: [] } });
    // Concurrent cycles execute independent claimed jobs, not a handler inside a lock transaction.
    let executions = 0;
    const handlers = createJobRegistry({
      billing_reconciliation: async () => {
        executions += 1;
        return { recordsChecked: 1, findings: [] };
      },
    });
    const activeStore = await createJobStore(orm, handlers);
    await activeStore.enqueue(kind, 'concurrent-a');
    await activeStore.enqueue(kind, 'concurrent-b');
    const results = await Promise.all([
      runWorkerCycle(activeStore, handlers, 1),
      runWorkerCycle(activeStore, handlers, 1),
    ]);
    assert.equal(executions, 2);
    assert.equal(
      results.reduce((count, value) => count + value.succeeded, 0),
      2,
    );
  }));

test('expired leases retry with fresh fencing tokens, exhaust safely, and reject stale findings', async () =>
  fixture(async (orm, db) => {
    const registry = createJobRegistry();
    const store = await createJobStore(orm, registry);
    const em = orm.em.fork();
    const id = await store.enqueue(db.JobType.BillingReconciliation, 'crash');
    const first = (await store.claim())!;
    await em.nativeUpdate(db.DurableJob, id, { leaseExpiresAt: new Date(0) });
    const success = { ok: true as const, result: { recordsChecked: 0, findings: [] } };
    assert.equal(await store.finish(first, success), 'stale');
    const recoveries = await Promise.all([store.recoverExpired(10), store.recoverExpired(10)]);
    assert.equal(
      recoveries.reduce((count, recovered) => count + recovered, 0),
      1,
    );
    assert.equal(await store.claim(), null);
    await em.nativeUpdate(db.DurableJob, id, { availableAt: new Date(0) });
    const second = (await store.claim())!;
    assert.notEqual(first.leaseToken, second.leaseToken);
    assert.equal(second.attempt, 2);
    assert.equal(await store.finish(first, success), 'stale');
    assert.equal(await store.finish(second, { ok: false, code: 'HANDLER_FAILED' }), 'retry');
    await em.nativeUpdate(db.DurableJob, id, { availableAt: new Date(0) });
    const last = (await store.claim())!;
    assert.equal(last.attempt, 3);
    await em.nativeUpdate(db.DurableJob, id, { leaseExpiresAt: new Date(0) });
    assert.equal(await store.recoverExpired(10), 1);
    em.clear();
    assert.equal((await em.findOneOrFail(db.DurableJob, id)).status, db.JobStatus.Failed);
    assert.equal(await em.count(db.JobRun, { job: id }), 3);
    assert.equal(await store.finish(last, success), 'stale');
    assert.equal(await store.claim(), null);
    assert.equal(await em.count(db.ReconciliationFinding, { job: id }), 0);
  }));

test('result persistence rolls back completely and missing/invalid handlers never report success', async () =>
  fixture(async (orm, db) => {
    const registry = createJobRegistry();
    const store = await createJobStore(orm, registry);
    const em = orm.em.fork();
    const id = await store.enqueue(db.JobType.BillingReconciliation, 'atomic');
    const claim = (await store.claim())!;
    const finding = {
      kind: db.FindingKind.PaidPurchaseMissingGrant,
      purchaseId: randomUUID(),
      classId: randomUUID(),
    };
    // Force failure after a finding is inserted but before the run can commit.
    const table = `"${orm.config.get('schema')}".job_runs`;
    await em.execute(
      `alter table ${table} add constraint reject_success check (status <> 'succeeded')`,
    );
    await assert.rejects(
      store.finish(claim, { ok: true, result: { recordsChecked: 1, findings: [finding] } }),
    );
    assert.equal(await em.count(db.ReconciliationFinding, { job: id }), 0);
    assert.equal((await em.findOneOrFail(db.DurableJob, id)).status, db.JobStatus.Running);
    await em.execute(`alter table ${table} drop constraint reject_success`);
    assert.equal(
      await store.finish(claim, { ok: true, result: { recordsChecked: 1, findings: [finding] } }),
      'succeeded',
    );
    const missingId = await store.enqueue(db.JobType.BillingReconciliation, 'missing');
    assert.equal((await runWorkerCycle(store, registry, 1)).retry, 1);
    assert.equal(
      (await em.findOneOrFail(db.JobRun, { job: missingId })).errorCode,
      'HANDLER_UNAVAILABLE',
    );
    const invalidId = await store.enqueue(db.JobType.BillingReconciliation, 'invalid');
    const invalid = (await store.claim())!;
    assert.equal(invalid.id, invalidId);
    assert.equal(
      await store.finish(invalid, { ok: true, result: { recordsChecked: -1, findings: [] } }),
      'retry',
    );
  }));
