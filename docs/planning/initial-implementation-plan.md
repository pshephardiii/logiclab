# LogicLab — Initial Implementation Plan

Status: active plan; truth-table milestone implemented · October 12, 2026

Product decisions: see [Product Direction](product-direction.md) for the agreed account roles, instructor preview, assigned-work privacy, truth-table interaction, exercise order, and future problem-set settings. Those decisions supersede any corresponding open questions below.

Data direction: see [Data Design](data-design.md) for the reusable problem library, separate definitions and attempts, immutable problem versions, and proposed persistence model.

Setup update: the initial scaffold uses npm workspaces with `apps/web` (React/TypeScript + Vite), `services/api` (Node.js/TypeScript + Fastify, tested with Jest), and `tools/contracts` (shared Zod contracts). Both applications will eventually deploy to AWS; the cheapest viable topology remains to be evaluated. These confirmed setup choices supersede the pnpm/Turborepo and directory suggestions below. See the root README for current commands and structure.

Source: `LogicLab_Get_Started_Plan.docx`, version 0.1. This plan translates the starter document into reviewable implementation branches. Its recommendations are planning inputs, not settled requirements or authorization to publish, provision services, or implement every feature. The repository now contains the scaffold and truth-table vertical slice; later milestones remain planned.

## Purpose and intended experience

Build a public, portfolio-quality formal-logic learning project that potential employers can understand, run, and evaluate. The product should demonstrate both thoughtful interaction design and reliable full-stack engineering: scoped permissions, deterministic grading, transactional state changes, verified payment events, and durable scheduled work.

The proposed first complete journey is: an instructor creates a class and publishes truth-table exercises; a student joins and submits answers; the instructor reviews progress; simulated checkout changes class entitlements through a verified event; scheduled reminders appear in an observable outbox.

Deliver a polished truth-table vertical slice before expanding into the complete journey. Proof checking, adaptive learning, real payments, a course catalog, separate admin applications, and microservices remain later possibilities.

## Beginning steps

1. Confirm the initial audience, learning objective, and smallest truth-table exercise experience. Sketch the student exercise screen and instructor assignment flow before building them.
2. Choose a project license and public repository identity. Initialize Git locally, then prepare a concise README explaining the problem, proposed scope, and local setup. Creating the public remote is a separate publication step.
3. Record initial architectural decisions: a modular monolith, a pure TypeScript logic engine, and simulated payments. Authentication now uses Cognito email/password with confirmation and recovery; AWS application hosting remains unresolved.
4. Bootstrap the workspace, frontend, API, shared configuration, contracts, and logic-engine package. Add a local Postgres service and a documented development command.
5. Deliver a small browser-to-API truth-table flow with meaningful engine tests. Use it to validate notation, input behavior, feedback, and visual design.
6. Add classroom workflows and persistence incrementally. Introduce migrations when the first persisted domain model is defined; avoid creating every suggested table upfront.
7. Keep setup instructions, screenshots, decision records, and evidence of important tests current as branches land.

Local database direction: run PostgreSQL in Docker Compose and expose a local connection for DBeaver. Document the host, port, database, development credentials, and volume/reset commands when persistence is introduced. The first truth-table slice can run without a database; retain database setup as foundation work before classroom persistence.

## Proposed architecture

Use npm workspaces; React, Vite, and TypeScript for the web app; Fastify for the API; Jest for engine/backend tests; and Zod for boundary validation. PostgreSQL in Docker with DBeaver access is planned; MikroORM/PostgreSQL is selected for persistence; Cognito integration details remain future decisions.

```text
apps/web                 Student and instructor interface
services/api             Modular REST API
services/worker          Job execution entry point, introduced when needed
tools/logic-engine    Pure parser, evaluator, and truth-table generator
tools/contracts             Request/response schemas and shared types
packages/db              Schema, migrations, and seed data
tsconfig.base.json       Current shared TypeScript configuration
packages/payments        Provider boundary and simulator, introduced with billing
infra                    Local services and deployment configuration
docs                     Plan, architecture decisions, and portfolio evidence
```

Keep identity, classes, memberships, exercises, submissions, billing, event ingestion, and notifications as explicit API modules. Start with one API deployment and one database. Durable jobs may initially run through an API command or protected trigger; a separate always-on worker is not required for the first demo.

## Preliminary branch plans

