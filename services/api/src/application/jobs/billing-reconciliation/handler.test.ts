import { createBillingReconciliationHandler } from './handler';
import type { BillingSnapshotBatch } from './types';
import type { BillingProvider, ClassCapability, PurchaseStatus } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
const batch: BillingSnapshotBatch = {
  asOf: new Date(),
  grants: [],
  purchases: [
    {
      id: 'purchase',
      classId: 'class',
      provider: 'simulator' as BillingProvider,
      reference: 'source',
      status: 'paid' as PurchaseStatus,
      capability: 'publish_assignments' as ClassCapability,
      coverageDays: 180,
      createdAt: new Date(),
    },
  ],
};

test('aggregates batches without writing report state itself', async () => {
  const handler = createBillingReconciliationHandler({
    scan: async (_signal, visit) => {
      await visit(batch);
      await visit({ ...batch, purchases: [] });
    },
  });
  expect(
    await handler({ jobId: 'job', attempt: 1, signal: new AbortController().signal }),
  ).toMatchObject({ recordsChecked: 1, findings: [{ kind: 'paid_purchase_missing_grant' }] });
});
test('cancellation prevents late report success', async () => {
  const controller = new AbortController();
  const handler = createBillingReconciliationHandler({
    scan: async (_signal, visit) => {
      controller.abort();
      await visit(batch);
    },
  });
  await expect(handler({ jobId: 'job', attempt: 1, signal: controller.signal })).rejects.toThrow();
});
test('finding overflow fails explicitly rather than returning a successful truncated report', async () => {
  const handler = createBillingReconciliationHandler({
    scan: async (_signal, visit) => {
      await visit({
        ...batch,
        purchases: Array.from({ length: 1001 }, (_, index) => ({
          ...batch.purchases[0]!,
          id: String(index),
        })),
      });
    },
  });
  await expect(
    handler({ jobId: 'job', attempt: 1, signal: new AbortController().signal }),
  ).rejects.toMatchObject({ code: 'RECONCILIATION_REPORT_LIMIT' });
});

test('an empty completed scan is a successful report with zero findings', async () => {
  const handler = createBillingReconciliationHandler({ scan: async () => {} });
  await expect(
    handler({ jobId: 'job', attempt: 1, signal: new AbortController().signal }),
  ).resolves.toEqual({ recordsChecked: 0, findings: [] });
});
