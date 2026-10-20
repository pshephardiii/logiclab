import type { JobType } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { JobHandler, JobRegistry } from './types';

/** Per-type defaults seed new schedules only; existing operator edits remain authoritative. */
export function createJobRegistry(
  handlers: Partial<Record<JobType, JobHandler>> = {},
): JobRegistry {
  return {
    demo_cleanup: {
      defaultIntervalSeconds: 300,
      maxAttempts: 3,
      leaseSeconds: 120,
      timeoutSeconds: 90,
      retryBaseSeconds: 30,
      retryMaxSeconds: 300,
      handler: handlers.demo_cleanup,
    },
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
