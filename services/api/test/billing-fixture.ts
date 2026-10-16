import type { BillingContext } from '../src/routes/billing/context';
import { authFixture } from './auth-fixture';

export const classId = 'b1111111-1111-4111-8111-111111111111';
export const planId = 'b2222222-2222-4222-8222-222222222222';
export const purchaseId = 'b3333333-3333-4333-8333-333333333333';
export const requestId = 'b4444444-4444-4444-8444-444444444444';
export const checkoutResponse = {
  purchase: {
    id: purchaseId,
    classId,
    planId,
    status: 'pending' as const,
    amountMinor: 2500,
    currency: 'USD',
    coverageDays: 180,
    capability: 'publish_assignments' as const,
  },
  mode: 'simulated' as const,
  notice: 'Simulated checkout only. No real payment.',
};
export function billingFixture() {
  const auth = authFixture();
  const billing = {
    plans: jest.fn(async () => ({
      plans: [
        {
          id: planId,
          name: 'Class period',
          amountMinor: 2500,
          currency: 'USD',
          coverageDays: 180,
          capability: 'publish_assignments' as const,
        },
      ],
      nextOffset: null,
    })),
    readClass: jest.fn(async () => ({
      classId,
      coverage: { active: false, endsAt: null },
      purchases: [],
      nextOffset: null,
    })),
    checkout: jest.fn(async () => checkoutResponse),
    simulate: jest.fn(async () => ({ result: 'applied' as const })),
    webhook: jest.fn(async () => ({ result: 'applied' as const })),
  };
  const context: BillingContext = { ...auth.context, billing };
  return { ...auth, context, billing };
}
