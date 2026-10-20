# Public demo direction

Agreed for `009-chore-public-demo-and-portfolio`. This document separates intended behavior from implemented slices.

## Visitor experience

Visitors start an isolated workspace containing a synthetic instructor and student, classrooms, reusable problems, a published assignment, and simulated billing state. They can explore either role without registering, supplying credentials, or receiving email. Switching roles preserves the same workspace, so an instructor-created assignment can be completed as its student. This is distinct from a real instructor's future Student view preview.

Use an unpaid class to demonstrate simulated checkout and a funded class to demonstrate assignment publication immediately. All payment controls must clearly state that no money is charged. Seed valid purchases, receipts, and entitlements through the intended simulator workflow rather than pretending a class is funded with a UI flag. Shared catalog plans may be reused; reset must not change shared catalog terms.

A restart invalidates the workspace's previous demo sessions, restores the selected starting scenario, and returns to role selection. Other visitors and ordinary accounts are unaffected. Resetting the example assignment restores answers, submission/progress, and related starting data, not just the visible form. An intentional role switch keeps changes; a reset discards them.

## Identity and isolation

Each visitor gets fresh synthetic application users and owned data. Do not create Cognito users, fake Cognito subjects, or emails per visit. Introduce an explicit local demo identity path in a later slice, preserving existing Cognito-linked account constraints and normal authentication. Demo sessions must not become a bypass for normal sign-in or permit selection of arbitrary user IDs.

Use an opaque HttpOnly demo cookie backed by a server-side session. Store only its hash. Bind it to a workspace and generation, and resolve the selected instructor/student on the server. A workspace UUID alone is not a credential. Role switching must rotate the session and remain within the same workspace. Keep demo identities out of ordinary Cognito login/session restoration.

Link synthetic users explicitly to their workspace, with unique role membership and a database-enforced distinction from normal users. Trace owned classes, problems, assignments, attempts, purchases, grants, and event receipts through explicit relationships. Before enabling access, audit every resource read/write, simulator action, and session path for cross-workspace and normal-account isolation. Public demo mode must not expose platform-wide operator jobs or reports.

## Lifecycle and cleanup

The root record has:

- Lifecycle status: `provisioning`, `active`, `resetting`, or `expired`.
- Seed template version, separate from a monotonically increasing reset generation.
- Creation and last-activity timestamps, idle expiration, and an absolute expiration that activity cannot extend.

Only active, unexpired workspaces with a matching session generation may be used. Expiration must block access immediately on the server even if cleanup has not run. Background requests/polling should not keep an abandoned tab alive indefinitely. Initial idle/absolute durations and activity-update throttling will be configurable when lifecycle services are implemented; no production values are committed by this slice.

Provision/reset must be transactional or use an explicit unavailable state with recoverable failure handling. Serialize them with role switching and writes under a workspace lock. Increment generation on reset and invalidate old sessions before accepting new work. Late requests from a previous generation must not restore deleted state. Do not reset the original absolute lifetime; a visitor can explicitly start a new workspace after expiration.

Use the durable job registry, scheduler, and worker for bounded, idempotent expired-workspace cleanup. Recheck expiration under lock against activity extension. Delete only positively identified demo-owned records in dependency order; never weaken existing financial/history retention constraints globally or delete by email prefix. Simulator event IDs and request keys must be workspace-scoped. Define how historical reconciliation findings remain safe after demo cleanup before enabling the job. Provisioning/reset failures must also expire and be reclaimable.

Add admission/rate limits and a global active-workspace cap before public exposure. Durable cleanup is not a substitute for bounded provisioning. Public demo users must not be able to create real accounts, real payment operations, or arbitrary job requests through demo credentials.

## Commit-sized implementation sequence

1. **Workspace persistence foundation (implemented):** root entity, lifecycle enum, exact field interface, lifetime/version checks, expiry indexes, additive migration/snapshot, and database tests. No users, sessions, seed graph, access endpoints, or automatic cleanup yet.
2. **Demo identities and sessions:** explicit local synthetic identity/membership, hashed opaque sessions, workspace/generation authorization, expiration/activity policy, and isolation tests. Normal Cognito accounts remain supported.
3. **Repeatable seed/reset:** private instructor/student data graph, unpaid/funded simulator scenarios, example assignment, transactional provisioning/reset, concurrent write fencing, and retry/rollback tests.
4. **Demo entry and role switching:** clear synthetic-data/payment notices, role selection, reset controls, and preserved same-workspace journeys with frontend tests.
5. **Bounded cleanup and admission controls:** job registration, abandoned provisioning recovery, safe scoped deletion, capacity/rate controls, concurrency tests, and operator instructions. Automation wiring is prepared; hosting determines the trigger.
6. **Portfolio/deployment verification:** walkthrough, architecture/tradeoffs, screenshots, browser smoke checks, and reviewed hosting configuration. Do not claim a hosted demo until verified.

## Hosting boundary

The existing portfolio will link to LogicLab. LogicLab still needs frontend hosting, an API runtime, and PostgreSQL. Minimize initial cost; AWS is a possible later production destination, not a requirement to deploy there now. Acceptable wake-up delays, current hosting prices/quotas, spending limits, persistence, and scheduler support remain to evaluate before provisioning. No paid resources or public deployment are created by these foundational slices.
