# LogicLab — Data Design

Initial direction · October 12, 2026

This document records the agreed storage direction and reusable problem library. It complements [Product Direction](product-direction.md) and the [Implementation Plan](initial-implementation-plan.md). It is a conceptual model, not a finalized database schema or migration specification.

## Core decisions

- Instructors have a reusable problem library. A problem can appear in multiple problem sets; the first interface may create problems while composing a set.
- Keep problem definitions, assignment policy, and student work separate because they have different owners and lifecycles.
- Save a formula and exercise configuration, then generate its truth table. Do not store a duplicate complete table for every student.
- Store student answers separately from definitions and reference the exact problem version used.
- Assigned work uses immutable problem versions. Editing a problem creates a new version rather than changing the meaning of existing attempts.
- Independent practice uses the same exercise model without an assignment. Instructor access comes through their assignments, not through unrestricted access to a student's records.

Library reuse does not imply a publicly shared library or permission to browse another instructor's problems. Library sharing and ownership transfer remain undecided.

## Identity and classroom ownership

The HTTP auth slice adds nullable normalized email to `users`, unique within a Cognito pool. New signup saves it so successful password reset can delete all local sessions without trusting a user ID from the browser. Legacy synthetic users may omit email. Future email changes must keep this recovery lookup synchronized.

The auth foundation adds `auth_sessions`: a hashed opaque session ID, user foreign key, encrypted Cognito access/refresh tokens, and access/absolute expiry timestamps. Sessions cascade when their user is deleted. Credentials and plaintext tokens are not stored in application tables. Signup persists the chosen role as soon as Cognito returns its subject; login only reads that stored role. See [Cognito Development](../development/cognito-development.md) for compensation and session behavior.

The first classroom-access slice defines `users` in `tools/db`: generated UUID, Cognito pool ID/subject, one student/instructor role, and creation timestamp. The identity pair has a unique constraint. There are no local password/code fields. The auth service implements provisioning, and HTTP account routes are now registered when auth is enabled.

Cognito manages email/password credentials, email confirmation, and password recovery. Keep application users, the separate student/instructor role, class ownership, and enrollments in PostgreSQL. Link an application user to their Cognito identity using a stable subject identifier scoped to the configured user pool rather than treating email as a permanent identity key. Passwords and reset/confirmation codes must not be copied into application tables.

`classrooms` now persists a UUID, trimmed name, instructor owner, and creation timestamp. Names may repeat, owner-scoped queries enforce access, and owner deletion is restricted while classes exist. See [instructor classes](../api/classroom-api.md).

Initially, a class has one instructor owner and many student enrollments. Single-instructor ownership is an initial constraint, not a permanent requirement for future institution management. A student can enroll in multiple classes across instructors, using invitation codes. Enforce ownership and enrollment on the server. Institutional membership and co-instructor records are deferred. Invitation generation now uses one reusable code per class, a seven-day expiry, hash-only storage, and owner-controlled replacement; student redemption/enrollment is implemented with an enrollment unique constraint and a classroom row lock that serializes redemption against invitation replacement.

`enrollments` links a classroom and student, with UUID/timestamp, a unique class/student pair, and foreign keys that cascade on class/user deletion. The API enforces student role and scopes reads to that student. Reusable invitation redemption checks hash/expiry under a class row lock, and conflict-ignore insertion makes concurrent duplicate joins safe. No membership removal workflow is implemented yet.

Token/session handling and provisioning are specified in the Cognito development guide; HTTP integration is implemented; account screens and instructor class creation/listing/detail are implemented. A browser-provided role or user ID is not sufficient authorization for an existing account.

## Proposed institution model

Plan relationships ahead of implementation, but introduce entities and migrations as their workflows enter scope. The following model is provisional; institution management and billing remain outside the current classroom-access branch. Finish invitations and student enrollment first.

| Record or relationship            | Proposed responsibility                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Institution                       | An organization using the platform                                                                                                                                       |
| Institution membership            | Links a user to an institution, with an institutional role and membership status; leaves room for multiple affiliations rather than a single institution ID on each user |
| Classroom institution association | Optionally associates a classroom with an institution while retaining instructor ownership and supporting independently run classes                                      |
| Enrollment                        | Links a student to a classroom; classroom enrollment does not automatically imply institution membership                                                                 |
| Funding / entitlement             | Records who funds access and what is covered, separately from institution affiliation and classroom ownership                                                            |

