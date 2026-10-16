import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { PaymentEvent } from '../../../application/billing/provider';
import type { SimulatorWrapper } from './wrapper';

const eventSchema = z.strictObject({
  version: z.literal(1),
  id: z.uuid(),
  sourceReference: z.uuid(),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  outcome: z.enum(['paid', 'failed', 'refunded']),
  occurredAt: z.iso.datetime(),
});

/** Re-delivery reuses the event body/ID; a fresh signature permits delayed transport retries. */
export function signSimulatorEvent(wrapper: SimulatorWrapper, event: PaymentEvent) {
  const body = JSON.stringify(eventSchema.parse(event));
  return { body, signature: wrapper.sign(body) };
}

/** Trusted simulator controls supply the persisted source sequence, not the browser. */
export function createSimulatorEvent(
  sourceReference: string,
  sequence: number,
  outcome: PaymentEvent['outcome'],
  now = new Date(),
): PaymentEvent {
  return eventSchema.parse({
    version: 1,
    id: randomUUID(),
    sourceReference,
    sequence,
    outcome,
    occurredAt: now.toISOString(),
  });
}

export function verifySimulatorEvent(
  wrapper: SimulatorWrapper,
  body: string,
  signature: string,
): PaymentEvent {
  wrapper.verify(body, signature);
  return eventSchema.parse(JSON.parse(body));
}
