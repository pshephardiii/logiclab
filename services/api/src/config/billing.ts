export interface BillingConfig {
  signingSecret: string;
}

/** Opt-in only; never reuse authentication/session secrets for simulated provider events. */
export function readBillingConfig(env: NodeJS.ProcessEnv): BillingConfig | null {
  if (env.BILLING_ENABLED === undefined || env.BILLING_ENABLED === 'false') return null;
  if (env.BILLING_ENABLED !== 'true') throw new Error('BILLING_ENABLED must be true or false.');
  const secret = env.BILLING_SIMULATOR_SIGNING_SECRET;
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error('BILLING_SIMULATOR_SIGNING_SECRET must contain 64 hexadecimal characters.');
  }
  return { signingSecret: secret };
}
