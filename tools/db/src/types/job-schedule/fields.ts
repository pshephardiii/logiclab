import type { JobType } from '../job-schedule/enums.ts';

export interface JobScheduleFields {
  id: string;
  name: string;
  jobType: JobType;
  enabled: boolean;
  intervalSeconds: number;
  nextRunAt: Date;
  maxAttempts: number;
  createdAt: Date;
}