Branch names follow [the numbered naming convention](../conventions/branch-naming-conventions.md). Branch `002-feat-truth-table-practice` is implemented; other entries describe proposed work. The bootstrap is intended for the initial `main` commit; its proposed `001` branch can be used for remaining foundation work. Merge each into `main` after its acceptance checks pass. Create dependent branches from the updated `main`; split a branch further if it becomes difficult to review. Each branch should include its relevant documentation and tests.

### 1. `001-chore-project-foundation` — A reproducible starting point

Depends on: initial repository and license decisions.

- Establish workspace tooling, web/API shells, shared configuration, and package boundaries.
- Add `/health`, local Postgres configuration, `.env.example`, and CI for linting, type checking, tests, and builds.
- Write the README and initial architecture decisions. Keep secrets and private data out of tracked files.

Done when: a fresh checkout can follow documented setup commands, render the web shell, reach API health, and pass CI. Empty packages need no placeholder tests.

Open product/design questions:

- Who is the first learner: an introductory college student, a self-directed learner, or another audience?
- Which employer audience should the presentation emphasize: frontend, backend, or full-stack roles?
- What visual tone, naming, and accessibility baseline should guide the interface?
- Which license and contribution expectations fit a public portfolio project?

### 2. `002-feat-truth-table-practice` — The first usable vertical slice

Depends on: foundation.

Implemented as the first feature branch after the scaffold. Begin with one formula, a documented grammar, and a deterministic truth table; then connect the engine to the API and browser. No accounts or database are required for this slice.

- Define a small grammar for negation, conjunction, disjunction, and implication, with explicit precedence and associativity.
- Implement parsing, evaluation, and truth-table generation in the pure engine package.
- Connect an API endpoint to an interactive practice screen with clear syntax errors and answer feedback.
- Test parser/evaluator edge cases, malformed inputs, and known truth tables; cap formula size to bound work.

Done when: a visitor can enter or select a formula, complete a truth-table exercise, and receive deterministic feedback through the real API. The UI handles loading, empty, invalid, and error states and works with keyboard input.

Implementation outcome: parser, evaluator, deterministic tables, independent-practice API, feature-based browser components, Check answers, and Show/Hide solution. See [verification and walkthrough](../verification/truth-table-verification.md) for evidence and remaining limitations.

Resolved defaults: given variable columns; all distinct compound subexpressions as answer columns; symbols plus `! & | ->`; checking on request; solutions alongside entries; four variables, 256 characters, and 32 recursive nesting levels. Practice is currently anonymous and not persisted. Future assignment defaults, saved practice, and authentication remain in [Product Direction](product-direction.md).

### 3. `003-feat-classroom-access` — Users, classes, and scoped permissions

Auth foundation slice: development CloudFormation template, Cognito adapter, role-preserving signup provisioning/cleanup, encrypted persistent sessions, and cookie/origin helpers. Auth HTTP routes now include strict validation, origin checks, cookies, rate limiting, and confirmation/recovery operations. Account screens now support signup, confirmation/resend, login, recovery/reset, logout, and session restoration. The developer provisioned Cognito and verified core live flows; resend and token refresh remain to verify. Instructor class creation/listing/detail and its frontend screen are implemented with scoped access checks. Invitation generation and student redemption/enrollment are implemented, with scoped reads and duplicate/race handling. See [instructor classes](../api/classroom-api.md). See [Cognito development guide](../development/cognito-development.md).

First slice: Docker PostgreSQL configuration, the `tools/db` MikroORM workspace, initial users migration, DBeaver instructions, and CI database tests. Docker is configured locally; the migration and three database integration checks passed against a fresh disposable PostgreSQL database.

Depends on: truth-table practice.

- Integrate Cognito email/password signup, email confirmation/resend, login, logout, sessions, and password recovery/reset. Avoid account-enumeration responses.
- Add instructor class creation, invitation codes, student enrollment, and role-specific navigation.
- Add Docker PostgreSQL, DBeaver connection documentation, initial migrations, and synthetic application users linked to development Cognito identities. Enforce permissions on the server for each resource.
- Test unauthorized access, cross-class access, and cross-organization isolation if organizations are introduced here.

Done when: an instructor can create a class, a student can join, and requests cannot access another instructor's resources or instructor-only actions. Demo accounts can reproduce the flow.

Agreed defaults: anyone can register as an instructor; separate student/instructor roles; one instructor owner per class; invitation-code enrollment; students may join multiple classes across instructors. Institutions, co-instructors, MFA, and SSO are deferred. Include email verification and password recovery now. Use Cognito's default email sender for development/controlled demo and SES before broader public registration.

