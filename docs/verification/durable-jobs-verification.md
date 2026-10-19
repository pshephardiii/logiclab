# Durable jobs and history verification

Verification date: October 19, 2026. Branch: `008-feat-durable-jobs-and-history`.

## Automated checks

- `npm run check`: passed workspace type checks, 536 tests (71 engine, 411 API, 54 frontend), and production builds.
- `npm run db:test`: passed 100 PostgreSQL integration checks (86 database, 14 API/workflow tests).
- `npm run format:check` and `git diff --check`: passed.

Persistence coverage includes additive migration/schema consistency, disabled schedule defaults, paired occurrence fields, unique schedule occurrences/manual intents, attempt/lease/status constraints, retained history, and finding deduplication. Tests verify migrations do not rewrite application snapshots.

Scheduler/worker integration checks cover concurrent schedule setup and scheduler cycles, cadence override preservation, bounded outage catch-up, idempotent manual enqueue, independent claims, locked-row skipping, concurrent expired-lease recovery, fresh lease tokens, stale/expired finalization rejection, retry exhaustion, deduplicated findings, and full rollback when result persistence fails. Unit tests cover timeout cancellation, ignored late handler resolution, sanitized failures, supported operational codes, and bounded cycle inputs.

Reconciliation coverage checks known discrepancies across multiple instructors' classes, expired/revoked grant semantics, saved purchase terms rather than edited catalog terms, provider/source identity, report overflow/cancellation, and an unchanged financial-data snapshot before/after execution. A payment is committed between scan batches to prove the repeatable-read report never mixes pre-payment purchase state with post-payment grants. Failed scans/retries leave no partial findings; later successful attempts produce one set per job.

CLI coverage includes argument parsing before connection, missing configuration, safe error output, cleanup on success/failure, enable/pause, pagination, report/run IDs, zero exit status for successful reports containing findings, and attention-worthy recovery exit status. Inspection omits live lease tokens and request keys. No public job endpoints or instructor access are added.

## Compiled operator walkthrough

A local script invoked the built `services/api/dist/operator/jobs.js` entry point in fresh Node processes against a uniquely named temporary PostgreSQL database. The database was removed afterward. It verified:

- Repeatable disabled setup and preserved schedule identity.
- Explicit enable/pause and two concurrent scheduler invocations producing one occurrence.
- Concurrent manual enqueue calls reusing the same request key and job ID.
- Concurrent workers claiming separate jobs and recording one execution each.
- Job listing pagination, run inspection, empty reports, and findings pagination for deliberately inconsistent synthetic paid purchases.
- Successful reconciliation containing findings exits zero and leaves financial records unchanged.
- An abandoned claim with an expired lease is recovered by a fresh process with exit code 2; after making its retry available in test data, another process completes attempt two and retains attempt-one history.
- Unknown IDs and invalid arguments exit 1.

The walkthrough simulates crash recovery through an abandoned durable claim; it does not kill an OS process or wait for real lease/retry durations. It advances timestamps only in isolated test data. Source and compiled help commands were also checked. The script remains ignored local evidence under `.codex-local/verification/jobs-cli.mjs`, rather than a CI process-level regression test.

An initial harness attempted isolation through connection search-path settings, which the ORM overrides. That attempt created only a schedule in the configured disposable test database; no job ran and development data was untouched. The identified fixture was removed, and the successful walkthrough used a separate temporary database. Committed integration tests use explicitly configured isolated schemas.

## Limits and rollout

No AWS resources, external payment calls, Cognito requests, emails, timers, triggers, or background processes were provisioned. This branch has no new browser UI; browser walkthroughs were not repeated. Remote CI, production hosting, a clean dependency installation, and long-duration soak/load testing were not performed. Existing Vite chunk-size, Jest experimental VM-modules, and Vitest native-config advisories remain.

Apply `npm run db:migrate` before using operator commands. Run `npm run jobs -- help` from the repository root. Setup creates a disabled schedule; only explicit enqueue or enabled-schedule scheduler cycles create work. API startup executes no cycles. Operator access requires the backend database environment, not an instructor session. See the [operator CLI guide](../development/operator-jobs.md).

The initial handler is report-only and supports three documented purchase/grant discrepancy types. It uses bounded scans and a single read-only snapshot, not automatic repair or historical payment reconstruction. The current schema cannot independently reconstruct exact payment occurrence time. Reports describe their snapshot; a discrepancy may change before inspection. Limit overflow is a failed attempt, not successful truncation.

Work is at least once: a timed-out JavaScript promise cannot be forcibly terminated, so handlers must respect cancellation and return report data for fenced persistence rather than perform unfenced external effects. Lease extension, partitioned large scans, production trigger selection, schedule interval editing/audit, admin web permissions/UI, cleanup policies, real notifications/outbox delivery, institution subscriptions, and automatic repairs remain later work. Offset pages can shift under concurrent changes.
