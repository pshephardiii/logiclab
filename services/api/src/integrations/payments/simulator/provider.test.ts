import { randomUUID } from 'node:crypto';
import { createSimulatorProvider } from './provider';
import { createSimulatorWrapper } from './wrapper';
import { createSimulatorEvent, signSimulatorEvent } from './events';

const config = { signingSecret: 'ab'.repeat(32) };
const time = new Date('2026-10-16T12:00:00Z');
const clock = () => time;
const wrapper = createSimulatorWrapper(config, clock);
const provider = createSimulatorProvider(config, clock);
const terms = {
  planId: randomUUID(),
  amountMinor: 2500,
  currency: 'USD',
  coverageDays: 180,
  capability: 'publish_assignments' as const,
};

test('checkout labels simulation, generates distinct references, and copies server terms', async () => {
  const input = { ...terms };
  const first = await provider.createCheckout(input);
  const second = await provider.createCheckout(input);
  expect(first.reference).not.toBe(second.reference);
  expect(first.mode).toBe('simulated');
  expect(first.notice).toContain('No real payment');
  input.amountMinor = 9999;
  expect(first.terms).toEqual(terms);
});

test.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
  'rejects invalid checkout price %s',
  async (amountMinor) => {
    await expect(provider.createCheckout({ ...terms, amountMinor })).rejects.toThrow();
  },
);

test.each(['paid', 'failed', 'refunded'] as const)('verifies signed %s events', (outcome) => {
  const event = createSimulatorEvent(randomUUID(), 1, outcome, time);
  const signed = signSimulatorEvent(wrapper, event);
  expect(provider.verifyEvent(signed.body, signed.signature)).toEqual(event);
});

test('rejects tampered bytes, wrong keys, and malformed signatures', () => {
  const event = createSimulatorEvent(randomUUID(), 1, 'paid', time);
  const signed = signSimulatorEvent(wrapper, event);
  expect(() => provider.verifyEvent(signed.body + ' ', signed.signature)).toThrow();
  const other = createSimulatorProvider({ signingSecret: 'cd'.repeat(32) }, clock);
  expect(() => other.verifyEvent(signed.body, signed.signature)).toThrow();
  for (const signature of ['', 't=1,v1=abc', signed.signature + ',v1=' + '0'.repeat(64)]) {
    expect(() => provider.verifyEvent(signed.body, signature)).toThrow();
  }
});

test.each([-301, 301])('rejects delivery timestamps outside tolerance (%s seconds)', (seconds) => {
  const remote = createSimulatorWrapper(config, () => new Date(time.getTime() + seconds * 1000));
  const signed = signSimulatorEvent(remote, createSimulatorEvent(randomUUID(), 1, 'paid', time));
  expect(() => provider.verifyEvent(signed.body, signed.signature)).toThrow();
});

test('permits re-signing the same old event without changing identity or event time', () => {
  const event = createSimulatorEvent(randomUUID(), 1, 'paid', new Date('2026-01-01T00:00:00Z'));
  const signed = signSimulatorEvent(wrapper, event);
  expect(provider.verifyEvent(signed.body, signed.signature)).toEqual(event);
  // Verification alone deliberately does not deduplicate or apply state transitions.
  expect(provider.verifyEvent(signed.body, signed.signature)).toEqual(event);
});

test('rejects signed malformed JSON and unsupported event versions/fields', () => {
  for (const body of [
    '{',
    JSON.stringify({ ...createSimulatorEvent(randomUUID(), 1, 'paid', time), version: 2 }),
    JSON.stringify({ ...createSimulatorEvent(randomUUID(), 1, 'paid', time), extra: true }),
  ]) {
    expect(() => provider.verifyEvent(body, wrapper.sign(body))).toThrow();
  }
});

test.each([0, -1, 1.5])('rejects invalid source sequence %s', (sequence) => {
  expect(() => createSimulatorEvent(randomUUID(), sequence, 'paid', time)).toThrow();
});