An instructor could own both an institution-associated class and a personally funded class through the same account. Institutional administrator permissions would be distinct from the existing student/instructor account role. Institution affiliation alone should not grant funding coverage or access to classroom/student records; define explicit authorization and entitlement rules when these workflows are implemented.

Open questions before implementation:

- Can users belong to multiple institutions?
- Who can create an institution, approve membership, and manage institutional administrator permissions?
- Does an institution control associated classrooms, including transferring instructor ownership when an instructor leaves?
- Is classroom enrollment sufficient for students, or must they also become institution members?
- Can a classroom change institutions or funding sources, and how should its ownership, access, and history be preserved?

## Proposed records

Names and fields below are provisional; introduce them as persistence is needed rather than creating every table upfront.

| Record           | Responsibility                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Problem          | Stable identity, creator/owner, title, exercise type, and current version reference                                                |
| Problem version  | Immutable exercise definition and its definition-format version                                                                    |
| Problem set      | Instructor-owned collection of problems                                                                                            |
| Problem-set item | Reference to a specific problem version, with its position in the set                                                              |
| Assignment       | Problem set, recipients, dates, and practice/graded, feedback, and solution-access policy                                          |
| Attempt          | Student work against a particular problem version, with assignment context when applicable, status, timestamps, and grading result |

A problem has multiple versions. Multiple set items can reference the same version, enabling reuse. Attempts must retain enough context to identify the assigned item when a problem appears more than once or is reused across assignments; a problem ID alone is insufficient.

## Truth-table definitions and answers

Store the authored formula, variable order, and which expression columns students must complete. Generate variable combinations and expected answers with the logic engine.

Illustrative definition, not the final API/storage contract:

```json
{
  "type": "truth_table",
  "definitionVersion": 1,
  "formula": "(P ∧ Q) → R",
  "variableOrder": ["P", "Q", "R"],
  "answerColumns": ["P ∧ Q", "(P ∧ Q) → R"]
}
```

`definitionVersion` identifies the data format; it is distinct from a problem's content revision. The final representation needs stable column identifiers rather than display text. Specify a deterministic row order and stable cell addressing so saved answers continue to map to the same cells.

An attempt stores the student's T/F entries, preserving blanks distinctly from false. Given variable values and correct answers are derived, not student-authored data. Checking and grading occur on the backend for assigned work. Student-facing responses expose solutions and feedback only when the assignment policy permits them; a shared schema does not mean every stored field is sent to the browser.

## Versioning and publication

When an instructor edits a problem, existing assignments and attempts continue to reference their original version. New work can select the new version. Updating a library problem must not silently update every set that reuses it.

Published set membership, ordering, and assignment settings also need change rules so student work remains interpretable. For the initial assignment workflow, use assignment-owned ordered items referencing immutable problem versions. Lock assignment content, ordering, and policy on publication; reusable problem sets and set versioning are deferred.

Engine/parser changes can also affect historical interpretation. Decide how to preserve reproducibility, such as retaining an engine/grammar version, before relying on saved definitions for graded work.

## Storage direction

Use MikroORM with its PostgreSQL driver and committed TypeScript migrations containing explicit SQL. This replaces the starter plan’s Drizzle suggestion to match the maintainer’s familiarity. Entity definitions and migrations remain reviewable. See [Local Database](../development/local-database.md) for setup and integration-test commands.

Use PostgreSQL relational columns, foreign keys, and constraints for identity, ownership, relationships, status, and timestamps. Use validated `JSONB` for exercise-specific definitions and potentially answer payloads. Validate the payload shape by exercise type and format version; JSONB is not a substitute for validation or authorization.

Derivations will eventually need premises, a conclusion, and a proof-system identifier in their definitions, with proof lines in student answers. Their exact representation depends on the chosen axioms/rules and is deferred.

Local PostgreSQL will run in Docker, with documented DBeaver connection settings. The completed truth-table slice required no persistence; the classroom-access branch introduces the initial database setup and migrations.

## Remaining decisions

