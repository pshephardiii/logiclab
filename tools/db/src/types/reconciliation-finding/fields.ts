import type { DurableJob } from '../../entities/DurableJob.ts';
import type { FindingKind } from '../reconciliation-finding/enums.ts';

export interface ReconciliationFindingFields {
  id: string;
  job: DurableJob;
  kind: FindingKind;
  purchaseId: string;
  classId: string;
  grantId?: string;
  detectedAt: Date;
}
