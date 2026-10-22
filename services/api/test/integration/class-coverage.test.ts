import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createProblemStore } from '../../src/persistence/problem/store';
import { hasClassCapability } from '../../src/persistence/billing/class-coverage';
import { createBillingStore } from '../../src/persistence/billing/store';
import { createBillingService } from '../../src/application/billing/service';
import { createSimulatorProvider } from '../../src/integrations/payments/simulator/provider';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

test(
  'new publication requires current class coverage, retains old work, and serializes with refunds',
  { timeout: 30_000 },
  async () => {
    const {
      createDatabase,
      User,
      UserRole,
      Classroom,
      ClassEntitlement,
      ClassCapability,
      BillingProvider,
      EntitlementSource,
      Assignment,
      BillingPlan,
      BillingModel,
      LockMode,
    } = await import('@logiclab/db');
    const schema = `coverage_${randomUUID().replaceAll('-', '')}`;
    const orm = await createDatabase(url, { schema, snapshotOnMigrate: false });
    const assignments = await createAssignmentStore(orm);
    const problems = await createProblemStore(orm);
    const config = { signingSecret: 'ab'.repeat(32) };
    const billing = createBillingService(
      await createBillingStore(orm),
      createSimulatorProvider(config),
      config,
    );
    const em = orm.em.fork();
    async function waitForLock() {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const rows = await em
          .getConnection()
          .execute<{ count: number }[]>(
            `select count(*)::int as count from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like '%${schema}%'`,
          );
        if (rows[0]!.count > 0) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.fail('Expected class capability operation to wait for a lock.');
    }
    try {
      await orm.schema.create();
      const owner = em.create(User, {
        cognitoUserPoolId: schema,
        cognitoSubject: 'owner',
        role: UserRole.Instructor,
      });
      const classroom = em.create(Classroom, { owner, name: 'Covered class' });
      const otherClass = em.create(Classroom, { owner, name: 'Unfunded class' });
      em.persist([owner, classroom, otherClass]);
      await em.flush();
      const problem = await problems.create(owner.id, {
        title: 'P',
        definition: { definitionVersion: 1, type: 'truth_table', formula: 'P' },
      });
      const publication = await problems.publish(owner.id, problem.id);
      if (publication.status !== 'published') throw new Error('Fixture publication failed');
      const input = {
        title: 'Homework',
        problemVersionIds: [publication.version.id],
        assessmentMode: 'graded' as const,
        feedbackTiming: 'on_submission' as const,
        solutionAccess: 'never' as const,
      };
      const draft = await assignments.create(owner.id, classroom.id, input);
      const assertDenied = async (id = draft.id) => {
        await assert.rejects(
          assignments.publish(owner.id, id),
          (error: any) => error.reason === 'coverage_required',
        );
        assert.equal((await assignments.findOwned(owner.id, id)).publishedAt, null);
      };
      await assertDenied();
      await assignments.update(owner.id, draft.id, { title: 'Still editable without payment' });

      const start = new Date('2026-10-01T00:00:00Z');
      const end = new Date('2026-11-01T00:00:00Z');
      const grant = em.create(ClassEntitlement, {
        classroom,
        capability: ClassCapability.PublishAssignments,
        provider: BillingProvider.Simulator,
        source: EntitlementSource.ClassPurchase,
        sourceReference: randomUUID(),
        startsAt: start,
        endsAt: end,
      });
      em.persist(grant);
      await em.flush();
      async function covered(at: Date) {
        return orm.em
          .fork()
          .transactional((manager) =>
            hasClassCapability(manager, classroom.id, ClassCapability.PublishAssignments, () => at),
          );
      }
      assert.equal(await covered(new Date(start.getTime() - 1)), false);
      assert.equal(await covered(start), true);
      assert.equal(await covered(new Date(end.getTime() - 1)), true);
      assert.equal(await covered(end), false);
      grant.startsAt = new Date(Date.now() + 60_000);
      grant.endsAt = new Date(Date.now() + 120_000);
      await em.flush();
      await assertDenied();
      grant.startsAt = new Date(Date.now() - 120_000);
      grant.endsAt = new Date(Date.now() - 60_000);
      await em.flush();
      await assertDenied();
      grant.endsAt = new Date(Date.now() + 60_000);
      grant.revokedAt = new Date();
      await em.flush();
      await assertDenied();

      // One revoked source does not defeat separate valid coverage; another class cannot borrow it.
      const active = em.create(ClassEntitlement, {
        classroom,
        provider: BillingProvider.Simulator,
        source: EntitlementSource.ClassPurchase,
        sourceReference: randomUUID(),
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 86_400_000),
      });
      em.persist(active);
      await em.flush();
      const foreignDraft = await assignments.create(owner.id, otherClass.id, input);
      await assertDenied(foreignDraft.id);
      const published = await assignments.publish(owner.id, draft.id);
      assert(published.publishedAt);
      active.revokedAt = new Date();
      await em.flush();
      assert.equal(
        (await assignments.publish(owner.id, draft.id)).publishedAt,
        published.publishedAt,
      );
      await assignments.setArchived(owner.id, draft.id, true);
      assert.equal(
        (await assignments.setArchived(owner.id, draft.id, false)).publishedAt,
        published.publishedAt,
      );
      const nextDraft = await assignments.create(owner.id, classroom.id, input);
      await assertDenied(nextDraft.id);

      const plan = em.create(BillingPlan, {
        name: 'Class period',
        billingModel: BillingModel.OneTime,
        amountMinor: 2500,
        currency: 'USD',
        capability: ClassCapability.PublishAssignments,
        coverageDays: 180,
      });
      em.persist(plan);
      await em.flush();
      const checkout = await billing.checkout(owner.id, classroom.id, {
        planId: plan.id,
        requestId: randomUUID(),
      });
      await billing.simulate(owner.id, checkout.purchase.id, 'paid');
      const paidGrant = await em.findOneOrFail(ClassEntitlement, { classroom, revokedAt: null });

      // Refund committed first: publication must wait and then reject the revoked grant.
      const refund = orm.em.fork();
      await refund.begin();
      let publishing: Promise<unknown> | undefined;
      try {
        await refund.findOneOrFail(Classroom, classroom.id, {
          lockMode: LockMode.PESSIMISTIC_WRITE,
        });
        await refund.nativeUpdate(ClassEntitlement, paidGrant.id, { revokedAt: new Date() });
        publishing = assignments.publish(owner.id, nextDraft.id);
        const rejected = assert.rejects(
          publishing,
          (error: any) => error.reason === 'coverage_required',
        );
        await waitForLock();
        await refund.commit();
        await rejected;
      } finally {
        if (refund.isInTransaction()) await refund.rollback();
        await publishing?.catch(() => {});
      }

      // Publication committed first: real refund processing waits for the publication's shared lock.
      await em.nativeUpdate(ClassEntitlement, paidGrant.id, { revokedAt: null });
      const publisher = orm.em.fork();
      await publisher.begin();
      let refunding: ReturnType<typeof billing.simulate> | undefined;
      try {
        assert(
          await hasClassCapability(publisher, classroom.id, ClassCapability.PublishAssignments),
        );
        await publisher.nativeUpdate(Assignment, nextDraft.id, { publishedAt: new Date() });
        refunding = billing.simulate(owner.id, checkout.purchase.id, 'refunded');
        await waitForLock();
        await publisher.commit();
        await refunding;
      } finally {
        if (publisher.isInTransaction()) await publisher.rollback();
        await refunding?.catch(() => {});
      }
      assert((await assignments.findOwned(owner.id, nextDraft.id)).publishedAt);
      assert((await em.fork().findOneOrFail(ClassEntitlement, paidGrant.id)).revokedAt);
    } finally {
      await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
      await orm.close(true);
    }
  },
);
