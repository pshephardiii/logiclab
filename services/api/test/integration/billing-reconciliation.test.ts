import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { createBillingReconciliationReader } from '../../src/persistence/jobs/billing-reconciliation';
import { createBillingReconciliationHandler } from '../../src/application/jobs/billing-reconciliation/handler';
import { createJobRuntime } from '../../src/bootstrap/jobs';
import { createJobRegistry } from '../../src/application/jobs/registry';
import { createJobStore } from '../../src/persistence/jobs/store';
import { runWorkerCycle } from '../../src/application/jobs/cycles';

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
  const schema = `reconcile_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await check(orm, db);
  } finally {
    await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}

test('reconciliation reports discrepancies platform-wide, preserves all billing data, and persists deduplicated retry results', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const owner = em.create(db.User, {
      cognitoUserPoolId: 'reconcile',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    const other = em.create(db.User, {
      cognitoUserPoolId: 'reconcile',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    const classroom = em.create(db.Classroom, { owner, name: 'First class' });
    const otherClass = em.create(db.Classroom, { owner: other, name: 'Second class' });
    const plan = em.create(db.BillingPlan, {
      name: 'Catalog now differs',
      billingModel: db.BillingModel.OneTime,
      amountMinor: 9900,
      currency: 'USD',
      coverageDays: 90,
      capability: db.ClassCapability.PublishAssignments,
    });
    const start = new Date(Date.now() - 86400000);
    function purchase(
      status: (typeof db.PurchaseStatus)[keyof typeof db.PurchaseStatus],
      target = classroom,
    ) {
      return em.create(db.ClassPurchase, {
        classroom: target,
        payer: target.owner,
        plan,
        status,
        requestId: randomUUID(),
        provider: db.BillingProvider.Simulator,
        checkoutReference: randomUUID(),
        amountMinor: 2500,
        currency: 'USD',
        coverageDays: 180,
        createdAt: new Date(start.getTime() - 1000),
      });
    }
    function grant(row: ReturnType<typeof purchase>, days = 180, startsAt = start) {
      return em.create(db.ClassEntitlement, {
        classroom: row.classroom,
        provider: row.provider,
        source: db.EntitlementSource.ClassPurchase,
        sourceReference: row.checkoutReference,
        startsAt,
        endsAt: new Date(startsAt.getTime() + days * 86400000),
      });
    }
    const missing = purchase(db.PurchaseStatus.Paid, otherClass);
    const mismatched = purchase(db.PurchaseStatus.Paid);
    const refunded = purchase(db.PurchaseStatus.Refunded);
    const expired = purchase(db.PurchaseStatus.Paid);
    expired.createdAt = new Date(Date.now() - 201 * 86400000);
    const revoked = purchase(db.PurchaseStatus.Paid);
    const pending = purchase(db.PurchaseStatus.Pending);
    const failed = purchase(db.PurchaseStatus.Failed);
    const refundedExpired = purchase(db.PurchaseStatus.Refunded);
    refundedExpired.createdAt = expired.createdAt;
    const wrongGrant = grant(mismatched, 90);
    const refundedGrant = grant(refunded);
    const expiredGrant = grant(expired, 180, new Date(Date.now() - 200 * 86400000));
    const revokedGrant = grant(revoked);
    revokedGrant.revokedAt = new Date();
    const oldRefundGrant = grant(refundedExpired, 180, expiredGrant.startsAt);
    em.persist([
      owner,
      other,
      classroom,
      otherClass,
      plan,
      missing,
      mismatched,
      refunded,
      expired,
      revoked,
      pending,
      failed,
      refundedExpired,
      wrongGrant,
      refundedGrant,
      expiredGrant,
      revokedGrant,
      oldRefundGrant,
    ]);
    await em.flush();
    const billingState = () =>
      em
        .getConnection()
        .execute(
          `select * from (select 'purchase' as kind, to_jsonb(p) as data from "${orm.config.get('schema')}".class_purchases p union all select 'grant', to_jsonb(g) from "${orm.config.get('schema')}".class_entitlements g) records order by kind, data::text`,
        );
    // Snapshot raw financial rows before execution; the job must change none of them.
    const before = await billingState();
    const runtime = await createJobRuntime(orm);
    const id = await runtime.store.enqueue(db.JobType.BillingReconciliation, 'report-one');
    const result = await runWorkerCycle(runtime.store, runtime.registry, 1);
    assert.equal(result.succeeded, 1);
    const findings = await em.find(db.ReconciliationFinding, { job: id });
    assert.deepEqual(
      findings.map((row) => row.kind).sort(),
      [
        'paid_purchase_missing_grant',
        'purchase_grant_terms_mismatch',
        'refunded_purchase_active_grant',
      ].sort(),
    );
    assert(findings.some((row) => row.purchaseId === missing.id && row.classId === otherClass.id));
    assert.equal((await em.findOneOrFail(db.JobRun, { job: id })).recordsChecked, 8);
    assert.deepEqual(await billingState(), before);
    // A failed report attempt writes no findings; subsequent execution of the same job writes one set.
    const reader = await createBillingReconciliationReader(orm);
    const handler = createBillingReconciliationHandler(reader);
    let fail = true;
    const retryRegistry = createJobRegistry({
      billing_reconciliation: async (context) => {
        const report = await handler(context);
        if (fail) {
          fail = false;
          throw new Error('simulate crash before finalization');
        }
        return report;
      },
    });
    const retryStore = await createJobStore(orm, retryRegistry);
    const retryId = await retryStore.enqueue(db.JobType.BillingReconciliation, 'report-retry');
    assert.equal((await runWorkerCycle(retryStore, retryRegistry, 1)).retry, 1);
    assert.equal(await em.count(db.ReconciliationFinding, { job: retryId }), 0);
    await em.nativeUpdate(db.DurableJob, retryId, { availableAt: new Date(0) });
    assert.equal((await runWorkerCycle(retryStore, retryRegistry, 1)).succeeded, 1);
    assert.equal(await em.count(db.ReconciliationFinding, { job: retryId }), 3);
    assert.equal(await em.count(db.JobRun, { job: retryId }), 2);
    assert.deepEqual(await billingState(), before);
    // A scan limit is a failed attempt, never a partial successful report.
    const limited = createBillingReconciliationHandler(
      await createBillingReconciliationReader(orm, {
        batchSize: 1,
        maxPurchases: 1,
        maxGrantsPerBatch: 1,
      }),
    );
    const limitedRegistry = createJobRegistry({ billing_reconciliation: limited });
    const limitedStore = await createJobStore(orm, limitedRegistry);
    const limitedId = await limitedStore.enqueue(db.JobType.BillingReconciliation, 'limited');
    assert.equal((await runWorkerCycle(limitedStore, limitedRegistry, 1)).retry, 1);
    assert.equal(
      (await em.findOneOrFail(db.JobRun, { job: limitedId })).errorCode,
      'RECONCILIATION_SCAN_LIMIT',
    );
    assert.equal(await em.count(db.ReconciliationFinding, { job: limitedId }), 0);
  }));

test('snapshot scans never mix a pre-payment purchase with post-payment grants across batches', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const owner = em.create(db.User, {
      cognitoUserPoolId: 'snapshot',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    const classroom = em.create(db.Classroom, { owner, name: 'Snapshot class' });
    const plan = em.create(db.BillingPlan, {
      name: 'Plan',
      billingModel: db.BillingModel.OneTime,
      amountMinor: 2500,
      currency: 'USD',
      coverageDays: 180,
      capability: db.ClassCapability.PublishAssignments,
    });
    const purchases = [1, 2].map((index) =>
      em.create(db.ClassPurchase, {
        id: `00000000-0000-4000-8000-00000000000${index}`,
        classroom,
        payer: owner,
        plan,
        requestId: randomUUID(),
        provider: db.BillingProvider.Simulator,
        checkoutReference: randomUUID(),
        amountMinor: 2500,
        currency: 'USD',
        coverageDays: 180,
      }),
    );
    em.persist([owner, classroom, plan, ...purchases]);
    await em.flush();
    const writer = orm.em.fork();
    await writer.begin();
    try {
      await writer.nativeUpdate(db.ClassPurchase, purchases[1]!.id, {
        status: db.PurchaseStatus.Paid,
      });
      const startsAt = new Date();
      writer.persist(
        writer.create(db.ClassEntitlement, {
          classroom,
          provider: db.BillingProvider.Simulator,
          source: db.EntitlementSource.ClassPurchase,
          sourceReference: purchases[1]!.checkoutReference,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 180 * 86400000),
        }),
      );
      await writer.flush();
      const reader = await createBillingReconciliationReader(orm, {
        batchSize: 1,
        maxPurchases: 10,
        maxGrantsPerBatch: 10,
      });
      const seen: string[] = [];
      let batches = 0;
      await reader.scan(new AbortController().signal, async (batch) => {
        seen.push(...batch.purchases.map((row) => row.status));
        if (batches++ === 0) await writer.commit();
        if (batch.purchases[0]!.id === purchases[1]!.id) assert.equal(batch.grants.length, 0);
      });
      assert.deepEqual(seen, ['pending', 'pending']);
      const report = await createBillingReconciliationHandler(reader)({
        jobId: randomUUID(),
        attempt: 1,
        signal: new AbortController().signal,
      });
      assert.deepEqual(report, { recordsChecked: 2, findings: [] });
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(reader.scan(controller.signal, () => {}));
    } finally {
      if (writer.isInTransaction()) await writer.rollback();
    }
  }));
