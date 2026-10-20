import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, Check, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/es';
import type { JobScheduleFields } from '../types/job-schedule/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { JobType } from '../types/job-schedule/enums.ts';

/** Disabled-by-default recurring definition; scheduler cycles create distinct durable occurrences. */
@Entity({ tableName: 'job_schedules' })
@Unique({ name: 'job_schedules_name_unique', properties: ['name'] })
@Index({ name: 'job_schedules_due_index', properties: ['enabled', 'nextRunAt'] })
@Check({
  name: 'job_schedules_type_check',
  expression: "job_type in ('billing_reconciliation', 'demo_cleanup')",
})
@Check({ name: 'job_schedules_interval_check', expression: 'interval_seconds > 0' })
@Check({ name: 'job_schedules_attempts_check', expression: 'max_attempts between 1 and 10' })
export class JobSchedule implements JobScheduleFields {
  [OptionalProps]?: 'id' | 'enabled' | 'maxAttempts' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'string', fieldName: 'name', length: 120 })
  name!: string;

  @Property({ type: 'string', fieldName: 'job_type', length: 64 })
  jobType!: JobType;

  @Property({ type: 'boolean', fieldName: 'enabled', default: false })
  enabled: boolean = false;

  @Property({ type: 'integer', fieldName: 'interval_seconds' })
  intervalSeconds!: number;

  @Property({ type: 'datetime', fieldName: 'next_run_at', columnType: 'timestamptz' })
  nextRunAt!: Date;

  @Property({ type: 'integer', fieldName: 'max_attempts', default: 3 })
  maxAttempts: number = 3;

  @Property({
    type: 'datetime',
    fieldName: 'created_at',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt: Date = new Date();
}

type JobScheduleFieldsCheck = Assert<SameEntityFields<JobSchedule, JobScheduleFields>>;
