import { BillingError } from './errors';
import type { PaymentEvent } from './provider';

export function validatedPaymentEventTime(
  purchase: { checkoutReference: string; createdAt: Date },
  event: PaymentEvent,
): Date {
  const occurred = new Date(event.occurredAt);

  if (
    event.sourceReference !== purchase.checkoutReference ||
    !Number.isSafeInteger(event.sequence) ||
    event.sequence > 2147483647 ||
    occurred.getTime() < purchase.createdAt.getTime() ||
    occurred.getTime() > Date.now() + 300_000
  )
    throw new BillingError('invalid_event');

  return occurred;
}