- Enrollment removal/withdrawal and its effects on retained student work. Initial assignment targeting is class-wide; individual targeting is deferred.
- Library organization, search, sharing, copying, and archive/deletion behavior.
- Reusable problem-set snapshots or versions. Initial assignment content, order, and policies are locked on publication.
- Stable expression/row/cell identifiers, grammar versions, and complexity limits.
- Attempt counts, autosave, submission finality, retries, grading, and retained grading evidence.
- Whether independent practice is persisted, and whether anonymous practice exists.
- Data retention and how archived problems remain available to historical submissions.

Resolve these when their workflows enter scope. Keep this document current as decisions become concrete; use separate architecture decision records only when a consequential choice needs its alternatives and rationale preserved.

## Entity definitions and API contracts

Database entities in `tools/db/src/entities` are TypeScript classes using MikroORM standard ES decorators from `@mikro-orm/decorators/es`. Properties carry their mapping through `@PrimaryKey`, `@Property`, `@Enum`, and `@ManyToOne`; class decorators name tables, indexes, and unique constraints. Classes supply both runtime entities and TypeScript types, without separate EntitySchema property maps or inferred-type exports. Scalar types and relationship targets are explicit, so discovery needs neither reflection metadata nor legacy TypeScript decorator flags. Generated UUID/timestamp properties are optional during ORM creation via `OptionalProps`; instance initializers, `onCreate` generators, and database defaults preserve creation behavior. Existing column names, constraints, indexes, and deletion rules are preserved.

`tools/contracts` separately defines Zod API request/response contracts. Those public shapes can omit persisted fields or serialize values differently (for example, dates become ISO strings). Changing entity definition style does not itself require a migration; MikroORM's schema check confirmed this conversion matches the existing database.

## Problem-library decisions (005)

`Problem` belongs to an instructor user and stores mutable draft title, optional instructions, and an exercise definition. `ProblemVersion` belongs to the stable problem and snapshots those content fields at publication with a per-problem version number and publication timestamp. Publishing creates a new record; edits never rewrite published content. There is no current-version foreign key in the initial foundation; version ordering identifies publication history.

Use format-versioned JSONB for the exercise definition, initially `{ type: 'truth_table', definitionVersion: 1, formula: string }`. Given values and correct answers remain derived by the logic engine. API validation will enforce syntax and complexity limits; entity typing alone does not validate JSON received from clients.

Archive is a reversible timestamp on the problem, rather than deletion or a published-content status. Preserve immutable versions and future assignment references. The library is initially private to its owner. Later classroom sharing/assignments reference a selected published version; publishing alone does not expose it to students. Problems do not contain a classroom ID, enabling reuse across classes. Student practice remains unsaved.

The persistence foundation protects published rows against updates and deletion in PostgreSQL, preserves the parent through restrictive foreign keys, and enforces unique positive version numbers per problem. Creating versions atomically and enforcing instructor-only library access belong to the following API slices.

Register publication immutability with MikroORM's `@Trigger` as well as migration SQL. A schema-drift integration test protects this metadata: future schema generation must not propose dropping the trigger.

### Multiple exercise types

Keep one `Problem` entity and one `ProblemVersion` entity across truth tables and future derivation exercises. Ownership, draft editing, publication history, and archiving are shared responsibilities. Exercise-specific authored content belongs in the JSONB `definition`, not in truth-table-specific columns on the parent entities.

`ProblemDefinition` currently permits only truth tables because those are the implemented exercise type. When derivations enter scope, extend it into a union discriminated by `type`, with a corresponding runtime validator for each variant and supported definition-format version. Derivations will likely need premises, a conclusion, and a proof-system identifier; exact fields and rules remain deferred. Do not add placeholder entities or accept unsupported definition types in advance.

Student proof lines, truth-table entries, and grading results belong to future attempts/submissions, not authored definitions. Published snapshots retain their original type, format version, and content even as support for additional exercise types is introduced.

## Assignment foundation (`006`)

Use `Assignment` for a title, optional instructions, one classroom reference, independent assessment/feedback/solution settings, publication/archive timestamps, and creation/update timestamps. Ownership comes through the classroom instructor rather than a second independently mutable owner ID. Lifecycle derives from timestamps: unpublished is draft, published is content-locked, and archived is retained/hidden. No duplicate status field is necessary.

