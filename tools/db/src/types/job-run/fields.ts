import type { DurableJob } from '../../entities/DurableJob.ts';
import type { JobRunStatus } from '../job-run/enums.ts';

export interface JobRunFields {
  id: string;
  job: DurableJob;
  attempt: number;
  leaseToken: string;
  status: JobRunStatus;
  startedAt: Date;
  finishedAt?: Date;
  errorCode?: string;
  recordsChecked: number;
  findingsCount: number;
}
