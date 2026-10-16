import type { BillingPlan } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { purchaseTerms } from './purchase-terms';

const plan = {
  id: 'cbd9503a-34a0-4a02-84b6-5ed9c2bc4714',
  name: 'Class period',
  active: true,
  billingModel: 'one_time',
  amountMinor: 2500,
  currency: 'USD',
  coverageDays: 180,
  capability: 'publish_assignments',
  createdAt: new Date(),
} as BillingPlan;

test('snapshots eligible catalog terms independently of subsequent plan edits', () => {
  const current = { ...plan };
  const terms = purchaseTerms(current);
  current.amountMinor = 5000;
  expect(terms.amountMinor).toBe(2500);
  expect(terms.planId).toBe(plan.id);
  expect(terms).not.toHaveProperty('name');
});

test.each([
  { active: false },
  { billingModel: 'recurring' },
  { amountMinor: -1 },
  { currency: 'usd' },
  { coverageDays: undefined },
  { coverageDays: 0 },
  { billingInterval: 'month' },
  { capability: 'unsupported' },
])('rejects unavailable or invalid plans: %j', (edits) => {
  expect(() => purchaseTerms({ ...plan, ...edits } as BillingPlan)).toThrow();
});