`AssignmentItem` identifies one ordered occurrence of a published `ProblemVersion` within an assignment. Positions are positive and unique per assignment; repeated versions are permitted at different positions. Future attempts reference the item ID so repeated problems do not collide. Restrict deletion of referenced classrooms, assignments, and problem versions. Publishing must verify that the instructor owns the classroom and selected library problems, and that at least one item exists. These cross-record authorization/publication rules are enforced by the transactional assignment store; foreign keys alone do not establish ownership or freeze published content.

The first slice introduced these records and migrations. The second slice adds instructor authoring, publication, and archive/restore API operations. It stores separate `assessmentMode` (`graded` initially), `feedbackTiming` (`on_submission` initially), and `allowSolutions` (false by default). Unsupported assessment/feedback modes are rejected in PostgreSQL; future modes are not implemented merely by loosening a TypeScript type. Draft item lists can repeat versions and may contain up to 50 items; publication requires a nonempty list. Publishing and archive/restore are idempotent. Archived drafts are read-only until restored; restored publications remain content/policy-locked. Grading results, completion state, saved answers, and final submission lifecycle remain subsequent slices. Do not store generated expected answers in assignment records or expose library-only solution routes as assignment authorization.

## Saved attempts and final submissions (`006`)

`AssignmentAttempt` is unique per assignment/student. It stores revisioned JSON answers keyed by assignment-item UUID, preserving false versus blank null, plus a nullable final submission timestamp and frozen evaluation result. Saving replaces one item's entries and preserves other occurrences. There is no separate draft/submitted status column: the timestamp marks the lifecycle transition. Attempt fields/types live under `types/assignment-attempt/` and use the same exact-shape checks as other entities.

Final submission stores version-tagged cell feedback and counts rather than recomputing official results on reads. A timestamp/result consistency constraint and immutable-submission trigger protect the retained record; assignment/student references restrict deletion. Revoking enrollment does not delete saved work. Revision checks reject stale writes, and shared assignment/enrollment locks plus per-student attempt locks serialize lifecycle changes without serializing all students' saves. Solutions are separately gated by assignment policy and final submission. Student completion UI is now available. Instructor review reads only final submissions scoped through assignment/classroom ownership, retains access after archiving/withdrawal, and never exposes unsubmitted attempt answers.

## Billing persistence foundation

Branch `007-feat-simulated-billing-and-entitlements` now separates catalog terms from transactions and access:

- **BillingPlan:** named catalog terms, one-time/recurring billing model, amount in minor units, currency, capability, active flag, and either positive coverage days (one-time) or a month/year billing interval (recurring). Database checks require the appropriate terms for each model. Retire plans rather than deleting referenced history. Recurring catalog records do not implement subscriptions.
- **ClassPurchase:** required plan reference, capability snapshot, class, paying user, provider/checkout reference, pending/paid/failed/refunded status, immutable checkout terms (amount in minor units, currency, coverage days), and last applied source-event sequence. Provider plus checkout reference is unique. Payer identity is separate from class ownership; the purchase API must authorize the current owner.
- **ClassEntitlement:** class, capability, provider, source kind/reference, start/end instants, and optional revocation instant. The initial source kind is `class_purchase`; the initial capability is `publish_assignments`. Multiple grants may coexist. One source can issue one grant per class/capability. Publication depends on valid coverage, without depending on purchase status or funding type.
- **PaymentEvent:** provider-scoped unique event ID, source reference, positive sequence, SHA-256 payload hash, and processed timestamp. This is a committed processing receipt, inserted in the same transaction as effects (including accepted stale-event no-ops). A rolled-back operation must not leave a successful receipt. Raw payment payloads and payment credentials are not stored.

All three billing records use the shared `BillingProvider` enum in `tools/db/src/types/billing/enums.ts`, currently supporting only `simulator`, with matching database check constraints. Future providers require an explicit enum/constraint migration.

Source references are provider identifiers, not foreign keys to one particular funding entity. The initial processor must resolve and validate the matching purchase/class before issuing a grant. A future subscription processor can resolve a subscription source without changing publication's grant check. New source enum values and database check constraints will be added with that workflow, rather than treating speculative subscription coverage as supported now.

