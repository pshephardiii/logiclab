import type { JobType } from '../job-schedule/enums.ts';
import type { JobSchedule } from '../../entities/JobSchedule.ts';
import type { JobStatus } from '../durable-job/enums.ts';

export interface DurableJobFields {
  id: string;
  jobType: JobType;
  deduplicationKey: string;
  schedule?: JobSchedule;
  scheduledFor?: Date;
  status: JobStatus;
  availableAt: Date;
  attempts: number;
  maxAttempts: number;
  leaseToken?: string;
  leaseExpiresAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}
