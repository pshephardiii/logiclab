import { createJobRuntime } from '../../src/bootstrap/jobs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { runJobsCommand } from '../../src/operator/jobs/run';
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

test('operator commands safely setup, toggle, enqueue, execute and inspect bounded job history', async () => {
  const {
    createDatabase,
    JobSchedule,
    DurableJob,
    JobType,
    JobRunStatus,
    User,
    UserRole,
    Classroom,
    BillingPlan,
    BillingModel,
    ClassCapability,
    ClassPurchase,
    BillingProvider,
    PurchaseStatus,
  } = await import('@logiclab/db');
  const schema = `operator_${randomUUID().replaceAll('-', '')}`;
  const orm = await createDatabase(url!, { schema, snapshotOnMigrate: false });
  const em = orm.em.fork();
  async function command(args: string[], expectedCode = 0) {
    const output: string[] = [];
    const errors: string[] = [];
    const code = await runJobsCommand(
      args,
      { DATABASE_URL: url },
      { out: (text) => output.push(text), error: (text) => errors.push(text) },
      async (connectionString, options) => createDatabase(connectionString, { ...options, schema }),
    );
    assert.equal(code, expectedCode, errors.join('\n'));
    return output.length ? JSON.parse(output[0]!) : null;
  }
  try {
    await orm.schema.create();
    const setup = await command(['setup', 'billing_reconciliation']);
    assert.equal((await em.findOneOrFail(JobSchedule, setup.scheduleId)).enabled, false);
    await em.nativeUpdate(JobSchedule, setup.scheduleId, { intervalSeconds: 600, maxAttempts: 2 });
    assert.equal((await command(['setup', 'billing_reconciliation'])).scheduleId, setup.scheduleId);
    assert.equal((await command(['schedules'])).schedules[0].intervalSeconds, 600);
    await em.nativeUpdate(JobSchedule, setup.scheduleId, { nextRunAt: new Date(0) });
    assert.equal((await command(['enable', setup.scheduleId])).schedule.enabled, true);
    assert.equal((await command(['scheduler', '1'])).scheduled, 1);
    assert.equal((await command(['pause', setup.scheduleId])).schedule.enabled, false);
    assert.equal((await command(['scheduler'])).scheduled, 0);
    const [enqueue, retry] = await Promise.all([
      command(['enqueue', 'billing_reconciliation', 'manual-intent']),
      command(['enqueue', 'billing_reconciliation', 'manual-intent']),
    ]);
    assert.equal(enqueue.jobId, retry.jobId);
    assert.equal(await em.count(DurableJob, {}), 2);
    const firstPage = await command(['list', '0', '1']);
    assert.equal(firstPage.nextOffset, 1);
    assert.equal((await command(['list', '1', '1'])).nextOffset, null);
    const worker = await command(['worker', '10']);
    assert.equal(worker.succeeded, 2);
    assert.equal(worker.jobs.length, 2);
    assert(
      worker.jobs.every((row: { inspectCommand: string }) =>
        row.inspectCommand.includes('inspect'),
      ),
    );
    const report = await command(['inspect', enqueue.jobId]);
    assert.equal(report.job.status, 'succeeded');
    assert.equal(report.findingCount, 0);
    assert.equal(report.runs[0].recordsChecked, 0);
    assert(!JSON.stringify(report).includes('leaseToken'));
    assert(!JSON.stringify(report).includes('deduplicationKey'));
    assert.deepEqual((await command(['findings', enqueue.jobId])).findings, []);
    const unknown = await command(['inspect', randomUUID()], 1);
    assert.equal(unknown, null);
    // A successful report containing discrepancies still exits zero and supports finding pagination.
    const owner = em.create(User, {
      cognitoUserPoolId: schema,
      cognitoSubject: randomUUID(),
      role: UserRole.Instructor,
    });
    const classroom = em.create(Classroom, { owner, name: 'Operator report class' });
    const plan = em.create(BillingPlan, {
      name: 'Class plan',
      billingModel: BillingModel.OneTime,
      amountMinor: 2500,
      currency: 'USD',
      coverageDays: 180,
      capability: ClassCapability.PublishAssignments,
    });
    em.persist([owner, classroom, plan]);
    for (let index = 0; index < 2; index += 1)
      em.persist(
        em.create(ClassPurchase, {
          classroom,
          payer: owner,
          plan,
          requestId: randomUUID(),
          provider: BillingProvider.Simulator,
          checkoutReference: randomUUID(),
          amountMinor: 2500,
          currency: 'USD',
          coverageDays: 180,
          status: PurchaseStatus.Paid,
        }),
      );
    await em.flush();
    const discrepancy = await command(['enqueue', 'billing_reconciliation', 'report-findings']);
    assert.equal((await command(['worker', '1'])).succeeded, 1);
    const discrepancyReport = await command(['inspect', discrepancy.jobId]);
    assert.equal(discrepancyReport.findingCount, 2);
    assert.equal(discrepancyReport.runs[0].findingsCount, 2);
    const findingsFirst = await command(['findings', discrepancy.jobId, '0', '1']);
    const findingsNext = await command(['findings', discrepancy.jobId, '1', '1']);
    assert.equal(findingsFirst.nextOffset, 1);
    assert.equal(findingsNext.nextOffset, null);
    assert.equal(findingsFirst.findings[0].kind, 'paid_purchase_missing_grant');
    assert.notEqual(findingsFirst.findings[0].id, findingsNext.findings[0].id);
    // Simulate a crash: recovery is attention-worthy even if no eligible work is executed afterward.
    const crash = await command(['enqueue', 'billing_reconciliation', 'crash']);
    const runtime = await createJobRuntime(orm);
    const claim = await runtime.store.claim();
    assert.equal(claim!.id, crash.jobId);
    await em.nativeUpdate(DurableJob, crash.jobId, { leaseExpiresAt: new Date(0) });
    const recovered = await command(['worker', '1'], 2);
    assert.equal(recovered.recovered, 1);
    const recoveryReport = await command(['inspect', crash.jobId]);
    assert.equal(recoveryReport.runs[0].status, JobRunStatus.LeaseExpired);
    assert.equal(recoveryReport.runs[0].errorCode, 'LEASE_EXPIRED');
    assert.equal(
      (await em.fork().findOneOrFail(DurableJob, crash.jobId)).jobType,
      JobType.BillingReconciliation,
    );
  } finally {
    await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
