import { createBillingService } from './service';
import { createSimulatorProvider } from '../../integrations/payments/simulator/provider';
import {
  createSimulatorEvent,
  signSimulatorEvent,
} from '../../integrations/payments/simulator/events';
import { createSimulatorWrapper } from '../../integrations/payments/simulator/wrapper';
import type { BillingStore } from '../../persistence/billing/store';
import { randomUUID } from 'node:crypto';

const config = { signingSecret: 'ab'.repeat(32) };
function fixture() {
  const store = {
    plans: jest.fn(async () => ({ plans: [], nextOffset: null })),
    readClass: jest.fn(),
    checkout: jest.fn(),
    process: jest.fn(async () => ({ result: 'applied' as const })),
    simulate: jest.fn(),
  };
  return {
    store,
    service: createBillingService(store as BillingStore, createSimulatorProvider(config), config),
  };
}

test('invalid signatures never reach persistence', async () => {
  const { store, service } = fixture();
  await expect(service.webhook('{}', 'bad')).rejects.toThrow('invalid_signature');
  expect(store.process).not.toHaveBeenCalled();
});

test('forwards authenticated wire data with a SHA-256 body hash', async () => {
  const { store, service } = fixture();
  const event = createSimulatorEvent(randomUUID(), 1, 'paid');
  const signed = signSimulatorEvent(createSimulatorWrapper(config), event);
  await service.webhook(signed.body, signed.signature);
  expect(store.process).toHaveBeenCalledWith({
    event,
    hash: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
});

test('simulator control signs server-selected sequence and reference through the same verifier', async () => {
  const { store, service } = fixture();
  const reference = randomUUID();
  store.simulate.mockImplementation(
    async (
      _owner: string,
      _purchase: string,
      create: (reference: string, sequence: number) => unknown,
    ) => {
      const delivery = create(reference, 4);
      expect(delivery).toMatchObject({
        event: { sourceReference: reference, sequence: 4, outcome: 'refunded' },
        hash: expect.any(String),
      });
      return { result: 'applied' };
    },
  );
  await service.simulate('owner', 'purchase', 'refunded');
  expect(store.simulate).toHaveBeenCalledWith('owner', 'purchase', expect.any(Function));
});
