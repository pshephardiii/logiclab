import { transactionRunner, type DatabaseManager } from '../transactions';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type {
  BillingListQuery,
  ClassBillingResponse,
  billingPlansResponseSchema,
} from '@logiclab/contracts';
import type { z } from 'zod';
import { BillingError } from '../../application/billing/errors';
import { checkoutBlockedReason } from './checkout-availability';
import { purchaseResponse } from './purchase-response';

export interface BillingReadStore {
  plans(query: BillingListQuery): Promise<z.infer<typeof billingPlansResponseSchema>>;
  readClass(
    ownerId: string,
    classId: string,
    query: BillingListQuery,
  ): Promise<ClassBillingResponse>;
}

/** Exposes catalog terms and owned history without provider references or event payloads. */
export async function createBillingReadStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<BillingReadStore> {
  const transact = transactionRunner(orm, transaction);
  const {
    BillingPlan,
    BillingModel,
    Classroom,
    ClassPurchase,
    ClassEntitlement,
    ClassCapability,
    LockMode,
  } = await import('@logiclab/db');
  return {
    async plans(query) {
      const rows = await (transaction ?? orm.em.fork()).find(
        BillingPlan,
        { active: true, billingModel: BillingModel.OneTime },
        { limit: query.limit + 1, offset: query.offset, orderBy: { name: 'ASC', id: 'ASC' } },
      );
      return {
        plans: rows.slice(0, query.limit).map((plan) => ({
          id: plan.id,
          name: plan.name,
          amountMinor: plan.amountMinor,
          currency: plan.currency,
          coverageDays: plan.coverageDays!,
          capability: plan.capability,
        })),
        nextOffset: rows.length > query.limit ? query.offset + query.limit : null,
      };
    },
    async readClass(ownerId, classId, query) {
      return transact(async (em) => {
        const classroom = await em.findOne(
          Classroom,
          { id: classId, owner: ownerId },
          { lockMode: LockMode.PESSIMISTIC_READ },
        );
        if (!classroom) throw new BillingError('not_found');
        const now = new Date();
        const grants = await em.find(
          ClassEntitlement,
          {
            classroom: classId,
            capability: ClassCapability.PublishAssignments,
            revokedAt: null,
            startsAt: { $lte: now },
            endsAt: { $gt: now },
          },
          { orderBy: { endsAt: 'DESC' }, limit: 1 },
        );
        const rows = await em.find(
          ClassPurchase,
          { classroom: classId },
          {
            limit: query.limit + 1,
            offset: query.offset,
            orderBy: { createdAt: 'DESC', id: 'DESC' },
          },
        );
        return {
          classId,
          checkoutBlockedReason: await checkoutBlockedReason(em, classId),
          coverage: { active: grants.length > 0, endsAt: grants[0]?.endsAt.toISOString() ?? null },
          purchases: rows.slice(0, query.limit).map((purchase) => ({
            ...purchaseResponse(purchase).purchase,
            createdAt: purchase.createdAt.toISOString(),
          })),
          nextOffset: rows.length > query.limit ? query.offset + query.limit : null,
        };
      });
    },
  };
}