Open implementation/design questions:

- How will Cognito tokens/session cookies be handled, and how will app users and roles be provisioned consistently?
- Which development user-pool/app-client configuration, region, and environment separation should we use?
- How do invitation codes expire, get replaced, and communicate invalid or expired states?
- How should future class archival and enrollment removal interact with retained work? The class/enrollment schema is implemented with MikroORM/PostgreSQL.
- Which SES identity, delivery setup, and production-access steps are needed before public registration?
- Should employers use isolated seeded accounts, a guest demo session, or self-registration?

### 4. `004-refactor-codebase` — Structure and maintainability

Depends on: the completed classroom-access branch.

- Review feature boundaries, shared frontend state, route composition, and backend route/handler/service/store responsibilities.
- Reduce duplication in API clients, request handling, role guards, and class-list state where a common abstraction is justified.
- Make naming and file organization consistent; preserve the API contracts, database mappings, user workflows, and permission boundaries.
- Improve regression coverage where needed to prove behavior remains unchanged. Keep migration generation unchanged unless a concrete defect requires repair.

Done when: the agreed restructuring is reviewable and existing behavior passes verification. Add no new product features or intended behavior changes. Decide the precise refactor slices after reviewing this branch; assignments remain subsequent work.

### 5. `005-feat-problem-library` — Reusable instructor-authored problems

Depends on: completed classroom access and codebase refactoring.

Build a private instructor-owned truth-table library. Problems are independent of classrooms: later sharing/assignment records connect specific published versions to classes. Publishing does not grant student access. Classroom practice sharing, assignments, grading, derivations, and student-saved personal problems are deferred.

Commit-sized slices:

1. **Persistence foundation (implemented):** mutable `Problem` drafts, immutable `ProblemVersion` snapshots, ownership, archive timestamps, migrations, and database behavior tests.
2. **Private library API (implemented):** shared contracts, owner-scoped create/list/detail/update operations, formula validation using the existing engine, and authorization tests.
3. **Publishing and archiving (implemented):** atomic version numbering/snapshot creation, published-version reads, archive/restore operations, and concurrency/history tests. Archived drafts cannot be edited/published until restored; archived records remain readable to their owner.
4. **Instructor library pages (implemented):** navigation, create/edit forms, draft and version views, preview using existing truth-table components, archive/restore controls, and regression tests.
5. **Verification/documentation (completed locally):** automated checks, PostgreSQL integration tests, a synthetic-session browser workflow, verification evidence, and a local PR draft. See [verification](../verification/problem-library-verification.md).

Agreed content: title, optional instructions, truth-table formula, and instructor owner. Drafts remain mutable after publishing; each publication creates a new immutable content snapshot. Archive hides the problem from the active library without deleting its versions or future classroom references. No classroom ID belongs directly on a reusable problem.

Publishing uses the recommended default: each explicit publish creates a new version, even for unchanged content. The UI offers preview for both drafts and published versions. Saved definitions use an explicit data-format version; historical engine/grammar compatibility remains a requirement before graded assignments.

Done when: instructors can manage only their own library, publish and retain stable snapshots, preview tables, archive/restore problems, and retain data after reloads. Students receive no new library access in this branch.

### 6. `006-feat-assignments-and-progress` — Assign work and review submissions

Depends on: classroom access and the reusable problem library.

Agreed defaults: one class per assignment; title, optional instructions, and ordered published problem versions; immutable content/policy after publication; reversible archiving; mutable saved student work followed by one final submission; feedback on submission; instructor-controlled solution access off by default. Deadlines and late-work rules are deferred.

Keep assessment, feedback timing, and solution access independent. Future completion-only/ungraded work and immediate wrong-answer feedback are documented directions, not implemented modes. See [Product Direction](product-direction.md) and [Data Design](data-design.md).

Commit-sized slices:

1. **Persistence foundation (implemented):** assignment and ordered-item entities, independent policy defaults, additive migration/snapshot, and database constraint/retention tests. No student work or HTTP endpoints yet.
2. **Instructor assignment API (implemented):** scoped draft authoring, ordered item replacement, transactional publication/archiving, ownership validation, and published-content locks.
3. **Instructor assignment pages (implemented):** class-scoped authoring and publication controls using the library's immutable versions.
4. **Student attempts/submission (implemented):** enrollment-scoped assignment reads, saved incomplete answers, one final submission, server evaluation, and backend feedback/solution policy.
5. **Student/instructor pages (implemented):** completion workflow, persisted state after reload, and assigned submission review.
6. **Final verification/documentation (completed):** authorization/lifecycle/concurrency checks, browser walkthrough, and local PR draft.