A valid grant covers `startsAt <= now < endsAt` and is not revoked. Class access is the union of valid grants for the required capability. Refund revokes its source's grant only. Expiration needs no destructive cleanup. Financial records and grants restrict parent deletion; archived classes and student work are retained. New publication now requires valid coverage; student-work permissions and existing publications remain unchanged.

Unique constraints support event deduplication and grant idempotency. They do not implement signature validation, event ordering, ownership, or atomic effects by themselves; those are implemented application responsibilities. Pending purchases do not automatically create grants. Existing classes receive no silent backfill grant; their existing published work remains available and new publication requires coverage.

### Planned institution subscription entities (not implemented)

Introduce these entities together in a future institution/subscription branch:

- **Institution:** a university or other organization that sponsors access.
- **InstitutionMembership:** links instructor users to an institution, with membership status and an institutional role. One institution can have many instructors; the model should allow multiple affiliations per instructor.
- **Subscription:** belongs to an institution and references a shared `BillingPlan`; records the provider subscription identity, renewal periods, and cancellation/payment lifecycle. Its coverage is allocated to classes through `ClassEntitlement` grants.

The intended relationships are `Institution -> Subscription -> BillingPlan`, `Institution -> InstitutionMembership -> User`, and `Subscription -> ClassEntitlement -> Classroom`. An instructor still owns the classroom. Membership, classroom ownership, and funded coverage are independent: membership alone neither funds a class nor permits access to another instructor's class or student records. Allocation limits and institutional administrator permissions remain open design decisions.

The shared **BillingPlan** is implemented in the current individual-payment branch. `ClassPurchase` references its plan and preserves amount, currency, coverage days, and capability as purchased terms; changing or retiring a plan does not change those snapshots. Checkout must select an active one-time plan and copy its terms on the server. A later institution-owned `Subscription` will also reference a plan. Supporting a plan's recurring billing model does not implement subscription checkout, renewals, or institutional access in this branch.

The BillingPlan migration links any preexisting purchases to retired historical plans using their saved terms, without changing purchased amounts or periods. Fresh installations create no catalog plans automatically; simulator checkout configuration/seeding follows in the provider slice.

Checkout processing now persists a payer-scoped unique request ID for idempotent retries. Purchase locks serialize verified events, and receipts and coverage effects share a transaction. Refund is terminal regardless of delivery order; the sequence high-water mark never decreases. Failed purchases require a new checkout. New publication now enforces active grants, with a shared class-row lock held until commit; billing effects take the same lock exclusively. Future subscription grant writers must use that protocol too. Billing-route configuration cannot bypass this check; see the [billing API](../api/billing-api.md).

## Durable job persistence

The operator-only reconciliation branch introduces:

- **JobSchedule:** named job type, disabled-by-default flag, interval, next scheduled time, and default attempt limit. This describes recurring automation, not a retry. No definitions are automatically seeded or enabled.
- **DurableJob:** a manual request or one scheduled occurrence, job type/deduplication key, optional paired schedule/occurrence time, queued/running/succeeded/failed status, available time, attempt count/budget, current lease token/expiry, and terminal completion time. Scheduled occurrences are unique per schedule/time; manual requests have no schedule. Type/key uniqueness supports idempotent enqueueing.
- **JobRun:** per-claim attempt history, unique job/attempt and lease token, start/finish, running/succeeded/failed/lease-expired status, sanitized error code, records checked, and finding count. Attempts remain inspectable after retry or crash recovery.
- **ReconciliationFinding:** job, discrepancy kind, class/purchase IDs, optional grant ID, and detection time. Identifiers are audit snapshots rather than cascading financial-record relationships. Unique job/kind/purchase prevents duplicate findings when retrying the same job; a separate recurring job may report a still-present discrepancy again.

Database checks bound attempts (default three, maximum ten), require positive schedule intervals, pair scheduled occurrence fields, prevent leases on queued/completed jobs, require leases on running jobs, require terminal completion times, and validate run states/counters. Parent deletion is restricted where job history depends on schedules/jobs. These constraints do not implement claims, fencing, retry transitions, or cross-row status consistency by themselves; the scheduler/worker application transactions now enforce claim, recovery, finalization, and result ownership.

