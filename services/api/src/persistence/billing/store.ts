import { transactionRunner, type DatabaseManager } from '../transactions';
import { checkoutBlockedReason } from './checkout-availability';
import { purchaseResponse } from './purchase-response';
import { createBillingReadStore, type BillingReadStore } from './read-store';
import type { createDatabase, ClassPurchase as PurchaseEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { CheckoutRequest, PurchaseResponse } from '@logiclab/contracts';
import type {
  PaymentProvider,
  PaymentEvent,
  CheckoutSession,
} from '../../application/billing/provider';
import { purchaseTerms } from '../../application/billing/purchase-terms';
import { BillingError } from '../../application/billing/errors';

export type VerifiedDelivery = { event: PaymentEvent; hash: string };
export interface BillingStore extends BillingReadStore {
  checkout(
    ownerId: string,
    classId: string,
    input: CheckoutRequest,
    provider: PaymentProvider,
  ): Promise<PurchaseResponse>;
  process(delivery: VerifiedDelivery): Promise<{ result: 'applied' | 'ignored' | 'duplicate' }>;
  simulate(
    ownerId: string,
    purchaseId: string,
    makeDelivery: (reference: string, sequence: number) => VerifiedDelivery,
  ): Promise<{ result: 'applied' | 'ignored' | 'duplicate' }>;
}
/** Purchase row locks serialize event effects; receipts and coverage commit or roll back together. */
export async function createBillingStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<BillingStore> {
  const transact = transactionRunner(orm, transaction);
  const {
    Classroom,
    BillingPlan,
    ClassPurchase,
    ClassEntitlement,
    PaymentEvent: Receipt,
    BillingProvider,
    PurchaseStatus,
    EntitlementSource,
    LockMode,
  } = await import('@logiclab/db');
  type Manager = typeof orm.em;
  async function apply(em: Manager, purchase: PurchaseEntity, delivery: VerifiedDelivery) {
    // Publication holds this class lock in shared mode until its transaction commits.
    await em.findOneOrFail(Classroom, purchase.classroom.id, {
      lockMode: LockMode.PESSIMISTIC_WRITE,
    });
    const { event, hash } = delivery;
    const existing = await em.findOne(Receipt, {
      provider: BillingProvider.Simulator,
      eventId: event.id,
    });
    if (existing) {
      if (existing.payloadHash !== hash || existing.sourceReference !== event.sourceReference)
        throw new BillingError('event_conflict');
      return { result: 'duplicate' as const };
    }
    const occurred = new Date(event.occurredAt);
    if (
      event.sourceReference !== purchase.checkoutReference ||
      !Number.isSafeInteger(event.sequence) ||
      event.sequence > 2147483647 ||
      occurred.getTime() < purchase.createdAt.getTime() ||
      occurred.getTime() > Date.now() + 300_000
    )
      throw new BillingError('invalid_event');
    // Ignore older deliveries even when their event ID differs. Refunded coverage cannot be restored.
    const ignored = event.sequence <= purchase.lastEventSequence && event.outcome !== 'refunded';
    if (!ignored) {
      purchase.lastEventSequence = Math.max(purchase.lastEventSequence, event.sequence);
      if (event.outcome === 'refunded') {
        purchase.status = PurchaseStatus.Refunded;
        const grants = await em.find(ClassEntitlement, {
          provider: BillingProvider.Simulator,
          source: EntitlementSource.ClassPurchase,
          sourceReference: purchase.checkoutReference,
        });
        for (const grant of grants) grant.revokedAt ??= occurred;
      } else if (event.outcome === 'paid' && purchase.status === PurchaseStatus.Pending) {
        purchase.status = PurchaseStatus.Paid;
        const endsAt = new Date(occurred.getTime() + purchase.coverageDays * 86_400_000);
        if (!Number.isFinite(endsAt.getTime())) throw new BillingError('invalid_event');
        em.persist(
          em.create(ClassEntitlement, {
            classroom: purchase.classroom,
            provider: BillingProvider.Simulator,
            source: EntitlementSource.ClassPurchase,
            sourceReference: purchase.checkoutReference,
            capability: purchase.capability,
            startsAt: occurred,
            endsAt,
          }),
        );
      } else if (event.outcome === 'failed' && purchase.status === PurchaseStatus.Pending)
        purchase.status = PurchaseStatus.Failed;
    }
    // Reserve event identity atomically; conflicts roll back all effects and can be retried.
    em.persist(
      em.create(Receipt, {
        provider: BillingProvider.Simulator,
        eventId: event.id,
        sourceReference: event.sourceReference,
        sequence: event.sequence,
        payloadHash: hash,
      }),
    );
    await em.flush();
    return { result: ignored ? ('ignored' as const) : ('applied' as const) };
  }
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
        return apply(em, purchase, delivery);
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
        return apply(
          em,
          purchase,
          makeDelivery(purchase.checkoutReference, purchase.lastEventSequence + 1),
        );
      });
    },
  };
}
