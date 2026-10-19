import type { createJobRuntime } from '../../bootstrap/jobs';
import type { JobOperatorStore } from '../../persistence/jobs/operator-store';
import type { JobType } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { runSchedulerCycle, runWorkerCycle } from '../../application/jobs/cycles';
import type { JobCommand } from './arguments';
import { JOBS_HELP } from './arguments';
export interface JobCommandDependencies {
  runtime: Awaited<ReturnType<typeof createJobRuntime>>;
  operator: JobOperatorStore;
}
export async function dispatchJobCommand(
  command: JobCommand,
  { runtime, operator }: JobCommandDependencies,
) {
  const [action] = command;
  switch (action) {
    case 'help':
      return { output: JOBS_HELP, exitCode: 0 };
    case 'setup': {
      const id = await runtime.store.setupSchedule(command[1] as JobType);
      return {
        output: {
          scheduleId: id,
          note: 'New schedules are disabled. Existing settings were preserved.',
        },
        exitCode: 0,
      };
    }
    case 'enable':
    case 'pause':
      return { output: await operator.setEnabled(command[1], action === 'enable'), exitCode: 0 };
    case 'enqueue':
      return {
        output: {
          jobId: await runtime.store.enqueue(command[1] as JobType, command[2]),
          note: 'Reuse the same request key to retry this enqueue intent.',
        },
        exitCode: 0,
      };
    case 'scheduler':
      return { output: await runSchedulerCycle(runtime.store, command[1] ?? 20), exitCode: 0 };
    case 'worker': {
      const jobs: { jobId: string; attempt: number; inspectCommand: string }[] = [];
      const trackingStore = {
        ...runtime.store,
        claim: async () => {
          const claim = await runtime.store.claim();
          if (claim)
            jobs.push({
              jobId: claim.id,
              attempt: claim.attempt,
              inspectCommand: `npm run jobs -- inspect ${claim.id}`,
            });
          return claim;
        },
      };
      const counts = await runWorkerCycle(trackingStore, runtime.registry, command[1] ?? 10);
      const output = { ...counts, jobs };
      return {
        output,
        exitCode: output.recovered + output.retry + output.failed + output.stale > 0 ? 2 : 0,
      };
    }
    case 'list':
      return {
        output: await operator.jobs({ offset: command[1] ?? 0, limit: command[2] ?? 20 }),
        exitCode: 0,
      };
    case 'schedules':
      return {
        output: await operator.schedules({ offset: command[1] ?? 0, limit: command[2] ?? 20 }),
        exitCode: 0,
      };
    case 'inspect':
      return { output: await operator.inspect(command[1]), exitCode: 0 };
    case 'findings':
      return {
        output: await operator.findings(command[1], {
          offset: command[2] ?? 0,
          limit: command[3] ?? 20,
        }),
        exitCode: 0,
      };
  }
}
