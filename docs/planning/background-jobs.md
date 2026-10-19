# Background jobs and reconciliation

## Scope and access

Branch `008-feat-durable-jobs-and-history` builds operator-only, report-only billing reconciliation. The job inspects purchases and capability grants across the platform. Instructors do not trigger or inspect operational findings by default. Operator CLI access initially relies on access to the backend environment/database; no public endpoints, new account role, or admin UI are added.

Authoritative history lives in PostgreSQL. A command will print job/run IDs, status, records checked, finding counts, and a way to inspect individual findings. Logs provide diagnostics without payment credentials, signing secrets, raw webhook payloads, or unsanitized exception text.

Persistence, reusable scheduler/worker cycles, and the report-only reconciliation handler are implemented. The operator CLI is implemented; see [commands and automation](../development/operator-jobs.md). `bootstrap/jobs.ts` composes the real handler with the registry/store for operator use; API startup never invokes it or activates automation. The bare registry still allows metadata-only construction for tests; execution without an injected handler records `HANDLER_UNAVAILABLE`.

## Recurrence, execution, and retry

A schedule describes an interval and its next occurrence. A job describes one scheduled occurrence or manual request. A run describes one execution attempt. A failed attempt's retry does not create another recurring occurrence.

Scheduler and worker are separate reusable cycles:

1. **Scheduler cycle:** lock a bounded batch of enabled due schedules; enqueue unique occurrences and advance their next scheduled time in the same transaction. Concurrent cycles must not duplicate an occurrence. Bound catch-up work rather than enqueueing an unlimited outage backlog.
2. **Worker cycle:** atomically claim eligible jobs, increment attempts, and persist a unique lease token and execution record. Execute outside the claim transaction, with a bounded runtime or guarded lease extension.
3. **Finalization:** verify that the current lease token still owns the job and is unexpired, then atomically record the result/findings and terminal state. A stale worker cannot finalize after replacement.
4. **Retry/recovery:** record failure or lease expiration in history and retry the same job after a bounded delay. On exhaustion, mark it failed. Repeated execution is expected; effects must be idempotent.

Initial operational defaults to implement: three attempts, a 60-second lease, and increasing retry delays starting at 30 seconds (capped at 15 minutes). Use database time and inject clocks only for deterministic tests. Schedules remain explicitly disabled until an operator enables one; choose/configure the interval at setup rather than implicitly starting a background timer on API boot.

Expose separate CLI commands for manual enqueue, scheduler cycle, worker cycle, and history/findings inspection. An external scheduler can later invoke those commands or the same cycle functions. No always-on worker, AWS provisioning, or in-process timer is necessary for this branch. Running multiple cycles must be safe.

## Per-job defaults and future schedule administration

The job registry associates each job type with its injected handler and setup defaults: recommended interval, attempt budget, lease duration, and retry policy. Defaults are specific to the job type, not one universal interval for every job. Billing reconciliation initially recommends an hourly interval (3,600 seconds). The three-attempt, 60-second-lease, and 30-second initial retry values above are its starting policy, rather than requirements for every future job type.

Schedule setup copies the type-specific defaults into a new, disabled schedule. Subsequent scheduler cycles use the persisted `intervalSeconds`, `nextRunAt`, and attempt limit. Re-running setup must preserve operator edits rather than overwrite them from code. Each enqueued job snapshots its attempt budget. Manual jobs need no recurring schedule. Scheduler/worker invocation frequency belongs to deployment/automation configuration and is independent of each job's recurrence interval.

A future backend-connected admin interface may enable/pause schedules and update intervals. Backend endpoints must require explicit schedule-management permission, validate supported interval ranges per job type, and audit the actor, timestamp, and before/after values. Instructor membership or ownership of a class does not grant this permission.

Schedule edits must lock the schedule row and serialize with scheduler advancement. Interval changes need an explicit rule for recalculating `nextRunAt` (for example, reset from the change time versus preserve the next occurrence); that policy remains to be decided before edit endpoints are implemented. Already queued/running jobs and their snapshotted retry budgets must remain unchanged. Pausing recurrence should stop new scheduled occurrences, without implicitly canceling existing work.

The current schema supports persisted schedule configuration. Registry metadata and idempotent disabled schedule setup are now implemented. Permission checks, audit records, and administrative endpoints/UI are deferred. Add audit persistence with the future management workflow rather than inventing an admin identity model now.

## Implemented cycle boundaries

- `services/api/src/application/jobs/registry.ts` owns per-type interval, lease, timeout, and retry defaults. An injected handler is required for useful execution; there is no success placeholder.
- `application/jobs/cycles.ts` exposes `runSchedulerCycle` and `runWorkerCycle`. A scheduler batch defaults to 20 schedules; a worker cycle recovers up to its limit and executes up to ten jobs sequentially by default. Both accept limits from 1 to 100 and return counts. Worker counts distinguish successful completion, retry, exhausted failure, and stale finalization.
- `persistence/jobs/schedules.ts` provides idempotent disabled schedule setup, manual enqueue, and due-occurrence insertion/advancement. Manual deduplication keys apply within a job type. Concurrent setup preserves existing enabled state, cadence, next time, and attempt budget.
- `persistence/jobs/executions.ts` claims rows with PostgreSQL `FOR UPDATE SKIP LOCKED`, creates attempt records, recovers expired leases, and finalizes results under the job lock and current unexpired token. Database time is sampled after waiting for the finalization lock.

Each due schedule creates at most one occurrence per scheduler cycle. Its existing `nextRunAt` identifies that occurrence; advancement skips missed slots to the first future interval aligned to the original cadence. This intentionally coalesces an outage backlog instead of promising execution of every missed interval. Recurrence does not enforce one active execution per job type; separate occurrences can run concurrently and handlers must tolerate that.

