import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Check, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/es';
import type { JobRunFields } from '../types/job-run/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { DurableJob } from './DurableJob.ts';
import { JobRunStatus } from '../types/job-run/enums.ts';

/** Execution history per claim, including failed or expired attempts; store sanitized error codes only. */
@Entity({ tableName: 'job_runs' })
@Unique({ name: 'job_runs_job_attempt_unique', properties: ['job', 'attempt'] })
@Unique({ name: 'job_runs_lease_unique', properties: ['leaseToken'] })
@Check({ name: 'job_runs_attempt_check', expression: 'attempt between 1 and 10' })
@Check({
  name: 'job_runs_counts_check',
  expression: 'records_checked >= 0 and findings_count >= 0',
})
@Check({
  name: 'job_runs_finished_check',
  expression: 'finished_at is null or finished_at >= started_at',
})
@Check({
  name: 'job_runs_state_check',
  expression: `
      (status = 'running'
        and finished_at is null
        and error_code is null)
      or (status = 'succeeded'
        and finished_at is not null
        and error_code is null)
      or (status in ('failed', 'lease_expired')
        and finished_at is not null
        and error_code is not null)
    `,
})
export class JobRun implements JobRunFields {
  [OptionalProps]?: 'id' | 'status' | 'startedAt' | 'recordsChecked' | 'findingsCount';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => DurableJob, {
    fieldName: 'job_id',
    foreignKeyName: 'job_runs_job_id_fkey',
    deleteRule: 'restrict',
  })
  job!: DurableJob;

  @Property({ type: 'integer', fieldName: 'attempt' })
  attempt!: number;

  @Property({ type: 'uuid', fieldName: 'lease_token' })
  leaseToken!: string;

  @Property({ type: 'string', fieldName: 'status', length: 64, default: JobRunStatus.Running })
  status: JobRunStatus = JobRunStatus.Running;

  @Property({
    type: 'datetime',
    fieldName: 'started_at',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  startedAt: Date = new Date();

  @Property({
    type: 'datetime',
    fieldName: 'finished_at',
    columnType: 'timestamptz',
    nullable: true,
  })
  finishedAt?: Date;

  @Property({ type: 'string', fieldName: 'error_code', length: 64, nullable: true })
  errorCode?: string;

  @Property({ type: 'integer', fieldName: 'records_checked', default: 0 })
  recordsChecked: number = 0;

  @Property({ type: 'integer', fieldName: 'findings_count', default: 0 })
  findingsCount: number = 0;
}

type JobRunFieldsCheck = Assert<SameEntityFields<JobRun, JobRunFields>>;
