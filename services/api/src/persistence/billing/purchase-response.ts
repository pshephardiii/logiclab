import type { ClassPurchase as PurchaseEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { PurchaseResponse } from '@logiclab/contracts';
export function purchaseResponse(purchase: PurchaseEntity): PurchaseResponse {
  return {
    purchase: {
      id: purchase.id,
      classId: purchase.classroom.id,
      planId: purchase.plan.id,
      status: purchase.status,
      amountMinor: purchase.amountMinor,
      currency: purchase.currency,
      coverageDays: purchase.coverageDays,
      capability: purchase.capability,
    },
    mode: 'simulated',
    notice: 'Simulated checkout only. No real payment or payment details required.',
  };
}
