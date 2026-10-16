import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { CheckoutSession, PurchaseTerms } from '../../../application/billing/provider';

const termsSchema = z.strictObject({
  planId: z.uuid(),
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/),
  coverageDays: z.number().int().positive().max(2147483647),
  capability: z.literal('publish_assignments'),
});

/** No provider network call, real charge, browser redirect, or access grant occurs here. */
export async function createSimulatorCheckout(terms: PurchaseTerms): Promise<CheckoutSession> {
  return {
    reference: randomUUID(),
    mode: 'simulated',
    terms: termsSchema.parse(terms),
    notice: 'Simulated checkout only. No real payment or payment details required.',
  };
}
