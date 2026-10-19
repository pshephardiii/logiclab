import type { FindingKind } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { JobResult } from './types';

// Exhaustive against the persisted enum without loading the ORM into application policy.
const findingKinds = {
  refunded_purchase_active_grant: true,
  paid_purchase_missing_grant: true,
  purchase_grant_terms_mismatch: true,
} satisfies Record<FindingKind, true>;

/** Bound handler output before any findings are committed. */
export function validResult(result: JobResult) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (
    result &&
    Number.isInteger(result.recordsChecked) &&
    result.recordsChecked >= 0 &&
    result.recordsChecked <= 2147483647 &&
    Array.isArray(result.findings) &&
    result.findings.length <= 1000 &&
    result.findings.every(
      (row) =>
        row &&
        Object.hasOwn(findingKinds, row.kind) &&
        uuid.test(row.purchaseId) &&
        uuid.test(row.classId) &&
        (row.grantId === undefined || uuid.test(row.grantId)),
    )
  );
}
