import type { createDatabase } from '../index.ts';
import { BillingPlan } from '../entities/BillingPlan.ts';
import { BillingModel } from '../types/billing-plan/enums.ts';
import { ClassCapability } from '../types/class-entitlement/enums.ts';

export const DEMO_CLASS_PLAN_ID = 'b1000000-0000-4000-8000-000000000001';

/** Explicit, repeatable demo setup; never overwrite an existing plan's edited or retired terms. */
export async function seedDemoBillingPlan(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: Awaited<ReturnType<typeof createDatabase>>['em'],
) {
  if (transaction && !transaction.isInTransaction())
    throw new Error('An active transaction is required.');
  const em = transaction ?? orm.em.fork();
  await em.upsert(
    BillingPlan,
    {
      id: DEMO_CLASS_PLAN_ID,
      name: 'Simulated class publishing',
      billingModel: BillingModel.OneTime,
      amountMinor: 2500,
      currency: 'USD',
      coverageDays: 180,
      capability: ClassCapability.PublishAssignments,
    },
    { onConflictFields: ['id'], onConflictAction: 'ignore' },
  );
  return DEMO_CLASS_PLAN_ID;
}
