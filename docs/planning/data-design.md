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

Published set membership, ordering, and assignment settings also need change rules so student work remains interpretable. Whether to snapshot published sets or introduce set versions is still open. Define those rules before implementing assignments.

Engine/parser changes can also affect historical interpretation. Decide how to preserve reproducibility, such as retaining an engine/grammar version, before relying on saved definitions for graded work.

## Storage direction

Use MikroORM with its PostgreSQL driver and committed TypeScript migrations containing explicit SQL. This replaces the starter plan’s Drizzle suggestion to match the maintainer’s familiarity. Entity definitions and migrations remain reviewable. See [Local Database](../development/local-database.md) for setup and integration-test commands.

Use PostgreSQL relational columns, foreign keys, and constraints for identity, ownership, relationships, status, and timestamps. Use validated `JSONB` for exercise-specific definitions and potentially answer payloads. Validate the payload shape by exercise type and format version; JSONB is not a substitute for validation or authorization.

Derivations will eventually need premises, a conclusion, and a proof-system identifier in their definitions, with proof lines in student answers. Their exact representation depends on the chosen axioms/rules and is deferred.

Local PostgreSQL will run in Docker, with documented DBeaver connection settings. The completed truth-table slice required no persistence; the classroom-access branch introduces the initial database setup and migrations.

## Remaining decisions

- Enrollment removal/withdrawal and its effects on retained student work. Initial assignment targeting is class-wide; individual targeting is deferred.
- Library organization, search, sharing, copying, and archive/deletion behavior.
- Published problem-set snapshots or versions, and allowed assignment-policy changes.
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
