# LogicLab — Initial Implementation Plan

Status: proposed · October 12, 2026

Setup update: the initial scaffold uses npm workspaces with `apps/web` (React/TypeScript + Vite), `services/api` (Node.js/TypeScript + Fastify, tested with Jest), and `tools/schema` (shared Zod contracts). Both applications will eventually deploy to AWS; the cheapest viable topology remains to be evaluated. These confirmed setup choices supersede the pnpm/Turborepo and directory suggestions below. See the root README for current commands and structure.

Source: `LogicLab_Get_Started_Plan.docx`, version 0.1. This plan translates the starter document into reviewable implementation branches. Its recommendations are planning inputs, not settled requirements or authorization to publish, provision services, or implement every feature. The workspace currently has no application code or Git repository.

## Purpose and intended experience

Build a public, portfolio-quality formal-logic learning project that potential employers can understand, run, and evaluate. The product should demonstrate both thoughtful interaction design and reliable full-stack engineering: scoped permissions, deterministic grading, transactional state changes, verified payment events, and durable scheduled work.

The proposed first complete journey is: an instructor creates a class and publishes truth-table exercises; a student joins and submits answers; the instructor reviews progress; simulated checkout changes class entitlements through a verified event; scheduled reminders appear in an observable outbox.

Deliver a polished truth-table vertical slice before expanding into the complete journey. Proof checking, adaptive learning, real payments, a course catalog, separate admin applications, and microservices remain later possibilities.

## Beginning steps

1. Confirm the initial audience, learning objective, and smallest truth-table exercise experience. Sketch the student exercise screen and instructor assignment flow before building them.
2. Choose a project license and public repository identity. Initialize Git locally, then prepare a concise README explaining the problem, proposed scope, and local setup. Creating the public remote is a separate publication step.
3. Record initial architectural decisions: a modular monolith, a pure TypeScript logic engine, and simulated payments. Mark the authentication and deployment choices as unresolved.
4. Bootstrap the workspace, frontend, API, shared configuration, contracts, and logic-engine package. Add a local Postgres service and a documented development command.
5. Deliver a small browser-to-API truth-table flow with meaningful engine tests. Use it to validate notation, input behavior, feedback, and visual design.
6. Add classroom workflows and persistence incrementally. Introduce migrations when the first persisted domain model is defined; avoid creating every suggested table upfront.
7. Keep setup instructions, screenshots, decision records, and evidence of important tests current as branches land.

## Proposed architecture

Use pnpm workspaces and Turborepo; React, Vite, and TypeScript for the web app; Fastify for the API; PostgreSQL and Drizzle for persistence; and Zod for boundary validation. These are provisional choices from the starter document. Confirm current maintenance and compatibility when installing dependencies.

```text
apps/web                 Student and instructor interface
services/api                 Modular REST API
services/worker              Job execution entry point, introduced when needed
packages/logic-engine    Pure parser, evaluator, and truth-table generator
packages/contracts       Request/response schemas and shared types
packages/db              Schema, migrations, and seed data
packages/config          Shared tooling configuration
packages/payments        Provider boundary and simulator, introduced with billing
infra                    Local services and deployment configuration
docs                     Plan, architecture decisions, and portfolio evidence
```

Keep identity, classes, memberships, exercises, submissions, billing, event ingestion, and notifications as explicit API modules. Start with one API deployment and one database. Durable jobs may initially run through an API command or protected trigger; a separate always-on worker is not required for the first demo.

## Preliminary branch plans

Branch names follow [the numbered naming convention](branch-naming-conventions.md) and describe proposed units of work, not branches already created. The bootstrap is intended for the initial `main` commit; its proposed `001` branch can be used for remaining foundation work. Merge each into `main` after its acceptance checks pass. Create dependent branches from the updated `main`; split a branch further if it becomes difficult to review. Each branch should include its relevant documentation and tests.

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

- Define a small grammar for negation, conjunction, disjunction, and implication, with explicit precedence and associativity.
- Implement parsing, evaluation, and truth-table generation in the pure engine package.
- Connect an API endpoint to an interactive practice screen with clear syntax errors and answer feedback.
- Test parser/evaluator edge cases, malformed inputs, and known truth tables; cap formula size to bound work.

Done when: a visitor can enter or select a formula, complete a truth-table exercise, and receive deterministic feedback through the real API. The UI handles loading, empty, invalid, and error states and works with keyboard input.

Open product/design questions:

- Should learners fill every cell, only the final column, or selected intermediate expressions?
- Which text aliases should be accepted alongside logical symbols, and how will users enter symbols?
- Should feedback appear per cell, on submission, or after a limited number of attempts?
- Should anonymous practice be available, and how much progress should it retain?
- What formula complexity and variable count are appropriate for the first lesson?

### 3. `003-feat-classroom-access` — Users, classes, and scoped permissions

Depends on: truth-table practice.