Use database time in scheduler/claim/finalization operations. Claiming should atomically increment attempts and create a fresh run/lease. Execute outside the claiming transaction. Finalization and findings must be guarded by the current unexpired lease token so a stale worker cannot overwrite a replacement worker. Retry/lease recovery retains prior attempts; the same job owns deduplicated findings. A final exhausted lease must become failed rather than returning to an unclaimable queue. Scheduler advancement and job insertion must commit together.

Reports are platform-wide operational data, not instructor-owned records. Access initially comes only through operator commands; no public HTTP surface is introduced. No automatic repairs, billing changes, or notification delivery occur in the persistence slice. See [background jobs](background-jobs.md).

Schedule interval defaults will come from a per-job registry at setup; saved schedule values remain authoritative and repeated setup preserves operator edits. Scheduler invocation frequency is a separate deployment setting. Future admin schedule edits require explicit backend permissions, per-type interval bounds, audit history, and row locking against scheduler advancement. The `nextRunAt` recalculation policy remains open; edits must leave already queued/running jobs and their snapshotted attempt budgets unchanged. Admin endpoints, permission/audit persistence, and UI are deferred.

Scheduler/worker cycles now use short `SKIP LOCKED` claim transactions and database time; handler execution is outside those transactions. Finalization checks status, attempt, lease token, and expiration under a job-row lock before committing results/findings. Expired attempts retain `lease_expired` history and requeue with delay or fail at the snapshotted attempt limit. A late worker cannot record results after replacement. Findings and completion roll back together on failure. The default registry contains metadata only until the reconciliation handler is implemented; no automatic schedules or API job routes are enabled.

