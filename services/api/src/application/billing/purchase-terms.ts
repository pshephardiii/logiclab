import type { BillingPlan } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { PurchaseTerms } from './provider';

/** Call with the current server-loaded catalog record, never a client-supplied plan object. */
export function purchaseTerms(plan: BillingPlan): PurchaseTerms {
  if (!plan.active || plan.billingModel !== 'one_time') {
    throw new Error('Checkout requires an active one-time class plan.');
  }
  if (
    !Number.isSafeInteger(plan.amountMinor) ||
    plan.amountMinor < 0 ||
    !/^[A-Z]{3}$/.test(plan.currency) ||
    !Number.isSafeInteger(plan.coverageDays) ||
    !plan.coverageDays ||
    plan.coverageDays < 1 ||
    plan.billingInterval != null ||
    plan.capability !== 'publish_assignments'
  )
    throw new Error('Invalid class purchase terms.');
  return {
    planId: plan.id,
    amountMinor: plan.amountMinor,
    currency: plan.currency,
    coverageDays: plan.coverageDays,
    capability: plan.capability,
  };
}
