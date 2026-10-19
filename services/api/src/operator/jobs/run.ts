import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { createJobRuntime } from '../../bootstrap/jobs';
import { createJobOperatorStore, JobOperatorError } from '../../persistence/jobs/operator-store';
import { parseJobArguments, JobArgumentsError, JOBS_HELP } from './arguments';
import { dispatchJobCommand } from './dispatch';

interface CommandIo {
  out(text: string): void;
  error(text: string): void;
}
export async function runJobsCommand(
  args: string[],
  env: NodeJS.ProcessEnv,
  io: CommandIo,
  connect: typeof createDatabase = async (...input) =>
    (await import('@logiclab/db')).createDatabase(...input),
): Promise<number> {
  let orm: Awaited<ReturnType<typeof createDatabase>> | undefined;
  let exitCode = 0;
  try {
    const command = parseJobArguments(args);
    if (command[0] === 'help') {
      io.out(JOBS_HELP);
      return 0;
    }
    if (!env.DATABASE_URL) {
      io.error('DATABASE_URL is required for operator jobs commands.');
      return 1;
    }
    orm = await connect(env.DATABASE_URL, { snapshotOnMigrate: false });
    const result = await dispatchJobCommand(command, {
      runtime: await createJobRuntime(orm),
      operator: await createJobOperatorStore(orm),
    });
    io.out(
      typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2),
    );
    exitCode = result.exitCode;
  } catch (error) {
    io.error(
      error instanceof JobArgumentsError || error instanceof JobOperatorError
        ? error.message
        : 'Jobs command failed. Check database connectivity, migrations, and operator configuration.',
    );
    exitCode = 1;
  } finally {
    if (orm) {
      try {
        await orm.close(true);
      } catch {
        io.error('Jobs command database shutdown failed.');
        exitCode = 1;
      }
    }
  }
  return exitCode;
}
