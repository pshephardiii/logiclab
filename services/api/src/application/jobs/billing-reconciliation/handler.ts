import { JobExecutionError } from '../errors';
import type { JobHandler, JobFinding } from '../types';
import type { BillingReconciliationReader } from './types';
import { purchaseFindings } from './findings';

/** Returns report data only. The fenced worker finalizer owns all findings/history writes. */
export function createBillingReconciliationHandler(
  reader: BillingReconciliationReader,
): JobHandler {
  return async ({ signal }) => {
    let recordsChecked = 0;
    const findings: JobFinding[] = [];
    await reader.scan(signal, (batch) => {
      signal.throwIfAborted();
      const bySource = new Map<string, typeof batch.grants>();
      for (const grant of batch.grants) {
        const key = JSON.stringify([grant.provider, grant.reference]);
        const group = bySource.get(key) ?? [];
        group.push(grant);
        bySource.set(key, group);
      }
      for (const purchase of batch.purchases) {
        signal.throwIfAborted();
        const related = bySource.get(JSON.stringify([purchase.provider, purchase.reference])) ?? [];
        findings.push(...purchaseFindings(purchase, related, batch.asOf));
        if (findings.length > 1000) throw new JobExecutionError('RECONCILIATION_REPORT_LIMIT');
        recordsChecked += 1;
      }
    });
    signal.throwIfAborted();
    return { recordsChecked, findings };
  };
}
