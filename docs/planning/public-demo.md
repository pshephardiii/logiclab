# Public demo direction

Agreed for `009-chore-public-demo-and-portfolio`. This document separates intended behavior from implemented slices.

## Visitor experience

Visitors start an isolated workspace containing a synthetic instructor and student, classrooms, reusable problems, a published assignment, and simulated billing state. They can explore either role without registering, supplying credentials, or receiving email. Switching roles preserves the same workspace, so an instructor-created assignment can be completed as its student. This is distinct from a real instructor's future Student view preview.

Use an unpaid class to demonstrate simulated checkout and a funded class to demonstrate assignment publication immediately. All payment controls must clearly state that no money is charged. Seed valid purchases, receipts, and entitlements through the intended simulator workflow rather than pretending a class is funded with a UI flag. Shared catalog plans may be reused; reset must not change shared catalog terms.

A restart invalidates the workspace's previous demo sessions, restores the selected starting scenario, and returns to role selection. Other visitors and ordinary accounts are unaffected. Resetting the example assignment restores answers, submission/progress, and related starting data, not just the visible form. An intentional role switch keeps changes; a reset discards them.

## Identity and isolation

Each visitor gets fresh synthetic application users and owned data. Do not create Cognito users, fake Cognito subjects, or emails per visit. The internal identity/session foundation now explicitly distinguishes local demo users from Cognito users. PostgreSQL requires normal users to retain Cognito identifiers and forbids those identifiers or email on demo users. HTTP access and cookie handling are not wired yet. Demo sessions must not become a bypass for normal sign-in or permit selection of arbitrary user IDs.

Use an opaque HttpOnly demo cookie backed by a server-side session. Store only its hash. Bind it to a workspace and generation, and resolve the selected instructor/student on the server. A workspace UUID alone is not a credential. Role switching must rotate the session and remain within the same workspace. Keep demo identities out of ordinary Cognito login/session restoration.

Link synthetic users explicitly to their workspace, with unique role membership and a database-enforced distinction from normal users. Trace owned classes, problems, assignments, attempts, purchases, grants, and event receipts through explicit relationships. Before enabling access, audit every resource read/write, simulator action, and session path for cross-workspace and normal-account isolation. Public demo mode must not expose platform-wide operator jobs or reports.

## Lifecycle and cleanup

The root record has:

- Lifecycle status: `provisioning`, `active`, `resetting`, or `expired`.
- Seed template version, separate from a monotonically increasing reset generation.
- Creation and last-activity timestamps, idle expiration, and an absolute expiration that activity cannot extend.

Only active, unexpired workspaces with a matching session generation may be used. Expiration must block access immediately on the server even if cleanup has not run. Background requests/polling should not keep an abandoned tab alive indefinitely. The internal policy defaults to 30 minutes idle, four hours absolute, and one minute between activity updates. Configure these with `DEMO_IDLE_TIMEOUT_SECONDS`, `DEMO_MAX_LIFETIME_SECONDS`, and `DEMO_ACTIVITY_INTERVAL_SECONDS`; values must be positive integers, activity interval must be shorter than idle timeout, and idle timeout cannot exceed absolute lifetime. The initial supported absolute maximum is 24 hours. These defaults are for the demo and are not a production uptime commitment. Merely reading this configuration enables no routes.

Provision/reset must be transactional or use an explicit unavailable state with recoverable failure handling. Serialize them with role switching and writes under a workspace lock. Increment generation on reset and invalidate old sessions before accepting new work. Late requests from a previous generation must not restore deleted state. Do not reset the original absolute lifetime; a visitor can explicitly start a new workspace after expiration.

Use the durable job registry, scheduler, and worker for bounded, idempotent expired-workspace cleanup. Recheck expiration under lock against activity extension. Delete only positively identified demo-owned records in dependency order; never weaken existing financial/history retention constraints globally or delete by email prefix. Simulator event IDs and request keys must be workspace-scoped. Define how historical reconciliation findings remain safe after demo cleanup before enabling the job. Provisioning/reset failures must also expire and be reclaimable.

Add admission/rate limits and a global active-workspace cap before public exposure. Durable cleanup is not a substitute for bounded provisioning. Public demo users must not be able to create real accounts, real payment operations, or arbitrary job requests through demo credentials.

## Commit-sized implementation sequence

1. **Workspace persistence foundation (implemented):** root entity, lifecycle enum, exact field interface, lifetime/version checks, expiry indexes, additive migration/snapshot, and database tests. No users, sessions, seed graph, access endpoints, or automatic cleanup yet.
2. **Demo identities and sessions (internal foundation implemented):** explicit local identity variant, one user per workspace/role, separate hash-only session records, internal issue/resolve/rotate/revoke service, workspace/generation/expiry checks under row lock, configurable activity throttling/cap, and isolation/concurrency tests. Existing Cognito sign-in rejects demo identities. No public demo endpoint, cookie, provisioning, or route authorization is enabled yet.
3. **Repeatable seed/reset (internal implementation complete):** private instructor/student data graph, unpaid/funded simulator scenarios, example assignment, transactional provisioning/reset, concurrent write fencing, and retry/rollback tests.
4. **Demo entry and role switching:** clear synthetic-data/payment notices, role selection, reset controls, and preserved same-workspace journeys with frontend tests.
5. **Bounded cleanup and admission controls:** job registration, abandoned provisioning recovery, safe scoped deletion, capacity/rate controls, concurrency tests, and operator instructions. Automation wiring is prepared; hosting determines the trigger.
6. **Portfolio/deployment verification:** walkthrough, architecture/tradeoffs, screenshots, browser smoke checks, and reviewed hosting configuration. Do not claim a hosted demo until verified.

