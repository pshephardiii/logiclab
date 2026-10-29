# Local isolated demo

The demo uses PostgreSQL and the existing application workflows with synthetic instructor/student identities. It creates no Cognito users, sends no email, and makes no real payment/provider call. Nothing is provisioned until a visitor starts a demo.

## Enable locally

Apply migrations with `npm run db:migrate`. In your ignored root `.env`, enable:

```dotenv
DEMO_ENABLED=true
APP_ORIGIN=http://localhost:5173
DEMO_MAX_WORKSPACES=25
```

Then restart `npm run dev` and open `http://localhost:5173/demo`.

Demo mode does not require normal authentication or billing configuration. For a demo-only local process, set `AUTH_ENABLED=false` and `BILLING_ENABLED=false`; otherwise the configured normal account flows remain available alongside it. `DATABASE_URL` must point to your development PostgreSQL database. Production/non-localhost origins require HTTPS. The frontend and cookie-based API must share an origin (Vite's `/api` proxy handles this locally).

Lifetime settings are described in [Public Demo Direction](../planning/public-demo.md). `DEMO_ENABLED` defaults to false. `DEMO_MAX_WORKSPACES` defaults to 25 and supports 1–100 workspaces. Capacity counts all stored workspaces, including expired ones, to bound storage between cleanup runs. An advisory transaction lock serializes the capacity check and provisioning across API processes. HTTP limits are currently per-process/per-IP; distributed rate limiting is not implemented.

## Walkthrough

1. Choose **Explore as instructor**. The funded class has an enrolled student and three published examples: the original graded truth table, **Explore tables and concepts at your own pace** (mixed private practice), and **Tables and concepts: separate grade and answer release** (mixed graded work). The second class has no coverage and can demonstrate simulated checkout under **Billing (simulated)**.
2. Create a class, edit private library drafts, or author additional assignments using the existing pages. All demo resource pages are under `/demo/...` and show a synthetic-data/no-real-charges notice.
3. Use **Switch role, reset, or end demo** to return to the control page. Choose student to see the same workspace's enrolled classes and assigned work. Save/submit the graded example normally. For **Explore tables and concepts at your own pace**, enter an incorrect answer and pause for automatic feedback, then try **Check answers**, explicit saves, and anytime solutions; practice has no final submission or instructor answer review. Ordinary authorization rules apply.
4. Reload a demo resource URL to restore the server session. Reselect the class and assignment after a full page refresh to reopen the work; saved answers remain on the server. No tokens or demo data are persisted in local/session storage.
5. **Reset demo and discard changes** replaces the synthetic graph and credentials, increments the workspace generation, and clears mounted page state. It preserves the original absolute expiration and the selected role; choose either role again to explore the restored examples.
6. **End demo** clears the demo cookie only. A normal account session in the same browser is unaffected. The workspace remains until expiration/cleanup.

Requests to normal account pages use normal authentication. Demo invitations work only within their workspace; normal students cannot redeem demo invitations, and demo students cannot redeem normal or other-workspace invitations. The API enforces this boundary independently of navigation.

## Implementation and verification

See the [demo API](../api/demo-api.md), [design](../planning/public-demo.md), and [seed/reset behavior](../planning/public-demo.md#seed-and-reset-implementation).

Run `npm run check` and `npm run db:test`. The integration suite exercises real demo HTTP/resource flows without AWS, including role/session isolation, reset, invitation boundaries, concurrent provisioning capacity, and a deferred commit failure that must not send a success response. Focused UI tests cover entry controls, demo request paths, restoration, cancellation, and failed-response reconciliation.

A one-off local Chrome walkthrough also verified instructor creation, student submission, role switching, reload, reset, logout, a 390px class layout, and empty browser storage. Its scripts/screenshots live in ignored `.codex-local/verification/`; this is local evidence, not a browser CI suite. No hosted deployment or live Cognito/payment flow was tested by this slice.

## Remaining work

Expired-workspace cleanup is available through the existing operator jobs CLI after applying migrations:

```sh
npm run db:migrate
npm run jobs -- setup demo_cleanup
npm run jobs -- enqueue demo_cleanup manual-cleanup-001
npm run jobs -- worker 1
npm run jobs -- inspect <job-id>
```

Setup creates a **disabled** schedule with a five-minute interval and preserves later operator edits. For recurring cleanup, explicitly enable the returned schedule ID with `npm run jobs -- enable <schedule-id>`. An external trigger must invoke `npm run jobs -- scheduler` and `npm run jobs -- worker` repeatedly (for example, once a minute); each command runs once and exits. No trigger is installed, and API startup never runs cleanup. The worker consumes all eligible job types, so `worker 1` may claim another queued job first. Reuse an enqueue request key only to retry the same request; use a new key for a new cleanup pass.

Each execution deletes at most ten expired workspaces. Remaining/locked workspaces wait for another execution. The job uses three attempts, a 90-second execution timeout and a 120-second lease. Database statements/lock waits are bounded; cancellation checks before deletion steps and commit roll back an interrupted batch. Deletion and durable completion are separate transactions: a crash after deletion can leave history incomplete, but retries safely find already-deleted roots absent. `JobRun.recordsChecked` counts workspaces removed in that attempt; there are no reconciliation findings. An unsafe batch fails for operator inspection instead of bypassing retention guards. See [cleanup semantics](../planning/public-demo.md#expired-workspace-cleanup-operation).

Cleanup operates on stored expired demo data even when demo HTTP routes are disabled. Capacity remains occupied until a cleanup pass actually removes rows. Hosting, published links, shared rate limiting, and the external automation trigger remain deployment decisions. Rolling back the job-type migration requires removing cleanup schedules/jobs and their dependent history first; do not discard history casually.

Template version 3 enables immediate feedback on the practice assignment while keeping the graded example submission-only. Existing active workspaces keep their changes; reset or start a new workspace to see the new example. Reset clears both examples and any visitor-created assignments. All supported learning modes and solution-release policies can now be published with valid class coverage.

## Template 4: conceptual examples

New visitors receive three reusable published problems: the original truth table, a true/false contradiction question and a single-answer classification question. Private practice includes all three with immediate checking and anytime solutions. The new mixed graded example withholds grades and answers until the instructor independently releases them. The original graded table keeps its submission-time result and post-submission solution policy.

Existing visitors are not upgraded on authentication or role switch. Explicit reset replaces their graph with template 4, rotates credentials and preserves the original absolute expiration. It removes their saved/submitted work and any authored demo content. No database migration is needed; rebuild/restart the API to seed the new template for new/reset workspaces. See the [reviewer walkthrough](demo-walkthrough.md) and [conceptual demo evidence](../verification/conceptual-questions-verification.md).