Billing reconciliation currently has a 45-second execution timeout within a 60-second lease. The worker aborts the handler signal at timeout and records `EXECUTION_TIMEOUT` if the lease still belongs to it. JavaScript cannot forcibly terminate a handler promise: handlers must honor cancellation and must return report data rather than write findings directly. A late resolution cannot finalize twice. Longer tasks will need bounded partitioning or separately designed lease extension.

Handler exceptions persist only `HANDLER_FAILED`, without raw exception details. Missing handlers use `HANDLER_UNAVAILABLE`. Invalid results use `INVALID_RESULT`; result counts must fit nonnegative database integers, finding identifiers/kinds must be valid, and a result is capped at 1,000 findings. The reconciliation handler enforces scan/report bounds and fails explicitly rather than silently discarding findings.

Successful finalization commits findings, deduplicated finding count, run result, and terminal job state together. A database failure rolls back these changes, propagates to the caller, and leaves the lease for subsequent recovery. No external side effects are claimed to be exactly once. These functions also power the operator CLI, with setup/toggle, enqueue, cycle, list/inspect, and finding commands. No job routes, polling loop, timer-based automation, or AWS resources are installed.

## Reconciliation reports

Initial finding kinds:

- A refunded purchase still has an unrevoked active grant.
- A paid purchase is missing its expected grant.
- A purchase's grant does not match the purchased capability, class, or period.

The handler must distinguish legitimate expiration from missing/revoked coverage, use each purchase's saved terms rather than current catalog terms, and avoid reporting artifacts of an in-progress payment transaction. It should inspect a consistent view or take appropriate locks, with bounded scans and documented snapshot semantics. Grant source references must be resolved through provider/source identity. The predicates below are implemented and tested.

A finding records job ID, kind, related purchase/class IDs, optional grant ID, and detection time. The same kind/purchase is recorded once per job, even after retries; later independent runs may report the same unresolved issue. Findings are audit evidence, not repair instructions. Successful execution can contain findings; operational failure is a distinct result.

## Implemented report semantics and limits

The reader uses one PostgreSQL **repeatable-read, read-only** transaction and one database `asOf` timestamp. Purchases are scanned by UUID keyset in batches of 200; grants are joined logically by provider, source kind `class_purchase`, and purchase checkout reference. No class/instructor ownership filter applies. A payment committed between batches remains outside the original snapshot, so the report never combines a pre-payment purchase with its post-payment grants. Findings describe that snapshot, not a guarantee that a discrepancy still exists when an operator later inspects it.

- **Paid purchase missing grant:** no retained grant matches provider/source/reference. Expiration does not delete a grant; a valid retained expired grant is not missing.
- **Refunded purchase active grant:** a related grant is unrevoked and satisfies `startsAt <= asOf < endsAt`. Expired, not-yet-active, and revoked grants do not count as currently active.
- **Purchase/grant terms mismatch:** a related grant has a different class/capability, a duration unequal to the purchased number of 24-hour days, or starts before checkout creation. The comparison uses purchased terms, not edited plan terms. Matching grant revocation alone is not a discrepancy; intentional revocation is not classified as missing coverage.

A paid purchase with an incorrectly classed/dimensioned grant reports a terms mismatch, rather than a second missing-grant finding. Findings are bounded to one kind/purchase per job. Pending/failed purchases without grants are normal. This first handler does not detect orphan source references, all possible unexpected grants on unpaid purchases, or missing financial events. Exact activation start cannot be reconstructed from receipt hashes: the current schema does not retain payment occurrence time independently of the grant. It validates duration and earliest permissible start, not equality with an unavailable payment timestamp. Add stronger audit data/predicates deliberately when needed.

The scan allows at most 10,000 purchases, 5,000 matching grants per batch, and 1,000 findings. It uses a 30-second monotonic scan budget checked between queries, with a 10-second per-statement database timeout; the worker also enforces its 45-second execution timeout. Cancellation is checked before/after queries and before returning results. An in-flight query may continue until its statement timeout, but it cannot write financial state or finalize a late result.

Purchase/grant cap overflow records `RECONCILIATION_SCAN_LIMIT`; finding overflow records `RECONCILIATION_REPORT_LIMIT`; the explicit scan budget records `RECONCILIATION_SCAN_TIMEOUT`. Other failures remain sanitized. These are failed attempts subject to bounded retries, with no partial findings or successful partial counts. Growing beyond these bounds requires partitioned jobs or revised limits/lease design, not silently skipping records.

The handler returns data only. The existing lease-fenced finalizer atomically persists findings and run/job completion. A failed attempt after scanning leaves no report rows; retrying the same job produces one set. Separate later jobs may legitimately report the same unresolved discrepancy. Integration tests compare all financial rows before/after and verify no purchase/grant mutation.

## Deferred work

Automatic repair, real email, notifications/outbox delivery, assignment due dates/reminders, administrative web interfaces, institutions/subscriptions, production trigger selection, and long-term history cleanup remain outside this branch. A future repair mechanism needs explicit policy and audit controls. A future admin UI needs server-side administrative authorization, not instructor ownership filtering.

The operator CLI preserves schedule timing on enable/pause and serializes toggles against scheduler advancement. It exposes no interval-edit command yet. Connection lifecycle and safe error output are handled separately from command dispatch; help/invalid arguments require no database connection. Worker JSON includes job IDs/attempts and inspection commands; inspect includes durable run IDs and finding counts. See the [CLI guide](../development/operator-jobs.md) for pagination, exit codes, and compiled automation entry points.
