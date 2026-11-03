import type {
  DurableJob as JobEntity,
  JobSchedule as ScheduleEntity,
  JobRun,
  ReconciliationFinding,
} from '@logiclab/db' with { 'resolution-mode': 'import' };

export function jobSummary(job: JobEntity) {
  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    scheduleId: job.schedule?.id ?? null,
    scheduledFor: job.scheduledFor?.toISOString() ?? null,
    availableAt: job.availableAt.toISOString(),
    leaseExpiresAt: job.leaseExpiresAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}
export function scheduleSummary(schedule: ScheduleEntity) {
  return {
    id: schedule.id,
    name: schedule.name,
    jobType: schedule.jobType,
    enabled: schedule.enabled,
    intervalSeconds: schedule.intervalSeconds,
    maxAttempts: schedule.maxAttempts,
    nextRunAt: schedule.nextRunAt.toISOString(),
  };
}

export function runSummary(run: JobRun) {
  return {
    id: run.id,
    attempt: run.attempt,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    errorCode: run.errorCode ?? null,
    recordsChecked: run.recordsChecked,
    findingsCount: run.findingsCount,
  };
}

export function findingSummary(row: ReconciliationFinding) {
  return {
    id: row.id,
    kind: row.kind,
    purchaseId: row.purchaseId,
    classId: row.classId,
    grantId: row.grantId ?? null,
    detectedAt: row.detectedAt.toISOString(),
  };
}
