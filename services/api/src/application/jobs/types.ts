import type { FindingKind, JobType } from '@logiclab/db' with { 'resolution-mode': 'import' };

export interface JobFinding {
  kind: FindingKind;
  purchaseId: string;
  classId: string;
  grantId?: string;
}
export interface JobResult {
  recordsChecked: number;
  findings: JobFinding[];
}
export type JobHandler = (context: {
  jobId: string;
  attempt: number;
  signal: AbortSignal;
}) => Promise<JobResult>;
export interface JobDefinition {
  defaultIntervalSeconds: number;
  maxAttempts: number;
  leaseSeconds: number;
  timeoutSeconds: number;
  retryBaseSeconds: number;
  retryMaxSeconds: number;
  handler?: JobHandler;
}
export type JobRegistry = Readonly<Record<JobType, JobDefinition>>;
export interface JobClaim {
  id: string;
  jobType: JobType;
  attempt: number;
  leaseToken: string;
}
export type JobFailureCode =
  'HANDLER_UNAVAILABLE' | 'HANDLER_FAILED' | 'EXECUTION_TIMEOUT' | 'INVALID_RESULT';
export type JobOutcome = { ok: true; result: JobResult } | { ok: false; code: JobFailureCode };
