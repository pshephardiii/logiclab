export type ReconciliationFailureCode =
  'RECONCILIATION_SCAN_LIMIT' | 'RECONCILIATION_REPORT_LIMIT' | 'RECONCILIATION_SCAN_TIMEOUT';

/** Only explicit operational codes cross the handler boundary; exception messages never do. */
export class JobExecutionError extends Error {
  constructor(public readonly code: ReconciliationFailureCode) {
    super(code);
  }
}
