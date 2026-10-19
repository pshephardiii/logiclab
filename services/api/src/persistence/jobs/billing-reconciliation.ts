import { JobExecutionError } from '../../application/jobs/errors';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { BillingReconciliationReader } from '../../application/jobs/billing-reconciliation/types';
import { databaseTime } from './database-time';

const DEFAULT_LIMITS = { batchSize: 200, maxPurchases: 10000, maxGrantsPerBatch: 5000 };

/** Bounded keyset scan in one read-only MVCC snapshot; no financial rows are locked or repaired. */
export async function createBillingReconciliationReader(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  limits = DEFAULT_LIMITS,
): Promise<BillingReconciliationReader> {
  for (const [name, value] of Object.entries(limits)) {
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > DEFAULT_LIMITS[name as keyof typeof limits]
    )
      throw new Error('Invalid reconciliation scan limits.');
  }
  const { ClassPurchase, ClassEntitlement, EntitlementSource } = await import('@logiclab/db');
  return {
    async scan(signal, visit) {
      signal.throwIfAborted();
      await orm.em.fork().transactional(async (em) => {
        await em.execute('set transaction isolation level repeatable read read only');
        await em.execute("set local statement_timeout = '10s'");
        const asOf = await databaseTime(em);
        const deadline = performance.now() + 30000;
        let cursor: string | undefined;
        let checked = 0;
        while (true) {
          signal.throwIfAborted();
          if (performance.now() > deadline)
            throw new JobExecutionError('RECONCILIATION_SCAN_TIMEOUT');
          const purchases = await em.find(ClassPurchase, cursor ? { id: { $gt: cursor } } : {}, {
            orderBy: { id: 'ASC' },
            limit: Math.min(limits.batchSize, limits.maxPurchases - checked + 1),
          });
          signal.throwIfAborted();
          if (!purchases.length) break;
          if (checked + purchases.length > limits.maxPurchases)
            throw new JobExecutionError('RECONCILIATION_SCAN_LIMIT');
          const grants = await em.find(
            ClassEntitlement,
            {
              source: EntitlementSource.ClassPurchase,
              $or: purchases.map((purchase) => ({
                provider: purchase.provider,
                sourceReference: purchase.checkoutReference,
              })),
            },
            { limit: limits.maxGrantsPerBatch + 1, orderBy: { id: 'ASC' } },
          );
          signal.throwIfAborted();
          if (grants.length > limits.maxGrantsPerBatch)
            throw new JobExecutionError('RECONCILIATION_SCAN_LIMIT');
          await visit({
            asOf,
            purchases: purchases.map((purchase) => ({
              id: purchase.id,
              classId: purchase.classroom.id,
              provider: purchase.provider,
              reference: purchase.checkoutReference,
              status: purchase.status,
              capability: purchase.capability,
              coverageDays: purchase.coverageDays,
              createdAt: purchase.createdAt,
            })),
            grants: grants.map((grant) => ({
              id: grant.id,
              classId: grant.classroom.id,
              provider: grant.provider,
              reference: grant.sourceReference,
              capability: grant.capability,
              startsAt: grant.startsAt,
              endsAt: grant.endsAt,
              revokedAt: grant.revokedAt,
            })),
          });
          signal.throwIfAborted();
          cursor = purchases[purchases.length - 1]!.id;
          checked += purchases.length;
          em.clear();
        }
      });
    },
  };
}
