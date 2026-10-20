import {
  billingPlansResponseSchema,
  classBillingResponseSchema,
  purchaseResponseSchema,
  paymentReceiptResponseSchema,
  type CheckoutRequest,
  type SimulatorRequest,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

/** Bind resource operations to a supplied account request transport. */
export function createApi(request: typeof requestAccountJson = requestAccountJson) {
  const fallback = 'Could not load or update simulated billing.';
  const errorOverride = (status: number) =>
    status === 404
      ? new Error(
          'Billing is unavailable or this class is inaccessible. Enable the billing simulator on the API if needed.',
        )
      : undefined;
  function listPlans(signal: AbortSignal, offset = 0) {
    return request(`/api/billing/plans?offset=${offset}`, {
      schema: billingPlansResponseSchema,
      signal,
      fallback,
      errorOverride,
    });
  }
  function readClassBilling(classId: string, signal: AbortSignal, offset = 0) {
    return request(`/api/classes/${classId}/billing?offset=${offset}`, {
      schema: classBillingResponseSchema,
      signal,
      fallback,
      errorOverride,
    });
  }
  function createCheckout(classId: string, input: CheckoutRequest, signal: AbortSignal) {
    return request(`/api/classes/${classId}/checkout`, {
      schema: purchaseResponseSchema,
      signal,
      body: input,
      fallback,
      errorOverride,
    });
  }
  function simulatePayment(
    purchaseId: string,
    outcome: SimulatorRequest['outcome'],
    signal: AbortSignal,
  ) {
    return request(`/api/billing/purchases/${purchaseId}/simulate`, {
      schema: paymentReceiptResponseSchema,
      signal,
      body: { outcome },
      fallback,
      errorOverride,
    });
  }

  return { listPlans, readClassBilling, createCheckout, simulatePayment };
}

export const { listPlans, readClassBilling, createCheckout, simulatePayment } = createApi();