Done when: instructors assign pinned content to enrolled students, students save and submit work, instructors review scoped results, and invalid transitions/access are rejected. Student work uses one revisioned attempt per student/assignment, item-keyed answers, a frozen final evaluation, and solution release only after submission when enabled; do not expand into instant feedback or completion-only grading in this branch.

### 7. `007-feat-simulated-billing-and-entitlements` — Reliable event-driven access

Depends on: classroom access and assignments/submissions. Current branch: `007-feat-simulated-billing-and-entitlements`.

Scope: individual instructor **one-time payments per class**, simulated with no real charges. Institution subscriptions remain a future branch. Unlock new assignment publication; keep existing published work and student/instructor access after expiration or refund. Start with a configurable 180-day period from verified payment; pricing is demo configuration, not a commercial decision. See [agreed billing direction](product-direction.md#agreed-individual-class-simulator-scope).

Commit-sized slices:

1. **Persistence foundation (implemented):** shared billing plans, plan-linked class purchases with purchased-term snapshots, capability grants, and provider event receipts; exact field interfaces/enums; additive migration/snapshot and database constraints/retention tests. No checkout, webhook, or publication enforcement yet.
2. **Provider simulator (implemented):** provider boundary, server-selected plan-term snapshots, local checkout sessions, signed success/failure/refund events, strict verification, and clearly labeled no-charge notices. HTTP endpoints, persisted checkout creation, and scenario controls are implemented in slice 3. See [simulator development](../development/simulated-billing.md).
3. **Transactional event processing (implemented):** owned idempotent checkout persistence, signed raw-body webhook and owned simulator controls, atomic receipt/grant writes, duplicate/hash conflict detection, source ordering, terminal refunds, rollback/retry coverage, and opt-in bootstrap. See [billing API](../api/billing-api.md).
4. **Publication entitlement enforcement (implemented):** new publication requires a currently valid class capability grant, independently of funding type and billing-route configuration. Class locks serialize the decision with refunds. Existing publications, student work, review, and archive/restore remain available.
5. **Instructor billing UI (implemented):** instructor-only `/billing`, paginated active plan/history reads, class coverage snapshots, retry-safe checkout intents, explicit success/failure/refund controls, loading/error/reload states, and a repeatable local demo-plan seed. No real charges or institution subscriptions.
6. **Verification/documentation (completed):** lifecycle/concurrency and retained-work checks, Chrome desktop/mobile walkthrough, public [verification evidence](../verification/simulated-billing-verification.md), and ignored local PR draft.

Done when: a verified simulated payment activates class coverage, expiration/refund prevents new publication while retaining existing work, and duplicate/out-of-order delivery cannot incorrectly grant or restore access. Browser success cannot authorize access. A future subscription can issue/renew grants without rewriting assignment authorization.

`BillingPlan` is implemented and referenced by individual `ClassPurchase` records with purchased-term snapshots. It supports one-time or recurring catalog terms; checkout will only allow active one-time plans in this branch. A later institution/subscription branch will add `Institution`, `InstitutionMembership`, and institution-owned `Subscription` records referencing the same plans and supplying class entitlements. Membership is separate from instructor class ownership and funding coverage. Recurring payment processing and institution management remain outside branch 007.

Open later product questions: real pricing, commercial duration/refund rules, repeat-course handling, and institution subscription allocation/membership/renewal. These do not authorize implementing real charges or institution management in this branch.

### 8. `008-feat-durable-jobs-and-history` — Observable background work

Depends on: simulated billing and its coverage model. No assignment deadline feature is required.

Agreed scope: **operator-only, report-only billing reconciliation**, with durable schedules, jobs, execution attempts, and findings. The job inspects billing across the platform; instructors do not trigger it or see operational findings by default. No public job endpoints, instructor job page, admin account role/UI, repairs, email, notification outbox, or assignment reminders in this branch.

Commit-sized slices:

1. **Persistence foundation (implemented):** disabled-by-default interval schedules, distinct scheduled/manual jobs, lease and retry fields, execution history, structured findings, enum/field interfaces, additive migration/snapshot, and database constraint/retention tests. No scheduling or execution yet.
2. **Scheduler and worker cycles (implemented):** per-job registry defaults (hourly reconciliation initially), idempotent disabled setup preserving operator edits, bounded occurrence enqueueing/catch-up, concurrent `SKIP LOCKED` claims, timed handlers outside claim transactions, bounded retries, expired-lease recovery, and fenced atomic finalization. Reusable cycle functions return counts; CLI entry points follow in slice 4. No always-on process or AWS resource.
3. **Billing reconciliation (implemented):** operator runtime with a real report-only handler, bounded repeatable-read/read-only financial scans, explicit discrepancy predicates and limit errors, fenced atomic findings/results, snapshot concurrency tests, no financial mutations, and deduplicated retry reports.
4. **Operator CLI and automation wiring (implemented):** idempotent setup, enable/pause preserving timing, manual enqueue, bounded scheduler/worker commands, paginated list/findings, consistent attempt inspection, safe JSON/error output and cleanup, explicit exit codes, and compiled entry points for external automation. No automatic trigger is installed. See the [operator CLI](../development/operator-jobs.md).
5. **Verification/documentation (completed):** automated concurrency/recovery/rollback checks, fresh compiled CLI walkthrough, report-only financial-state verification, public [verification evidence](../verification/durable-jobs-verification.md), and ignored local PR draft.

Done when: reconciliation can be manually enqueued or scheduled, executes reliably across retries/restarts, records inspectable database-backed findings, and changes no billing/access state. CLI prints a summary and job/run identifiers; logs are diagnostic rather than the authoritative history. Build automation-ready cycles now, without enabling automatic execution. See [background-job design](background-jobs.md).

Later decisions: production trigger/hosting, longer-term retention, automated repair policy, notifications, and an authorized admin UI for schedule enablement/interval changes. That UI needs backend permissions, per-job interval bounds, audit history, and a defined `nextRunAt` recalculation policy; queued jobs remain unchanged. Institution subscriptions remain separate work.

### 9. `009-chore-public-demo-and-portfolio` — An employer-ready release

Depends on: the complete student/instructor journey and durable jobs. Current branch: `009-chore-public-demo-and-portfolio`.

Agreed direction: per-visitor isolated demo workspaces with synthetic instructor/student identities, same-workspace role switching, resettable assignments, and unpaid/funded simulated billing scenarios. Expiration blocks access independently of scheduled cleanup. No per-visitor Cognito accounts or real charges. The existing portfolio will link to the application; low-cost hosting is still to be selected rather than assuming AWS now.

Follow the commit-sized sequence and isolation/reset design in [Public Demo Direction](public-demo.md). Slice 1 implements only the workspace persistence root, lifecycle fields/checks, expiry indexes, migration/snapshot, and database tests. Slice 2 adds the internal demo identity/session foundation and policy/isolation tests. Slice 3 adds transactional seed/reset, unpaid/funded simulator scenarios, published sample work, narrow demo-only deletion guards, and concurrency/rollback tests. Slice 4 adds opt-in demo lifecycle/resource HTTP access, the demo UI, request-local transaction binding, invitation isolation, cookie/rate policies, and storage capacity enforcement. Slice 5 adds bounded expired-workspace deletion, concurrency/retention tests, and the disabled-by-default demo_cleanup durable job with operator commands and retry/history coverage. The next documentation slice adds a reviewer walkthrough and architecture overview, linked from the README. External trigger installation, final deployment/browser verification, shared production limits, and hosting remain later work.

Done when: a reviewer can run the project locally and explore an isolated hosted instructor/student journey without personal classroom data or payment details. Verify cross-workspace isolation, reset/cleanup behavior, resource limits, the walkthrough, and published links before claiming completion.

Remaining decisions: configurable idle/absolute lifetime defaults and capacity limits; acceptable cold starts; hosting budget/provider/automation trigger; demo history retention and screenshots. Prepare deployment for review before provisioning paid resources or publishing.

## Scope and decision checkpoints

Resolve exercise interaction and notation before branch 2; identity, instructor eligibility, and tenancy before branch 3; grading/retry/deadline semantics before branch 4; billing ownership and entitlement policy before branch 5; and demo isolation plus hosting costs before branch 7. Record settled decisions in short ADRs rather than treating this plan as a permanent specification.

If scope grows, release the polished logic-practice experience first and keep classroom, billing, and jobs as explicit follow-up milestones. Do not claim the full portfolio acceptance criteria until those flows are implemented and verified.

## Portfolio release acceptance

- Documented local startup works from a fresh checkout with migrations, synthetic seeds, and a demo login path.
- The public demo presents a coherent student/instructor journey and clearly identified simulated billing.
- Tests demonstrate resource isolation, deterministic grading, verified and idempotent payment events, refunds, and reconciliation.
- Scheduled work survives retries and restarts and exposes useful execution history.
- The interface has clear feedback, keyboard usability, responsive layouts, and useful loading/error states.
- The repository explains what was built, why key decisions were made, how to verify behavior, and what remains limited.
- Public artifacts contain no secrets, real payment credentials, or real student/customer data.

Implementation dates and hosting commitments remain open. Sequence work by completed, reviewable behavior rather than committing to a calendar before the early product decisions are settled.

## Next branch scope

After finishing `003-feat-classroom-access` (including student invitation redemption/enrollment and final verification), the agreed next branch is `004-refactor-codebase`. Focus solely on structure, consistency, and maintainability, with no new features or intended behavior changes. Include this direction in the classroom-access branch's local PR draft.

### Completed problem-library branch

`004-refactor-codebase` and `005-feat-problem-library` are complete. The first slice adds problem/version entities, additive migrations and a snapshot, publication immutability checks, and persistence tests. Local development/test databases have the migration applied. The second slice adds owner-scoped private-library contracts/API, formula validation, and access/persistence tests. The third slice adds publishing, owner-scoped version history, archive/restore, archive filters, and concurrency checks. The fourth slice adds the instructor library page, saved-draft publication, paginated history, isolated previews, and archive/restore controls. Final local verification is complete and the ignored PR draft is prepared. See [verification evidence](../verification/problem-library-verification.md) for checks and limits. No new student access exists.

### Assignment branch status

Work is now on `006-feat-assignments-and-progress`. The first slice adds assignment/item entities, an additive migration and snapshot, independent policy defaults, and ten new database tests. The test database has the migration applied; existing development checkouts should run `npm run db:migrate`. The second slice adds scoped instructor assignment authoring, pinned ordered occurrences, transactional publication/content locks, archive/restore, and route/PostgreSQL tests. See the [assignment API](../api/assignment-api.md). The third slice adds instructor-only `/assignments` navigation, class selection, ordered published-version selection, draft authoring, publication, archive/restore, pagination/retries, and frontend regression coverage. A local synthetic-session Chrome/PostgreSQL walkthrough passed desktop/mobile workflows. The fourth slice adds enrollment-scoped student reads, revisioned per-item saves, one immutable final submission/result, after-submission feedback and optional solutions, retention, and concurrency tests. See the [student-work API](../api/student-work-api.md). The fifth slice adds `/work` for student completion, explicit per-item saving and final confirmation, read-only result restoration and protected solutions, plus final-only instructor submission review and owner-scoped review endpoints. Automated and synthetic-session Chrome/PostgreSQL checks passed desktop/mobile workflows. Final branch verification/documentation is complete and the ignored local PR draft is prepared. See [verification evidence](../verification/assignments-and-progress-verification.md) for checks and limitations.

### Current durable-jobs branch

`007-feat-simulated-billing-and-entitlements` is complete; see [billing verification](../verification/simulated-billing-verification.md). Work is now on `008-feat-durable-jobs-and-history`, starting with job persistence. Scheduler/worker cycles and policy/setup foundations are implemented; the reconciliation handler and operator runtime are also implemented. Operator CLI commands are implemented; final branch verification and documentation are complete, with the ignored local PR draft prepared. See [verification evidence](../verification/durable-jobs-verification.md). Existing development checkouts should apply the additive migration with `npm run db:migrate`; no schedules or jobs are seeded or started by this slice.

## Current feature: 010-feat-assignment-learning-modes

Implement the agreed [learning-mode plan](assignment-learning-modes.md) in small slices. The first slice supplies standalone target contracts/policy helpers only; existing assignment APIs still accept graded/on_submission with allowSolutions. The second slice expands database assessment/feedback enums and constraints with migration/retention tests; active APIs remain graded-only. The next slice replaces stored solution flags with release policies through a preserving backfill; active APIs still translate the legacy boolean and retain existing solution gates. Full-policy authoring support, student workflows, UI, and an extra demo practice assignment follow. Dedicated demo QA and a code audit remain before deployment; branch numbers will follow this feature.
