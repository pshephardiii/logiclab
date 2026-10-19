import type { BillingProvider, ClassCapability, PurchaseStatus } from '@logiclab/db' with {
  'resolution-mode': 'import',
};

export interface PurchaseSnapshot {
  id: string;
  classId: string;
  provider: BillingProvider;
  reference: string;
  status: PurchaseStatus;
  capability: ClassCapability;
  coverageDays: number;
  createdAt: Date;
}
export interface GrantSnapshot {
  id: string;
  classId: string;
  provider: BillingProvider;
  reference: string;
  capability: ClassCapability;
  startsAt: Date;
  endsAt: Date;
  revokedAt?: Date;
}
export interface BillingSnapshotBatch {
  purchases: PurchaseSnapshot[];
  grants: GrantSnapshot[];
  asOf: Date;
}
export interface BillingReconciliationReader {
  scan(
    signal: AbortSignal,
    visit: (batch: BillingSnapshotBatch) => void | Promise<void>,
  ): Promise<void>;
}
