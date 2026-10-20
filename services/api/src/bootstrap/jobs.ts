import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { createDemoCleanupHandler } from '../application/jobs/demo-cleanup/handler';
import { cleanupExpiredDemoWorkspaces } from '../persistence/demo/cleanup';
import { createJobRegistry } from '../application/jobs/registry';
import { createBillingReconciliationHandler } from '../application/jobs/billing-reconciliation/handler';
import { createBillingReconciliationReader } from '../persistence/jobs/billing-reconciliation';
import { createJobStore } from '../persistence/jobs/store';

/** Operator composition only; caller owns the connection. API startup never invokes job cycles. */
export async function createJobRuntime(orm: Awaited<ReturnType<typeof createDatabase>>) {
  const reader = await createBillingReconciliationReader(orm);
  const registry = createJobRegistry({
    demo_cleanup: createDemoCleanupHandler((signal) =>
      cleanupExpiredDemoWorkspaces(orm, 10, signal),
    ),
    billing_reconciliation: createBillingReconciliationHandler(reader),
  });
  return { registry, store: await createJobStore(orm, registry) };
}
