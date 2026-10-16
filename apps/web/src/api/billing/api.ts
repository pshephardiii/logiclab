import {
  billingPlansResponseSchema,
  classBillingResponseSchema,
  purchaseResponseSchema,
  paymentReceiptResponseSchema,
  type CheckoutRequest,
  type SimulatorRequest,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';
const fallback = 'Could not load or update simulated billing.';
const errorOverride = (status: number) =>
  status === 404
    ? new Error(
        'Billing is unavailable or this class is inaccessible. Enable the billing simulator on the API if needed.',
      )
    : undefined;
export function listPlans(signal: AbortSignal, offset = 0) {
  return requestAccountJson(`/api/billing/plans?offset=${offset}`, {
    schema: billingPlansResponseSchema,
    signal,
    fallback,
    errorOverride,
  });
}
export function readClassBilling(classId: string, signal: AbortSignal, offset = 0) {
  return requestAccountJson(`/api/classes/${classId}/billing?offset=${offset}`, {
    schema: classBillingResponseSchema,
    signal,
    fallback,
    errorOverride,
  });
}
export function createCheckout(classId: string, input: CheckoutRequest, signal: AbortSignal) {
  return requestAccountJson(`/api/classes/${classId}/checkout`, {
    schema: purchaseResponseSchema,
    signal,
    body: input,
    fallback,
    errorOverride,
  });
}
export function simulatePayment(
  purchaseId: string,
  outcome: SimulatorRequest['outcome'],
  signal: AbortSignal,
) {
  return requestAccountJson(`/api/billing/purchases/${purchaseId}/simulate`, {
    schema: paymentReceiptResponseSchema,
    signal,
    body: { outcome },
    fallback,
    errorOverride,
  });
}
