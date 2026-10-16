import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createBillingStore } from '../../src/persistence/billing/store';
import { createBillingService } from '../../src/application/billing/service';
import { createSimulatorProvider } from '../../src/integrations/payments/simulator/provider';
import { createSimulatorWrapper } from '../../src/integrations/payments/simulator/wrapper';
import {
  createSimulatorEvent,
  signSimulatorEvent,
} from '../../src/integrations/payments/simulator/events';
import { buildApp } from '../../src/app';
import { readAuthConfig } from '../../src/config/auth';
import type { AuthContext } from '../../src/routes/auth/context';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

test(
  'billing scopes checkout, freezes terms, processes signed events atomically, and retains revoked coverage',
  { timeout: 30_000 },
  async () => {
    const {
      createDatabase,
      User,
      UserRole,
      Classroom,
      BillingPlan,
      BillingModel,
      ClassCapability,
      ClassPurchase,
      ClassEntitlement,
      PaymentEvent,
    } = await import('@logiclab/db');
    const schema = `billing_${randomUUID().replaceAll('-', '')}`;
    const orm = await createDatabase(url, { schema, snapshotOnMigrate: false });
    const config = { signingSecret: 'ab'.repeat(32) };
    const provider = createSimulatorProvider(config);
    const billing = createBillingService(await createBillingStore(orm), provider, config);
    const wrapper = createSimulatorWrapper(config);
    const em = orm.em.fork();
    let signedIn = { id: randomUUID(), role: 'instructor', subject: 'synthetic' };
    const authConfig = readAuthConfig({
      AUTH_ENABLED: 'true',
      AWS_REGION: 'us-east-1',
      COGNITO_USER_POOL_ID: 'us-east-1_test',
      COGNITO_CLIENT_ID: 'synthetic',
      COGNITO_CLIENT_SECRET: 'synthetic',
      AUTH_TOKEN_KEY: 'ab'.repeat(32),
      APP_ORIGIN: 'http://localhost:5173',
    })!;
    const context = {
      config: authConfig,
      service: { authenticate: async () => signedIn },
      billing,
    } as unknown as AuthContext & { billing: typeof billing };
    const app = buildApp({ billing: context });
    const headers = { origin: authConfig.APP_ORIGIN, cookie: `logiclab_session=${'x'.repeat(43)}` };
    try {
      await orm.schema.create();
      const owner = em.create(User, {
        id: signedIn.id,
        cognitoUserPoolId: schema,
        cognitoSubject: 'owner',
        role: UserRole.Instructor,
      });
      const foreign = em.create(User, {
        cognitoUserPoolId: schema,
        cognitoSubject: 'foreign',
        role: UserRole.Instructor,
      });
      const classroom = em.create(Classroom, { owner, name: 'Payment class' });
      const foreignClass = em.create(Classroom, { owner: foreign, name: 'Other class' });
      const plan = em.create(BillingPlan, {
        name: 'Demo class',
        billingModel: BillingModel.OneTime,
        amountMinor: 2500,
        currency: 'USD',
        coverageDays: 180,
        capability: ClassCapability.PublishAssignments,
      });
      em.persist([owner, foreign, classroom, foreignClass, plan]);
      await em.flush();
      const checkout = async (requestId = randomUUID()) =>
        billing.checkout(owner.id, classroom.id, { planId: plan.id, requestId });
      await assert.rejects(
        billing.checkout(owner.id, foreignClass.id, { planId: plan.id, requestId: randomUUID() }),
        /not_found/,
      );
      const requestId = randomUUID();
      const [first, retry] = await Promise.all([checkout(requestId), checkout(requestId)]);
      assert.equal(first.purchase.id, retry.purchase.id);
      assert.equal(await em.count(ClassPurchase, {}), 1);
      assert.equal(await em.count(ClassEntitlement, {}), 0);
      await assert.rejects(
        billing.checkout(owner.id, classroom.id, { planId: randomUUID(), requestId }),
        /request_conflict/,
      );
      plan.amountMinor = 5000;
      plan.coverageDays = 90;
      plan.active = false;
      await em.flush();
      assert.equal((await checkout(requestId)).purchase.amountMinor, 2500);
      await assert.rejects(checkout(), /plan_unavailable/);
      plan.active = true;
      await em.flush();

      const purchase = await em.findOneOrFail(ClassPurchase, first.purchase.id);
      const paid = createSimulatorEvent(purchase.checkoutReference, 1, 'paid');
      const signed = signSimulatorEvent(wrapper, paid);
      const results = await Promise.all([
        billing.webhook(signed.body, signed.signature),
        billing.webhook(signed.body, signed.signature),
      ]);
      assert.deepEqual(results.map((row) => row.result).sort(), ['applied', 'duplicate']);
      const grant = await em.findOneOrFail(ClassEntitlement, {
        sourceReference: purchase.checkoutReference,
      });
      assert.equal(grant.endsAt.getTime() - grant.startsAt.getTime(), 180 * 86_400_000);
      assert.equal(await em.count(PaymentEvent, {}), 1);
      const altered = signSimulatorEvent(wrapper, { ...paid, outcome: 'failed' });
      await assert.rejects(billing.webhook(altered.body, altered.signature), /event_conflict/);
      await assert.rejects(
        billing.webhook(signed.body + ' ', signed.signature),
        /invalid_signature/,
      );
      await assert.rejects(billing.simulate(foreign.id, purchase.id, 'refunded'), /not_found/);
      await billing.simulate(owner.id, purchase.id, 'refunded');
      const latePaid = signSimulatorEvent(
        wrapper,
        createSimulatorEvent(purchase.checkoutReference, 1, 'paid'),
      );
      assert.equal((await billing.webhook(latePaid.body, latePaid.signature)).result, 'ignored');
      await billing.simulate(owner.id, purchase.id, 'paid');
      const retained = await em.fork().findOneOrFail(ClassEntitlement, grant.id);
      assert(retained.revokedAt);
      assert.equal((await em.fork().findOneOrFail(ClassPurchase, purchase.id)).status, 'refunded');
      assert.equal(await em.count(ClassEntitlement, {}), 1);

      const failed = await checkout();
      await billing.simulate(owner.id, failed.purchase.id, 'failed');
      await billing.simulate(owner.id, failed.purchase.id, 'paid');
      assert.equal(
        (await em.fork().findOneOrFail(ClassPurchase, failed.purchase.id)).status,
        'failed',
      );
      assert.equal(await em.count(ClassEntitlement, {}), 1);
      const earlyRefund = await checkout();
      const earlyRow = await em.findOneOrFail(ClassPurchase, earlyRefund.purchase.id);
      const refund = signSimulatorEvent(
        wrapper,
        createSimulatorEvent(earlyRow.checkoutReference, 2, 'refunded'),
      );
      await billing.webhook(refund.body, refund.signature);
      const oldSuccess = signSimulatorEvent(
        wrapper,
        createSimulatorEvent(earlyRow.checkoutReference, 1, 'paid'),
      );
      assert.equal(
        (await billing.webhook(oldSuccess.body, oldSuccess.signature)).result,
        'ignored',
      );
      assert.equal(await em.count(ClassEntitlement, {}), 1);

      // A refund remains terminal even if a later invalid success arrived first.
      const reordered = await checkout();
      const reorderedRow = await em.findOneOrFail(ClassPurchase, reordered.purchase.id);
      for (const [sequence, outcome] of [
        [3, 'paid'],
        [2, 'refunded'],
        [4, 'paid'],
      ] as const) {
        const delivery = signSimulatorEvent(
          wrapper,
          createSimulatorEvent(reorderedRow.checkoutReference, sequence, outcome),
        );
        await billing.webhook(delivery.body, delivery.signature);
      }
      assert.equal(
        (await em.fork().findOneOrFail(ClassPurchase, reorderedRow.id)).status,
        'refunded',
      );
      assert(
        (
          await em
            .fork()
            .findOneOrFail(ClassEntitlement, { sourceReference: reorderedRow.checkoutReference })
        ).revokedAt,
      );

      // Simulate a database failure after entitlement creation but before receipt insertion.
      const rollback = await checkout();
      const rollbackRow = await em.findOneOrFail(ClassPurchase, rollback.purchase.id);
      const retryEvent = createSimulatorEvent(rollbackRow.checkoutReference, 1, 'paid');
      const retryDelivery = signSimulatorEvent(wrapper, retryEvent);
      await em.execute(
        `alter table "${schema}".payment_events add constraint reject_test_event check (event_id <> '${retryEvent.id}')`,
      );
      await assert.rejects(billing.webhook(retryDelivery.body, retryDelivery.signature));
      assert.equal(
        (await em.fork().findOneOrFail(ClassPurchase, rollbackRow.id)).status,
        'pending',
      );
      assert.equal(await em.count(PaymentEvent, { eventId: retryEvent.id }), 0);
      assert.equal(
        await em.count(ClassEntitlement, { sourceReference: rollbackRow.checkoutReference }),
        0,
      );
      await em.execute(`alter table "${schema}".payment_events drop constraint reject_test_event`);
      assert.equal(
        (await billing.webhook(retryDelivery.body, retryDelivery.signature)).result,
        'applied',
      );

      // HTTP policy and the raw body parser must work through real Fastify registration.
      const routeKey = randomUUID();
      const created = await app.inject({
        method: 'POST',
        url: `/api/classes/${classroom.id}/checkout`,
        headers,
        payload: { planId: plan.id, requestId: routeKey },
      });
      assert.equal(created.statusCode, 201, created.body);
      assert.equal(created.headers['cache-control'], 'no-store');
      const routePurchase = await em.findOneOrFail(ClassPurchase, created.json().purchase.id);
      const raw = signSimulatorEvent(
        wrapper,
        createSimulatorEvent(routePurchase.checkoutReference, 1, 'paid'),
      );
      const received = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook',
        headers: { 'content-type': 'application/json', 'x-logiclab-signature': raw.signature },
        payload: raw.body,
      });
      assert.equal(received.statusCode, 200, received.body);
      const badSignature = await app.inject({
        method: 'POST',
        url: '/api/billing/webhook',
        headers: { 'content-type': 'application/json', 'x-logiclab-signature': raw.signature },
        payload: raw.body + ' ',
      });
      assert.equal(badSignature.statusCode, 400);
      const guest = await app.inject({
        method: 'POST',
        url: `/api/classes/${classroom.id}/checkout`,
        headers: { origin: authConfig.APP_ORIGIN },
        payload: { planId: plan.id, requestId: randomUUID() },
      });
      assert.equal(guest.statusCode, 401);
      signedIn = { ...signedIn, role: 'student' };
      const denied = await app.inject({
        method: 'POST',
        url: `/api/classes/${classroom.id}/checkout`,
        headers,
        payload: { planId: plan.id, requestId: randomUUID() },
      });
      assert.equal(denied.statusCode, 403);
    } finally {
      await app.close();
      await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
      await orm.close(true);
    }
  },
);