## Hosting boundary

The existing portfolio will link to LogicLab. LogicLab still needs frontend hosting, an API runtime, and PostgreSQL. Minimize initial cost; AWS is a possible later production destination, not a requirement to deploy there now. Acceptable wake-up delays, current hosting prices/quotas, spending limits, persistence, and scheduler support remain to evaluate before provisioning. No paid resources or public deployment are created by these foundational slices.

## Session foundation boundaries

The internal session service issues credentials only for already-active workspaces with the selected role present. Its `issue(workspaceId, role)` operation is a trusted provisioning capability, not a future public endpoint accepting arbitrary workspace IDs. Demo credential hashes use a distinct namespace from normal sessions. Role changes atomically remove the old credential and persist a fresh one; failed replacements roll back. Authentication reads do not touch activity timestamps. Expired/unavailable/stale-generation sessions cannot be revived by activity updates.

`DemoActor` contains the selected user, workspace, and generation; it is not an ordinary Cognito user with a fabricated subject. Future route integration must keep generation validation and the associated resource operation in the same workspace-locked transaction. Returning an actor from session authentication alone cannot fence later writes against a concurrent reset. Resource scoping, safe invitation redemption, simulator isolation, HTTP origin/cookie behavior, and admission limits must be verified before exposing demo credentials to existing application routes.

Demo users restrict workspace deletion until explicit dependency-ordered cleanup removes their owned data. Session records cascade only when their workspace is deleted; ordinary financial/history retention constraints are unchanged. The migration preserves existing users as Cognito identities. Rolling it back requires removing demo data first because Cognito identifier columns become mandatory again. No development/demo accounts or sessions are automatically seeded.

## Seed and reset implementation

The internal workspace service now provisions template version 1: a synthetic instructor/student, two enrolled classes (funded and unpaid), one private library problem with an immutable published version, and a published truth-table assignment with solutions available after submission. The assignment starts with no student attempt. The funded class uses the existing simulator checkout, signed payment verification/receipt/grant processing, and entitlement-checked assignment publication. No provider network call or real charge occurs. Each graph has fresh UUID purchase references and event IDs, resolved to its own payer/class; no shared per-visitor payment reference is reused.

Provisioning is one transaction. Its internal workspace ID supports retry/deduplication under a row lock; the application service generates IDs server-side. Retrying the same active internal ID preserves visitor changes instead of reseeding. Retired or unsupported shared plan terms cause provisioning/reset to fail rather than overwriting the catalog or silently inventing coverage. Seed content is versioned separately from the reset generation.

Reset authenticates the current demo credential and holds the workspace lock throughout deletion, reseeding, and credential replacement. It increments generation, removes previous demo sessions, and rebuilds all owned content, enrollment, work, and simulator purchases/receipts/grants. It leaves shared billing plans and historical operator reconciliation findings untouched. Finding IDs remain point-in-time audit snapshots even if their demo source records have been removed. Foreign workspace references cause a rollback instead of deletion. Financial/history restrictions on ordinary records are unchanged.

Published problem versions and submitted attempts remain immutable to updates in all states. Their database guards permit deletion only for demo-owned records in a resetting/expired workspace, locking that root; submitted work also requires the student and class owner to belong to the same workspace. This makes eventual cleanup possible without disabling triggers globally. The deletion helper independently checks and locks the workspace, validates ownership boundaries, and deletes dependencies in order.

A successful reset returns a fresh opaque credential for the same selected role and replaces the synthetic user IDs. The upcoming UI can return to role selection using this credential; it must clear cached resource IDs and page state. The old credential cannot reset again or restore old work. If the response is lost after commit, that old credential remains invalid; the visitor can start a fresh demo. On transaction failure the previous graph, generation, and sessions remain usable for retry. The original absolute deadline is retained; expired workspaces cannot be revived. Reset may refresh idle activity within that deadline.

`createDemoAccess(...).withSession(...)` is the common session/resource transaction boundary. It locks the workspace, samples database time, and rechecks credential/generation before executing work. Resource operations must use this same manager and the resolved workspace user. The billing/assignment stores can join an explicitly supplied transaction so seed/reset does not commit financial or publication effects independently. Do not catch and ignore workflow failures inside that transaction.

These are internal capabilities only: no provisioning/reset endpoint, HTTP cookie, frontend entry point, automatic seeding, cleanup trigger, or admission limiter is enabled. Apply the migration with `npm run db:migrate`; `npm run check` and `npm run db:test` exercise the foundation without Cognito, emails, or real payments. Public route wiring must still audit every resource/invitation/simulator path and enforce capacity limits before launch.