The billing reconciliation handler now reads one bounded, read-only repeatable-read financial snapshot. It compares provider/source references and purchased terms, without reading current catalog terms or filtering by instructor. It reports paid purchases lacking retained grants, refunded purchases with currently active unrevoked grants, and mismatched grant class/capability/duration/earliest start. Matching expired or intentionally revoked grants are not missing coverage. Exact payment occurrence time is not separately retained, so exact activation-start verification is outside this report. Scans fail explicitly beyond supported purchase/grant/finding/time limits and return no successful partial report. The handler writes nothing; the existing fenced finalizer owns atomic findings/history writes. See [report semantics and limits](background-jobs.md#implemented-report-semantics-and-limits).

## Isolated demo workspace foundation

`DemoWorkspace` is a disposable sandbox root with lifecycle status, seed template version, reset generation, creation/last activity, idle expiration, and absolute expiration. Positive versions and ordered timestamps are enforced in PostgreSQL; expiry indexes support bounded cleanup scans. It starts in `provisioning`, not `active`. Timestamps are explicit inputs so provisioning can use one database-time sample. No users or sessions are linked by this first migration.

Subsequent slices must explicitly bind local synthetic users and hashed demo sessions to the workspace and generation, preserving normal Cognito identity constraints. Owned data is isolated through those users and their resource relationships. Workspace IDs do not authorize requests. Status transitions, idle extension, generation checks, and deletion safety require application transactions and tests; field checks alone do not implement them. See [Public Demo Direction](public-demo.md) for reset, financial retention, cleanup, and implementation sequence.

### Demo identity and session foundation

`User.identityProvider` is `cognito` by default (including existing rows) or `demo`. Cognito users still require pool/subject and cannot reference a demo workspace. Demo users require a workspace and must have no Cognito IDs or email. The existing pool identity/email uniqueness is preserved; workspace/role uniqueness permits one synthetic instructor and student each. `UserFields` reflects the nullable identifiers; normal auth explicitly narrows to a Cognito identity before returning a subject.

`DemoSession` stores only a domain-separated credential hash, workspace, generation, selected role, and creation time. It resolves the selected user through workspace/role membership, never a caller-supplied user ID. Its FK cascades on workspace deletion, while user ownership restricts premature workspace deletion. Session issue/resolve/rotation lock the workspace, sample database time after acquiring the lock, and check active state, generation, and both expiration deadlines. Rotation re-reads the credential after locking to reject concurrent reuse. Expiration and state checks are application responsibilities, not claims made by session field constraints. See [session integration boundaries](public-demo.md#session-foundation-boundaries).

### Demo reset and immutable retention

Seed/reset now commit the complete synthetic data graph and generation/session changes atomically under the workspace lock. Shared billing plans are seeded with conflict-ignore semantics and never overwritten. Checkout, verified simulator events, coverage grants, and assignment publication join the same transaction. Reset deletes only explicitly traced demo records; unexpected cross-workspace enrollment/work/content/funding references fail closed. Reconciliation findings remain historical ID snapshots and are not deleted with the synthetic purchases.

A new migration narrows the immutable-version/submitted-attempt guards with a delete-only demo exception while the owning workspace is resetting or expired. The guards lock that workspace and submitted-attempt deletion requires both identities in the same workspace. All immutable updates remain forbidden; normal identities receive no deletion exception. Other FK/financial retention rules are unchanged. Reset preserves the original absolute expiration, increments generation, replaces users/content, and rotates the selected role's credential. No public reset route or automatic cleanup is enabled. See [seed/reset details](public-demo.md#seed-and-reset-implementation).

## Assignment learning-mode extension

### Independent grade release and answer reveal (`015`, persistence slice)

Assignments now have `gradeReleaseTiming` (`on_submission` or `instructor_release`) plus separate `gradesReleasedAt` / `gradesReleasedBy` and `answersRevealedAt` / `answersRevealedBy` fields. Actor relations restrict user deletion while referenced. Each release requires both its timestamp and actor, a published assignment, and its corresponding instructor-controlled policy. Grade release is restricted to graded work; completion-only confirms completion immediately and only exposes answer-reveal controls. Non-graded rows retain an inert `on_submission` grade-timing default.

The database additionally permits `solutionAccess: instructor_release` for graded/completion-only assignments, and submission-time completion alongside existing completion checking policies. The additive migration preserves existing policies, result snapshots and visibility; no historic result or release timestamp is fabricated. Rollback refuses new policies or retained release history rather than silently dropping their meaning. The schema snapshot changes only the assignment table.

Slice 3 enables these policies in API authoring and independent release actions, with student result withholding and separate answer gating. Browser controls follow in the UI slice. See [release plan and compatibility](instructor-results-release.md).

Before the release extension, learning modes introduced assessmentMode (graded/completion_only/ungraded_practice), feedbackTiming (on_submission/on_check, later immediate) and solutionAccess (never/after_submission/anytime). Database checks enforce valid feedback pairs and prohibit submission-dependent solutions for practice. The former allowSolutions column was backfilled and removed; historical descriptions above refer to the initial assignment foundation.

Final attempt JSON supports retained truth_table_v1 correctness snapshots and score-free completion_v1 cell counts. Practice has no final result and its saved answers stay outside instructor review. Existing immutability and demo-only retention exceptions continue to apply. See [learning modes](assignment-learning-modes.md) for current behavior and rollback constraints.

## Conceptual question foundation (`017`)

Staged contracts define version-1 true/false and single-correct multiple-choice JSON definitions, with stable UUID option identities and optional instructor explanations. They fit the existing draft/version JSONB representation. Keys and explanations are excluded from ordinary student content; explanations follow authorized answer reveal only. The persistence definition union now includes these variants in slice 2, with unchanged JSONB columns and no schema migration. Private instructor library contracts now accept the conceptual union. Assignment creation and attempt contracts remain guarded pending coordinated evaluation/result formats and redaction. Formula-only workflows reject staged definitions explicitly; no stored data is rewritten. See [conceptual definitions and compatibility](conceptual-questions.md).

### Staged conceptual response/result formats (`017`, evaluation slice)

`AssignmentResponses` preserves each legacy truth-table array and adds tagged true/false or selected-option responses by assignment-item UUID. `mixed_v1` stores typed per-item correctness feedback and aggregate response-unit counts. `mixed_completion_v1` stores only completed/total response-unit counts, without scores, correctness or explanations. Existing truth-table-only finalizations retain `truth_table_v1` / `completion_v1`; no stored snapshots are rewritten. These new format types and pure evaluators are staged independently; the active attempt entity/API unions remain legacy-only until the workflow slice adds compatible save/read/release handling. No database migration or data write occurs in this slice.
