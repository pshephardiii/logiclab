import { z } from 'zod';

const uuid = z.uuid();
const jobType = z.literal('billing_reconciliation');
const integer = (min: number, max: number) =>
  z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(min).max(max));
const page = [integer(0, 1000000).optional(), integer(1, 100).optional()] as const;
const commandSchema = z.union([
  z.tuple([z.literal('help')]),
  z.tuple([z.literal('setup'), jobType]),
  z.tuple([z.enum(['enable', 'pause']), uuid]),
  z.tuple([z.literal('enqueue'), jobType, z.string().trim().min(1).max(255)]),
  z.tuple([z.enum(['scheduler', 'worker']), integer(1, 100).optional()]),
  z.tuple([z.enum(['list', 'schedules']), ...page]),
  z.tuple([z.literal('inspect'), uuid]),
  z.tuple([z.literal('findings'), uuid, ...page]),
]);
export class JobArgumentsError extends Error {}
export function parseJobArguments(args: string[]) {
  const input =
    args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0]!))
      ? ['help']
      : args;
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success)
    throw new JobArgumentsError('Invalid jobs command. Run npm run jobs -- help for usage.');
  return parsed.data;
}
export type JobCommand = ReturnType<typeof parseJobArguments>;
export const JOBS_HELP = `Operator jobs commands (run from repository root):
  npm run jobs -- setup billing_reconciliation
  npm run jobs -- schedules [offset] [limit]
  npm run jobs -- enable <schedule-id>
  npm run jobs -- pause <schedule-id>
  npm run jobs -- enqueue billing_reconciliation <request-key>
  npm run jobs -- scheduler [limit]
  npm run jobs -- worker [limit]
  npm run jobs -- list [offset] [limit]
  npm run jobs -- inspect <job-id>
  npm run jobs -- findings <job-id> [offset] [limit]

Requires operator access to DATABASE_URL and migrated PostgreSQL, not Cognito credentials.
Setup creates a disabled schedule and preserves existing edits. Enable/pause preserves nextRunAt.
Cycles run once and exit; no automatic polling is installed. Output is JSON, except help.
Worker exit code 2 means recovery/retry/failure/stale finalization requires inspection.
Findings in a successful report are data, not an execution failure. Other errors exit 1.`;
