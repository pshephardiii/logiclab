import type { JobFinding } from '../types';
import type { FindingKind } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { PurchaseSnapshot, GrantSnapshot } from './types';

/** Audit retained terms, not current catalog prices or the existence of unrelated class coverage. */
export function purchaseFindings(
  purchase: PurchaseSnapshot,
  grants: GrantSnapshot[],
  asOf: Date,
): JobFinding[] {
  const related = grants.filter(
    (grant) => grant.provider === purchase.provider && grant.reference === purchase.reference,
  );
  const findings: JobFinding[] = [];
  function add(kind: `${FindingKind}`, grant?: GrantSnapshot) {
    findings.push({
      kind: kind as FindingKind,
      purchaseId: purchase.id,
      classId: purchase.classId,
      ...(grant ? { grantId: grant.id } : {}),
    });
  }
  if (purchase.status === 'paid' && related.length === 0) add('paid_purchase_missing_grant');
  const active = related.find(
    (grant) => !grant.revokedAt && grant.startsAt <= asOf && grant.endsAt > asOf,
  );
  if (purchase.status === 'refunded' && active) add('refunded_purchase_active_grant', active);
  const mismatch = related.find(
    (grant) =>
      grant.classId !== purchase.classId ||
      grant.capability !== purchase.capability ||
      grant.endsAt.getTime() - grant.startsAt.getTime() !== purchase.coverageDays * 86400000 ||
      grant.startsAt < purchase.createdAt,
  );
  if (mismatch) add('purchase_grant_terms_mismatch', mismatch);
  return findings;
}