- Select a maintained authentication approach and implement signup, login, logout, and sessions.
- Add instructor class creation, invitation codes, student enrollment, and role-specific navigation.
- Introduce the necessary migrations and synthetic seed accounts. Enforce permissions on the server for each resource.
- Test unauthorized access, cross-class access, and cross-organization isolation if organizations are introduced here.

Done when: an instructor can create a class, a student can join, and requests cannot access another instructor's resources or instructor-only actions. Demo accounts can reproduce the flow.

Open product/design questions:

- Can anyone become an instructor, and can one person be both an instructor and student?
- Are organizations necessary now, or should the initial product use class ownership with organizations added later?
- How do invitation codes expire, get replaced, and communicate invalid or expired states?
- What account recovery or verification experience is necessary for a public demo?
- Should employers use isolated seeded accounts, a guest demo session, or self-registration?

### 4. `004-feat-assignments-and-progress` — A complete learning workflow

Depends on: classroom access.

- Let instructors compose a small exercise set, publish an assignment, and set a due date.
- Persist submissions, grade on the server, and show student progress and an instructor overview.
- Define allowed assignment/submission transitions and audit meaningful instructor changes.
- Test grading, access, deadline boundaries, and repeated submission behavior.

Done when: the instructor-to-student-to-progress journey works end to end, saved work survives reloads, and invalid transitions are rejected with useful messages.

Open product/design questions:

- Are exercises authored as formulas, selected from a catalog, or generated from difficulty settings?
- Are retries unlimited, and does progress show the latest, best, or first score?
- Are partially completed answers saved, and can an assignment change after students start?
- Are late submissions rejected, accepted with a label, or controlled by the instructor?
- Which timezone defines deadlines, and what student-level information should instructors see?

### 5. `005-feat-simulated-billing-and-entitlements` — Reliable event-driven access

Depends on: classroom access and the assignment entitlement rules.

- Define a payment-provider interface and simulator with a clearly labeled no-charge checkout.
- Add signed webhook ingestion, unique event IDs, transactional entitlement updates, and visible plan status.
- Define payment and entitlement transitions, including failure, refund, duplicate events, and out-of-order delivery.
- Test signature rejection, replay safety, rollback/retry behavior, and the rule that browser checkout success cannot itself grant access.

Done when: simulated checkout changes the chosen entitlement through a verified server-side event; failures and refunds produce the agreed access behavior; repeated delivery has no duplicate effect.

Open product/design questions:

- What useful capability is paid: class size, assignment count, or another feature?
- Does a plan belong to a class, instructor, or organization? Can this choice stay simple for the demo?
- Is the first model a one-time upgrade or subscription, and which lifecycle states actually need implementation?
- What access remains after cancellation, failed payment, or refund, especially for existing student work?
- How should employers trigger and inspect failure scenarios without confusing the simulator with real commerce?

### 6. `006-feat-durable-jobs-and-history` — Observable background work

Depends on: invitations, due dates, and billing state.

- Add durable scheduling/outbox records for reminders, invitation expiry, and payment reconciliation.
- Implement bounded retries, safe concurrent claiming, and idempotent execution across restarts.
- Record reminder delivery in an outbox initially; expose useful job status through logs or a small instructor/demo view.
- Test retry, concurrent execution, restart recovery, and reconciliation of inconsistent state.

Done when: representative jobs run predictably, retry without duplicate effects, and leave inspectable outcomes. Scheduler triggers alone must not be treated as durable execution.

Open product/design questions:

- When should reminders fire, for whom, and how should duplicates or already-completed assignments be suppressed?
- What job history helps an employer understand the system, and who may view it?
- Should the demo include a controlled way to advance time or trigger jobs?
- Which reconciliation mismatches can be repaired automatically, and which should be flagged?
- Is an in-app outbox enough for this release, or is real email worth its added setup?

### 7. `007-chore-public-demo-and-portfolio` — An employer-ready release

Depends on: the complete journey and the selected deployment model.

- Choose hosting after checking current pricing, usage terms, quotas, and scheduled-job support. Document an explicit budget and resource limits.
- Prepare seeded demo data, a safe reset strategy, health checks, structured logs, and environment setup.
- Add a focused browser smoke test for the principal journey and run the risk-focused permission, event, and job tests.
- Finish the README with screenshots, a short demo walkthrough, architecture/data diagrams, tradeoffs, test evidence, and known limitations.
- Prepare the public repository and deployment for review before publishing them.

Done when: a reviewer can understand the project quickly, run it locally, and try the hosted journey without supplying payment details or personal classroom data. Public links and deployment behavior are verified after publication.

Open product/design questions:

- What should a reviewer experience in the first two minutes, and which deeper engineering scenarios should be linked?
- Should the hosted demo allow writes, use per-session isolation, or periodically reset shared data?
- What budget, uptime expectations, and cold-start behavior are acceptable?
- How should the site communicate simulated billing, synthetic data, and incomplete features?
- Which screenshots, architecture explanations, and tradeoffs best support the intended job applications?

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
