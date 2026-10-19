import type { JobType } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { JobClaim, JobOutcome } from '../../application/jobs/types';

export interface JobStore {
  setupSchedule(jobType: JobType): Promise<string>;
  enqueue(jobType: JobType, deduplicationKey: string): Promise<string>;
  scheduleDue(limit: number): Promise<number>;
  recoverExpired(limit: number): Promise<number>;
  claim(): Promise<JobClaim | null>;
  finish(claim: JobClaim, outcome: JobOutcome): Promise<'succeeded' | 'retry' | 'failed' | 'stale'>;
}
