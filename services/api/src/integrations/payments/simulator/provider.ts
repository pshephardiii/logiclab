import type { PaymentProvider } from '../../../application/billing/provider';
import type { BillingConfig } from '../../../config/billing';
import { createSimulatorWrapper } from './wrapper';
import { createSimulatorCheckout } from './create-checkout';
import { verifySimulatorEvent } from './events';

export function createSimulatorProvider(config: BillingConfig, now?: () => Date): PaymentProvider {
  const wrapper = createSimulatorWrapper(config, now);
  return {
    createCheckout: createSimulatorCheckout,
    verifyEvent: (body, signature) => verifySimulatorEvent(wrapper, body, signature),
  };
}
