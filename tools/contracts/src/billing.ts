import { z } from 'zod';

export const billingClassParamsSchema = z.strictObject({ classId: z.uuid() });
export const billingPurchaseParamsSchema = z.strictObject({ purchaseId: z.uuid() });
export const checkoutRequestSchema = z.strictObject({ planId: z.uuid(), requestId: z.uuid() });
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export const simulatorRequestSchema = z.strictObject({
  outcome: z.enum(['paid', 'failed', 'refunded']),
});
export type SimulatorRequest = z.infer<typeof simulatorRequestSchema>;
export const purchaseResponseSchema = z.strictObject({
  purchase: z.strictObject({
    id: z.uuid(),
    classId: z.uuid(),
    planId: z.uuid(),
    status: z.enum(['pending', 'paid', 'failed', 'refunded']),
    amountMinor: z.number().int().nonnegative(),
    currency: z.string(),
    coverageDays: z.number().int().positive(),
    capability: z.literal('publish_assignments'),
  }),
  mode: z.literal('simulated'),
  notice: z.string(),
});
export type PurchaseResponse = z.infer<typeof purchaseResponseSchema>;
export const paymentReceiptResponseSchema = z.strictObject({
  result: z.enum(['applied', 'ignored', 'duplicate']),
});
export const billingErrorResponseSchema = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string() }),
});
