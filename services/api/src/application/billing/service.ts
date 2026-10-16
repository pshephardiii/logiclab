import type { BillingConfig } from '../../config/billing';
import type { BillingStore } from '../../persistence/billing/store';
import { createHash } from 'node:crypto';
import type { PaymentProvider } from './provider';
import { BillingError } from './errors';
import { createSimulatorWrapper } from '../../integrations/payments/simulator/wrapper';
import {
  createSimulatorEvent,
  signSimulatorEvent,
} from '../../integrations/payments/simulator/events';

export function createBillingService(
  store: BillingStore,
  provider: PaymentProvider,
  config: BillingConfig,
) {
  function verify(body: string, signature: string) {
    try {
      return {
        event: provider.verifyEvent(body, signature),
        hash: createHash('sha256').update(body).digest('hex'),
      };
    } catch {
      throw new BillingError('invalid_signature');
    }
  }
  return {
    checkout: (ownerId: string, classId: string, input: Parameters<BillingStore['checkout']>[2]) =>
      store.checkout(ownerId, classId, input, provider),
    webhook: async (body: string, signature: string) => store.process(verify(body, signature)),
    simulate: (ownerId: string, purchaseId: string, outcome: 'paid' | 'failed' | 'refunded') =>
      store.simulate(ownerId, purchaseId, (reference, sequence) => {
        const signed = signSimulatorEvent(
          createSimulatorWrapper(config),
          createSimulatorEvent(reference, sequence, outcome),
        );
        return verify(signed.body, signed.signature);
      }),
  };
}
export type BillingService = ReturnType<typeof createBillingService>;
