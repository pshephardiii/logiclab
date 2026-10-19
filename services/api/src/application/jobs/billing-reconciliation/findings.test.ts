import type { BillingProvider, ClassCapability, PurchaseStatus } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { purchaseFindings } from './findings';
import type { PurchaseSnapshot, GrantSnapshot } from './types';
const purchase: PurchaseSnapshot = {
  id: 'purchase',
  classId: 'class',
  provider: 'simulator' as BillingProvider,
  reference: 'source',
  status: 'paid' as PurchaseStatus,
  capability: 'publish_assignments' as ClassCapability,
  coverageDays: 180,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};
const grant: GrantSnapshot = {
  id: 'grant',
  classId: 'class',
  provider: purchase.provider,
  reference: purchase.reference,
  capability: purchase.capability,
  startsAt: purchase.createdAt,
  endsAt: new Date('2026-06-30T00:00:00Z'),
};
const asOf = new Date('2026-02-01T00:00:00Z');

test('paid purchases without retained grants are reported with safe identifiers', () => {
  expect(purchaseFindings(purchase, [], asOf)).toEqual([
    { kind: 'paid_purchase_missing_grant', purchaseId: 'purchase', classId: 'class' },
  ]);
});
test('valid paid grants remain valid audit evidence after expiration or intentional revocation', () => {
  expect(purchaseFindings(purchase, [grant], asOf)).toEqual([]);
  expect(purchaseFindings(purchase, [grant], new Date('2027-01-01T00:00:00Z'))).toEqual([]);
  expect(purchaseFindings(purchase, [{ ...grant, revokedAt: asOf }], asOf)).toEqual([]);
});
test('source identity includes provider and reference, independent of class funding from elsewhere', () => {
  expect(purchaseFindings(purchase, [{ ...grant, reference: 'another' }], asOf)[0]!.kind).toBe(
    'paid_purchase_missing_grant',
  );
  expect(
    purchaseFindings(purchase, [{ ...grant, provider: 'another' as BillingProvider }], asOf)[0]!
      .kind,
  ).toBe('paid_purchase_missing_grant');
});
test('refunded active coverage is reported, but revoked, future, and expired grants are not active', () => {
  const refunded = { ...purchase, status: 'refunded' as PurchaseStatus };
  expect(purchaseFindings(refunded, [grant], asOf)[0]!.kind).toBe('refunded_purchase_active_grant');
  expect(purchaseFindings(refunded, [{ ...grant, revokedAt: asOf }], asOf)).toEqual([]);
  expect(purchaseFindings(refunded, [grant], new Date(grant.startsAt.getTime() - 1))).toEqual([]);
  expect(purchaseFindings(refunded, [grant], grant.endsAt)).toEqual([]);
  expect(purchaseFindings(refunded, [grant], grant.startsAt)[0]!.kind).toBe(
    'refunded_purchase_active_grant',
  );
});
test.each([
  { classId: 'wrong-class' },
  { capability: 'wrong' as ClassCapability },
  { endsAt: new Date('2026-07-01T00:00:00Z') },
  { startsAt: new Date('2025-12-31T00:00:00Z'), endsAt: new Date('2026-06-29T00:00:00Z') },
])('mismatched retained grant terms are reported: %j', (edits) => {
  expect(purchaseFindings(purchase, [{ ...grant, ...edits }], asOf)).toEqual([
    {
      kind: 'purchase_grant_terms_mismatch',
      purchaseId: 'purchase',
      classId: 'class',
      grantId: 'grant',
    },
  ]);
});
test('pending and failed purchases with no grants are not missing paid coverage', () => {
  for (const status of ['pending', 'failed'])
    expect(purchaseFindings({ ...purchase, status: status as PurchaseStatus }, [], asOf)).toEqual(
      [],
    );
});
