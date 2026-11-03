import type { ClassPurchase as PurchaseEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { DatabaseManager } from '../transactions';
import type { VerifiedDelivery } from './types';
import { validatedPaymentEventTime } from '../../application/billing/payment-event-validation';
import { BillingError } from '../../application/billing/errors';

/** Caller must lock the purchase and retain its transaction through receipt and coverage writes. */
export async function applyPaymentEvent(
  em: DatabaseManager,
  purchase: PurchaseEntity,
  delivery: VerifiedDelivery,
) {
  const {
    Classroom,
    ClassEntitlement,
    PaymentEvent: Receipt,
    BillingProvider,
    PurchaseStatus,
    EntitlementSource,
    LockMode,
  } = await import('@logiclab/db');
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
  const occurred = validatedPaymentEventTime(purchase, event);
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
