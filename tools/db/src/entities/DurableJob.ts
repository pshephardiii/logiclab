import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import {
  Entity,
  Index,
  Check,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/es';
import type { DurableJobFields } from '../types/durable-job/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { JobType } from '../types/job-schedule/enums.ts';
import { JobSchedule } from './JobSchedule.ts';
import { JobStatus } from '../types/durable-job/enums.ts';

/** One scheduled occurrence or manual request; retries reuse this job and receive fresh leases. */
@Entity({ tableName: 'durable_jobs' })
@Unique({ name: 'durable_jobs_type_key_unique', properties: ['jobType', 'deduplicationKey'] })
@Unique({
  name: 'durable_jobs_schedule_occurrence_unique',
  properties: ['schedule', 'scheduledFor'],
})
@Index({ name: 'durable_jobs_available_index', properties: ['status', 'availableAt'] })
@Index({ name: 'durable_jobs_lease_index', properties: ['status', 'leaseExpiresAt'] })
@Check({ name: 'durable_jobs_type_check', expression: "job_type in ('billing_reconciliation')" })
@Check({
  name: 'durable_jobs_occurrence_check',
  expression: '(schedule_id is null) = (scheduled_for is null)',
})
@Check({
  name: 'durable_jobs_attempts_check',
  expression: 'max_attempts between 1 and 10 and attempts between 0 and max_attempts',
})
@Check({
  name: 'durable_jobs_state_check',
  expression: `
      (status = 'queued'
        and attempts < max_attempts
        and lease_token is null
        and lease_expires_at is null
        and completed_at is null)
      or (status = 'running'
        and attempts > 0
        and lease_token is not null
        and lease_expires_at is not null
        and completed_at is null)
      or (status in ('succeeded', 'failed')
        and attempts > 0
        and lease_token is null
        and lease_expires_at is null
        and completed_at is not null)
    `,
})
export class DurableJob implements DurableJobFields {
  [OptionalProps]?: 'id' | 'status' | 'availableAt' | 'attempts' | 'maxAttempts' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'string', fieldName: 'job_type', length: 64 })
  jobType!: JobType;

  @Property({ type: 'string', fieldName: 'deduplication_key', length: 255 })
  deduplicationKey!: string;

  @ManyToOne(() => JobSchedule, {
    fieldName: 'schedule_id',
    foreignKeyName: 'durable_jobs_schedule_id_fkey',
    deleteRule: 'restrict',
    nullable: true,
  })
  schedule?: JobSchedule;

  @Property({
    type: 'datetime',
    fieldName: 'scheduled_for',
    columnType: 'timestamptz',
    nullable: true,
  })
  scheduledFor?: Date;

  @Property({ type: 'string', fieldName: 'status', length: 64, default: JobStatus.Queued })
  status: JobStatus = JobStatus.Queued;

  @Property({
    type: 'datetime',
    fieldName: 'available_at',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  availableAt: Date = new Date();

  @Property({ type: 'integer', fieldName: 'attempts', default: 0 })
  attempts: number = 0;

  @Property({ type: 'integer', fieldName: 'max_attempts', default: 3 })
  maxAttempts: number = 3;

  @Property({ type: 'uuid', fieldName: 'lease_token', nullable: true })
  leaseToken?: string;

  @Property({
    type: 'datetime',
    fieldName: 'lease_expires_at',
    columnType: 'timestamptz',
    nullable: true,
  })
  leaseExpiresAt?: Date;

  @Property({
    type: 'datetime',
    fieldName: 'completed_at',
    columnType: 'timestamptz',
    nullable: true,
  })
  completedAt?: Date;

  @Property({
    type: 'datetime',
    fieldName: 'created_at',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt: Date = new Date();
}

type DurableJobFieldsCheck = Assert<SameEntityFields<DurableJob, DurableJobFields>>;
