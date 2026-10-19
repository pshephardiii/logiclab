import type { JobType } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { JobHandler, JobRegistry } from './types';

/** Per-type defaults seed new schedules only; existing operator edits remain authoritative. */
export function createJobRegistry(
  handlers: Partial<Record<JobType, JobHandler>> = {},
): JobRegistry {
  return {
    billing_reconciliation: {
      defaultIntervalSeconds: 3600,
      maxAttempts: 3,
      leaseSeconds: 60,
      timeoutSeconds: 45,
      retryBaseSeconds: 30,
      retryMaxSeconds: 900,
      handler: handlers.billing_reconciliation,
    },
  };
}
export function retryDelaySeconds(
  attempt: number,
  policy: { retryBaseSeconds: number; retryMaxSeconds: number },
) {
  return Math.min(policy.retryMaxSeconds, policy.retryBaseSeconds * 2 ** Math.max(0, attempt - 1));
}
