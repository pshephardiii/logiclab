import type { ClassBillingResponse } from '@logiclab/contracts';
import type { DatabaseManager } from '../transactions';

/** Caller holds the class lock; inspect all purchases, independently of history pagination. */
export async function checkoutBlockedReason(
  em: DatabaseManager,
  classId: string,
): Promise<ClassBillingResponse['checkoutBlockedReason']> {
  const { ClassPurchase, ClassEntitlement, PurchaseStatus, ClassCapability } =
    await import('@logiclab/db');
  if (await em.findOne(ClassPurchase, { classroom: classId, status: PurchaseStatus.Paid }))
    return 'paid';
  if (await em.findOne(ClassPurchase, { classroom: classId, status: PurchaseStatus.Pending }))
    return 'pending';
  const now = new Date();
  const coverage = await em.findOne(ClassEntitlement, {
    classroom: classId,
    capability: ClassCapability.PublishAssignments,
    revokedAt: null,
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  });
  return coverage ? 'covered' : null;
}
