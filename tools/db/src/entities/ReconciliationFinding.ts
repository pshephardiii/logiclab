import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Check, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/es';
import type { ReconciliationFindingFields } from '../types/reconciliation-finding/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { DurableJob } from './DurableJob.ts';
import { FindingKind } from '../types/reconciliation-finding/enums.ts';

/** Operator-only report evidence; identifiers are snapshots, and findings never repair billing state. */
@Entity({ tableName: 'reconciliation_findings' })
@Unique({
  name: 'reconciliation_findings_job_kind_purchase_unique',
  properties: ['job', 'kind', 'purchaseId'],
})
@Check({
  name: 'reconciliation_findings_kind_check',
  expression:
    "kind in ('refunded_purchase_active_grant', 'paid_purchase_missing_grant', 'purchase_grant_terms_mismatch')",
})
export class ReconciliationFinding implements ReconciliationFindingFields {
  [OptionalProps]?: 'id' | 'detectedAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => DurableJob, {
    fieldName: 'job_id',
    foreignKeyName: 'reconciliation_findings_job_id_fkey',
    deleteRule: 'restrict',
  })
  job!: DurableJob;

  @Property({ type: 'string', fieldName: 'kind', length: 64 })
  kind!: FindingKind;

  @Property({ type: 'uuid', fieldName: 'purchase_id' })
  purchaseId!: string;

  @Property({ type: 'uuid', fieldName: 'class_id' })
  classId!: string;

  @Property({ type: 'uuid', fieldName: 'grant_id', nullable: true })
  grantId?: string;

  @Property({
    type: 'datetime',
    fieldName: 'detected_at',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  detectedAt: Date = new Date();
}

type ReconciliationFindingFieldsCheck = Assert<
  SameEntityFields<ReconciliationFinding, ReconciliationFindingFields>
>;
