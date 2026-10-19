# Operator jobs CLI

These commands provide platform-wide operational access. They are not instructor endpoints and require operator access to the backend environment and `DATABASE_URL`. Cognito credentials and an enabled billing simulator are not required for job execution; the job audits retained billing data without contacting payment providers or repairing coverage.

## Setup and a manual report

Run from the repository root using Node 24.9 or later, with PostgreSQL running and `DATABASE_URL` in ignored `.env`:

```sh
npm run db:migrate
npm run jobs -- help
npm run jobs -- setup billing_reconciliation
npm run jobs -- enqueue billing_reconciliation interview-demo-1
npm run jobs -- worker 10
npm run jobs -- list
```

Setup creates a disabled schedule with the registry's per-job defaults. Re-running it preserves existing operator changes. Manual enqueue requires an explicit request key: reuse the same key if its response is lost. A different key represents a new deliberate run. Setup does not execute anything; manual jobs do not require an enabled schedule.

The enqueue command prints a job ID. Worker output prints execution/recovery totals, claimed job IDs and attempts, and inspection commands. To inspect a report:

```sh
npm run jobs -- inspect <job-id>
npm run jobs -- findings <job-id> 0 20
```

Replace angle-bracket placeholders with actual IDs; do not type them literally. Inspection includes job status, expired-lease indication, total finding count, and all attempt records (up to the schema's ten-attempt maximum), including run IDs, times, sanitized error codes, checked-record counts, and finding counts. It omits lease tokens, request keys, provider credentials, and raw payment payloads. Findings are identifiers plus discrepancy kinds, not repair instructions. A successful report with findings is still a successful job.

## Recurring scheduling and automation

```sh
npm run jobs -- schedules
npm run jobs -- enable <schedule-id>
npm run jobs -- scheduler 20
npm run jobs -- worker 10
npm run jobs -- pause <schedule-id>
```

Enable/pause takes the schedule-row lock, coordinating with scheduler advancement. Both preserve `nextRunAt`, cadence, and attempt budget. Resuming an overdue schedule enqueues at most one occurrence per cycle and advances to the first future interval aligned to its saved cadence. Pause prevents new scheduled occurrences after it commits; already queued/running jobs remain unchanged. A scheduler transaction that wins the lock first may enqueue before pause commits.

Commands run one cycle and exit. They install no recurring timer, HTTP endpoint, AWS trigger, or always-on worker. External automation can invoke scheduler and worker independently at suitable frequencies, without changing per-job recurrence. Existing concurrency/lease controls permit multiple invocations. Interval editing, actor audit records, and permission-backed admin interfaces remain deferred.

The root npm command builds the database workspace before executing TypeScript. For deployment automation, build once with `npm run build`, then invoke compiled entry points from the repository root instead:

```sh
node --env-file=.env services/api/dist/operator/jobs.js scheduler 20
node --env-file=.env services/api/dist/operator/jobs.js worker 10
```

If the deployment injects environment variables directly, omit `--env-file=.env`. These commands use the same dispatcher and cycle functions. Production trigger selection is separate work.

## Pagination and exit status

- `list [offset] [limit]`: newest jobs first.
- `schedules [offset] [limit]`: schedule name/ID order.
- `findings <job-id> [offset] [limit]`: kind/purchase/ID order.

Offsets default to 0 (maximum 1,000,000); page limits default to 20 (maximum 100). `nextOffset: null` means the final page. Offset pages may shift during concurrent changes. Scheduler/worker limits are independently bounded from 1 to 100, defaulting to 20 schedules and ten executions respectively.

Command payloads are JSON, except help. npm may add lifecycle banners; use the compiled Node entry point when stdout must contain JSON only.

- **0:** command succeeded. Findings in a successful report do not change this code.
- **1:** invalid arguments/configuration, missing job/schedule, database/runtime failure, or cleanup failure. Unknown errors are sanitized and never print the connection string.
- **2:** worker cycle observed expired-lease recovery, a retry, exhausted failure, or stale finalization. Inspect `list`/`inspect` before deciding what operational action is needed. Recovery can require attention even when no newly eligible job executes in that cycle.

The CLI closes its database connection after success or failure. A killed process may leave a running lease; a later worker cycle recovers it using the existing retry budget. No migration is applied automatically. Full reconciliation limits, snapshot semantics, and non-goals are documented in the [job design](../planning/background-jobs.md).
