import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BillingConfig } from '../../../config/billing';

const TOLERANCE_SECONDS = 300;

/** Sign the exact wire bytes, with a fresh delivery timestamp distinct from event time. */
export function createSimulatorWrapper(config: BillingConfig, now = () => new Date()) {
  const key = Buffer.from(config.signingSecret, 'hex');
  if (key.length !== 32 || !/^[a-fA-F0-9]{64}$/.test(config.signingSecret)) {
    throw new Error('Invalid simulator signing key.');
  }
  function digest(body: string, timestamp: string) {
    return createHmac('sha256', key).update(`${timestamp}.${body}`).digest();
  }
  return {
    sign(body: string) {
      const timestamp = String(Math.floor(now().getTime() / 1000));
      return `t=${timestamp},v1=${digest(body, timestamp).toString('hex')}`;
    },
    verify(body: string, signature: string) {
      const match = /^t=([0-9]{1,12}),v1=([a-f0-9]{64})$/.exec(signature);
      if (!match) throw new Error('Invalid simulator signature.');
      const timestamp = match[1]!;
      const age = Math.floor(now().getTime() / 1000) - Number(timestamp);
      if (
        Math.abs(age) > TOLERANCE_SECONDS ||
        !timingSafeEqual(digest(body, timestamp), Buffer.from(match[2]!, 'hex'))
      ) {
        throw new Error('Invalid simulator signature.');
      }
    },
  };
}
export type SimulatorWrapper = ReturnType<typeof createSimulatorWrapper>;
