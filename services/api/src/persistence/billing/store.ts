import type { BillingStore } from './types';
import { applyPaymentEvent } from './apply-payment-event';
import { transactionRunner, type DatabaseManager } from '../transactions';
import { checkoutBlockedReason } from './checkout-availability';
import { purchaseResponse } from './purchase-response';
import { createBillingReadStore } from './read-store';
import type { createDatabase } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { CheckoutSession } from '../../application/billing/provider';
import { purchaseTerms } from '../../application/billing/purchase-terms';
import { BillingError } from '../../application/billing/errors';

/** Purchase row locks serialize event effects; receipts and coverage commit or roll back together. */
export async function createBillingStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<BillingStore> {
  const transact = transactionRunner(orm, transaction);

  const { Classroom, BillingPlan, ClassPurchase, BillingProvider, LockMode } =
    await import('@logiclab/db');

  const reads = await createBillingReadStore(orm, transaction);

  return {
    ...reads,

    checkout(ownerId, classId, input, provider) {
      return transact(async (em) => {
        // Serialize a user's idempotency keys across classes, then verify current class ownership.
        const { User } = await import('@logiclab/db');

        const payer = await em.findOne(
          User,
          { id: ownerId },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );

        if (!payer) throw new BillingError('not_found');

        const classroom = await em.findOne(
          Classroom,
          { id: classId, owner: ownerId },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );

        if (!classroom) throw new BillingError('not_found');

        const existing = await em.findOne(ClassPurchase, {
          payer: ownerId,
          requestId: input.requestId,
        });

        if (existing) {
          if (existing.classroom.id !== classId || existing.plan.id !== input.planId)
            throw new BillingError('request_conflict');

          return purchaseResponse(existing);
        }

        const blocked = await checkoutBlockedReason(em, classId);

        if (blocked) throw new BillingError(`checkout_${blocked}`);

        const plan = await em.findOne(
          BillingPlan,
          { id: input.planId },
          { lockMode: LockMode.PESSIMISTIC_READ },
        );

        if (!plan) throw new BillingError('plan_unavailable');

        let session: CheckoutSession;

        try {
          session = await provider.createCheckout(purchaseTerms(plan));
        } catch {
          throw new BillingError('plan_unavailable');
        }

        const purchase = em.create(ClassPurchase, {
          classroom,
          payer,
          plan,
          requestId: input.requestId,
          provider: BillingProvider.Simulator,
          checkoutReference: session.reference,
          amountMinor: session.terms.amountMinor,
          currency: session.terms.currency,
          coverageDays: session.terms.coverageDays,
          capability: plan.capability,
        });

        em.persist(purchase);
        await em.flush();

        return purchaseResponse(purchase);
      });
    },

    process(delivery) {
      return transact(async (em) => {
        const purchase = await em.findOne(
          ClassPurchase,
          {
            provider: BillingProvider.Simulator,
            checkoutReference: delivery.event.sourceReference,
          },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );

        if (!purchase) throw new BillingError('not_found');

        return applyPaymentEvent(em, purchase, delivery);
      });
    },

    simulate(ownerId, purchaseId, makeDelivery) {
      return transact(async (em) => {
        const purchase = await em.findOne(
          ClassPurchase,
          { id: purchaseId, classroom: { owner: ownerId } },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );

        if (!purchase) throw new BillingError('not_found');

        return applyPaymentEvent(
          em,
          purchase,
          makeDelivery(purchase.checkoutReference, purchase.lastEventSequence + 1),
        );
      });
    },
  };
}
