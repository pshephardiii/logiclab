# LogicLab — Product Direction

Decision record · October 12, 2026

This document records the product decisions agreed in our planning conversation. It guides the [implementation plan](initial-implementation-plan.md); where that plan still lists a resolved question, use the decisions here. These are intended behaviors, not claims that the features already exist.

## Purpose

Build an interactive formal-logic learning platform as a public portfolio project visible to potential employers. Students should have a useful practice experience, and instructors should be able to create and assign logic problems and review assigned submissions.

## Accounts and instructor preview

- Students and instructors can sign up and sign in.
- Student and instructor accounts have distinct roles. An instructor account is not also a student account.
- Instructors should eventually have a **Student view** mode to preview the learner experience. Preview does not enroll the instructor as a student or create student submissions.

Anyone may register as an instructor in the initial version. Institutional approval and the detailed preview interface are deferred.

### Authentication and account recovery

Use Amazon Cognito for email/password authentication. Cognito owns credentials; the application owns roles and resource permissions. This is a selected implementation direction, not an already configured service.

- Signup lets the user choose student or instructor and supply email/password, then confirm their email with a code. Include confirmation-code resend.
- Normal authenticated access requires email confirmation.
- Include login, logout, and forgot/reset password in the classroom-access branch. Recovery requests send an email code; users submit the code and a new password.
- Recovery responses should not disclose whether an email has an account.
- Synthetic development Cognito accounts can be preconfirmed for repeatable testing. Still verify actual confirmation and recovery flows against a development Cognito pool. The isolated public demo uses separate local synthetic identities without Cognito accounts; see [Public Demo Direction](public-demo.md).
- Start with Cognito's default email sender for development and a controlled demo; configure SES before broader public registration. See [AWS deployment notes](aws-deployment-notes.md) for the sending limit and follow-up setup.
- MFA and institutional SSO are deferred.
- Use one development pool in `us-east-1`; keep production configuration separate later. Prepare version-controlled infrastructure before provisioning.
- Browser signup/login screens call the API. An opaque HTTP-only cookie identifies a persistent backend session; Cognito tokens remain encrypted in PostgreSQL rather than browser storage. Initial session lifetime is seven days with no remember-me option yet.
- Save the chosen role in the app user as soon as Cognito signup returns its subject, before email confirmation. Confirmation/login retain it; ordinary profile updates cannot change it. Compensate failed local provisioning and explicitly flag failures requiring reconciliation.

See [Cognito Development](../development/cognito-development.md) for the implemented foundation, remaining HTTP integration, and AWS setup walkthrough.

### Classroom membership defaults

- Students join instructor-owned classes through invitation codes.
- A student can join multiple classes, including those owned by different instructors.
- Each class has one instructor owner initially; co-instructors are deferred.
- Defer institution management and billing. Keep class ownership and enrollment explicit in the application.

## Assigned work and independent practice

- Instructors create logic problems that are visible to the students assigned to them.
- Instructors have a reusable problem library, allowing the same problem to appear in multiple problem sets.
- Students can also create their own truth tables for independent practice.
- Instructors can view submissions for their assignments. Independent student practice stays private from instructors.

Classes and invitation-code enrollment are agreed for the initial classroom workflow. Start with class-wide assignments when assignments are introduced; individual student targeting remains future scope.

See [Data Design](data-design.md) for problem definitions, immutable versions, reuse, assignment policy, and student attempts.

## Exercise types and build order

Build truth-table practice first, then add derivation exercises. Different exercise types need different input and validation experiences; they can share the surrounding assignment workflow.

For a derivation exercise, the intended interaction is to add proof lines one at a time, using predefined axioms or inference rules to reach a conclusion from a set of premises. The proof system, available rules, line references, and validation details must be chosen before implementing derivations.

## Truth-table interaction

- Prefill variable columns with the truth-value combinations for the formula. Students do not edit these given values.
- Start answer cells blank. Students enter **T** or **F** in the expression columns they must complete.
- Include the final expression column; compound formulas can also include intermediate-expression columns for students to complete.
- Provide **Check answers**, marking correct and incorrect answer cells while preserving the student's entries.
- Provide **Show solution** in the first practice slice. Assigned work will later control its availability through instructor settings.

For `P ∧ Q`, the student completes the final column:

| P (given) | Q (given) | P ∧ Q (answer) |
| --------- | --------- | -------------- |
| T         | T         | Blank          |
| T         | F         | Blank          |
| F         | T         | Blank          |
| F         | F         | Blank          |

For `(P ∧ Q) → R`, the student also completes `P ∧ Q` alongside the final expression. The initial default is to include every distinct compound subexpression, ordered from inner expressions to the final formula.

### Agreed defaults for the first slice

- Accept symbols `¬ ∧ ∨ →`, aliases `! & | ->`, parentheses, and single uppercase-letter variables.
- Precedence: negation, conjunction, disjunction, implication. Implication associates right; conjunction and disjunction associate left.
- Order variables alphabetically and rows from all T to all F.
- Use keyboard-accessible blank/T/F selectors. Checking labels blanks as unanswered, separately from incorrect answers.
- Show solutions alongside student entries without overwriting them.
- Limit exercises to four distinct variables (16 rows), with bounded formula length and nesting. Initial parser bounds are 256 characters and 32 combined levels of recursive grouping, negation, or implication.

## Instructor settings for problem sets

Introduce these settings with instructor assignments, separately from the logic engine:

| Setting         | Intended choices                                  |
| --------------- | ------------------------------------------------- |
| Purpose         | Practice or graded                                |
| Feedback timing | Immediately after an entry, or only on submission |
| Solution access | Allow or disable **Show solution**                |

Practice and graded presets should provide sensible defaults while letting instructors adjust the settings. Exact preset values are not yet settled. Independent practice can default to immediate feedback and solution access.

The first truth-table slice uses **Check answers** and **Show solution**. Instructor configuration comes later. For assigned work, enforce solution access on the backend; disabling a browser button alone is insufficient. Feedback and solution availability must follow the selected assignment policy.

## Proposed billing journeys

Support two funding journeys. The current billing branch implements only simulated individual instructor payments; institution subscriptions remain a future branch. Real prices and payment collection are not decided.

- **Institution-sponsored access:** an institution pays through a subscription, and associated instructors can use the covered platform features without paying personally. The subscription could cover an allowance of instructor seats or active classes; the billing unit and limits remain open.
- **Self-funded instructor access:** an independent instructor makes a one-time purchase per class for a defined teaching period. This is not a recurring subscription.

Keep payment ownership separate from instructor identity. One instructor account could teach both institution-funded and personally funded classes without acquiring a second account or a student role. A proposed model gives each class a funding source and checks the resulting entitlement rather than requiring the instructor to have personally paid.

### Agreed individual-class simulator scope

`007-feat-simulated-billing-and-entitlements` covers only instructor-funded, one-time class purchases with no real charges. A purchase unlocks **new assignment publication for that class**. Anonymous practice, problem-library authoring, and draft assignment authoring remain free. Only the owning instructor can initiate a class purchase.

Use a configurable **180-day teaching period** as the initial simulator default, measured from verified successful payment. This duration is an implementation default, not finalized commercial pricing. Snapshot duration, currency, and amount in minor units on checkout creation; a later configuration change must not alter an existing purchase's terms. Activation uses the verified success time, not a browser redirect. Access is active from the start instant inclusive until the end instant exclusive.

Failure or abandoned checkout grants no access. A refund revokes only coverage from that purchase; expiry ends that coverage naturally. Existing published assignments, student saves/submissions, results, and instructor review remain accessible under existing ownership/enrollment rules. Neither expiry nor refund deletes work. An independently valid grant can still authorize publication after another grant is revoked. A subsequent purchase supplies a new period rather than silently restarting an old purchase. Automatic renewal, recurring cancellation, and proration are out of scope.

Keep **payment records**, **event receipts**, and **class capability grants** separate. Assignment publication will ask whether the class has a valid capability grant, not whether its instructor owns a paid one-time purchase. A future institution subscription can issue/renew class grants through the same access boundary. Its provider integration, subscription lifecycle, membership, and funding allocation require their own implementation; do not invent institution entities now.

Checkout must be clearly labeled simulated. Signed server events own state changes, with provider-scoped event IDs, payload hashes, monotonic source event sequences, atomic receipt/effect writes, and replay/out-of-order tests. Browser checkout success cannot grant access. The simulator will expose success, failure, refund, duplicate, and out-of-order scenarios without requesting payment details.

### Future institution subscriptions

A later branch will introduce `Institution`, `InstitutionMembership`, and institution-owned `Subscription` entities. An institution can have multiple instructor members; memberships should allow instructors to have multiple institutional affiliations. Subscriptions will reference the shared `BillingPlan` and supply class capability grants. Class ownership stays with the instructor, and neither membership nor funding grants access to unrelated class/student records.

These entities and their management, renewal, cancellation, and coverage-allocation workflows are explicitly deferred. The current branch now includes the shared `BillingPlan` for individual purchases and preserves purchase-term snapshots. Plans distinguish one-time and recurring terms; recurring checkout and subscription management are not implemented. Institution subscriptions will reuse the plan and entitlement boundaries later.

Open billing questions:

- What does an institutional subscription cover, and is its allowance measured by instructor seats, active classes, or another unit?
- Who manages institutional membership and billing, and what happens to classes and access when an instructor leaves?
- What real price and teaching-period duration should replace the simulator defaults, and should repeat course runs use a new class?
- What happens when an institutional subscription expires, is canceled, or fails payment?
- For future institution funding, what additional access or allocation rules are needed beyond the agreed retention of existing work?
- Can a class change funding sources, and how do we avoid duplicate coverage or charges during a transfer?
- What pricing, limits, refund behavior, and expiration rules apply to each journey?

## Implementation scope

`002-feat-truth-table-practice` is merged and delivers anonymous formula-to-table practice, checking, and solutions without persistence.

`003-feat-classroom-access` introduces Docker PostgreSQL/DBeaver setup, Cognito email/password authentication with confirmation and recovery, separate account roles, instructor-owned classes, invitation enrollment, and scoped access checks. Instructor Student view remains an eventual preview feature; it does not require dual-role enrollment. Problem libraries, assignments, grades, institutions, billing, and derivation checking remain later work.

## Questions still to resolve

- Invitation generation uses one reusable code per class with a seven-day expiry; instructors replace it to invalidate the old code. Student redemption/enrollment is implemented: reusable codes, safe duplicate joins, and one generic error for unknown/expired/replaced codes. Existing enrollment survives code replacement.
- How should incomplete work affect final submission and grading? Practice checking already distinguishes unanswered cells from incorrect answers.
- What are the exact practice/graded defaults, retry rules, grading rules, and deadline behavior?
- Does viewing a solution affect an attempt or grade, and can solutions become available after a deadline?
- Are independent exercises and attempts saved, and is anonymous practice available?
- What proof system and axioms/rules will derivation exercises use?

## Technical direction already agreed

Use React/TypeScript with Vite for the browser app, Node.js/TypeScript with Jest for backend tests, and the shared contracts package for contracts. Keep browser apps under `apps/` and backend services under `services/` so an admin app or worker can be introduced later.

Eventually run local PostgreSQL in Docker and document connecting DBeaver to it. Deploy frontend and backend to AWS using the cheapest viable configuration once runtime, database, and scheduling requirements are known. The classroom-access branch adds local database setup and Cognito integration; frontend/backend AWS hosting remains separate deployment work.

## Initial instructor problem library

The next feature is a private, reusable truth-table library owned by instructor users. Save title, optional instructions, and formula as a mutable draft; publication creates an immutable version. Instructors can archive and restore problems without deleting publication history. A problem is independent of any classroom.

Classroom sharing will later make a selected published version available through enrollment-scoped access; publishing itself does not grant student access. Sharing, assignments/submissions/grades, other exercise types, and saved student-created problems remain outside this branch. Anonymous independent practice continues unchanged.

## Assignments: agreed first workflow

`006-feat-assignments-and-progress` connects classrooms to published library versions. An instructor creates a draft assignment for one owned class, with a title, optional instructions, and an ordered list of published problem versions. Publication exposes it to enrolled students and locks content, ordering, and policies; archiving preserves its history. Editing library drafts never changes assigned content. No deadlines, late-work rules, individual targeting, or reusable problem-set entity are needed initially.

Students save incomplete work as a mutable attempt, then make one final submission. Initial feedback arrives on submission. Solution access is an independent instructor setting, off by default, and must be enforced by the API. Submission results and completion are separate concepts: an incorrect submitted exercise can still be completed.

Future assignment policy has three independent dimensions: assessment (`graded`, completion only, or ungraded practice), feedback timing (on submission or immediately after input), and solution access (whether, and eventually when, solutions are available). Later branches may combine completion-only or ungraded exercises with immediate wrong-answer feedback. Do not implement those modes now, conflate feedback timing with grading, or use one practice/graded boolean to control all behavior. Initial persisted assessment/feedback choices support only `graded` and `on_submission`; later modes require deliberate contract/policy changes.

Account and enrollment checks, feedback, grading, and solution policy apply on the backend. Anonymous practice remains a separate public workflow; users can independently analyze formulas, so assignment settings govern official feedback/solutions rather than preventing outside calculation.

The student-work API now implements revisioned saved attempts and one immutable final submission per assignment/student. Blank work may be submitted and counts as unanswered; completion is separate from correctness. For this first workflow, enabled solutions release only after final submission. Archived assignments are hidden from students, retain all work, and become accessible again after restore if enrollment remains active. Future immediate feedback and alternate assessment modes remain deferred. See [student work](../api/student-work-api.md).

## Operational jobs and reconciliation

The next operational milestone is report-only billing reconciliation across the platform. This is an operator/admin concern, not an instructor workflow. Execution and inspection initially use operator CLI commands with database access. Do not add student/instructor endpoints or an admin account role merely to run these commands. A future admin interface requires explicit administrative authorization and separate design.

Persist authoritative run status, timestamps, records-checked/finding counts, and structured discrepancy records. A report identifies the inconsistency kind and related class/purchase/grant IDs without credentials or raw payment payloads. The CLI prints a concise summary and identifiers for inspection. Logs supplement durable history.

Recurring schedules and scheduler/worker cycles must be designed now so external automation can invoke the same code later, even though automatic execution is initially disabled. Retry timing and recurring cadence are separate. The initial job only flags discrepancies; it does not repair coverage, refund money, or change student access. Real email, notifications, assignment reminders, institutions, and subscriptions remain later work.

Future administrative tooling should allow authorized operators to enable/pause schedules and change their intervals through the backend. Initial intervals are job-type-specific code defaults copied into schedule records at setup, not a single global frequency; persisted values control recurrence thereafter. Management requires explicit permissions, validation, and an audit trail. Decide how interval changes recalculate the next occurrence before implementing edits; existing queued work remains unchanged. This admin interface and its authorization/audit model remain outside the current CLI-only jobs branch.

## Isolated portfolio demo

The public demo will create a private synthetic workspace per visitor, with an instructor and student selectable without registration. Switching roles preserves changes within that workspace. Restarting invalidates prior demo sessions and restores seeded classroom, assignment/progress, and simulator payment scenarios. No real charges, per-visit Cognito identities, or personal classroom data.

Expire workspaces after inactivity and an absolute lifetime; reject expired sessions immediately and clean up demo-owned data through bounded durable jobs. Keep normal accounts and their financial/history records outside demo deletion. Hosting should minimize initial cost and may precede an eventual AWS deployment; the existing portfolio links to this separately hosted application. See [Public Demo Direction](public-demo.md) for scope, security boundaries, and implementation status.

## Assignment learning modes follow-up

The agreed next feature is graded, completion-only, and ungraded practice assignments with explicit checking and independent solution release. See [learning-mode decisions and delivery slices](assignment-learning-modes.md). Immediate per-cell feedback remains deferred. Existing graded endpoints remain unchanged until the new persistence and workflows are implemented; the earlier single-mode statements describe the initial release.

## Controlled assessment investigation

Current assignment feedback/solution controls do not prevent students from solving the same formula through independent practice or external tools. Keep independent practice available and avoid presenting graded homework as a secure exam. Investigate Safe Exam Browser as a future option for supervised assessment, with explicit server integration, accessibility, recovery and operational evaluation before implementation. No browser restrictions or student monitoring are part of the current QA/deployment scope. See [controlled assessment investigation](controlled-assessment.md).

## Near-term conceptual question types

After the current QA work, prioritize a separate feature branch for instructor-authored true/false and single-answer multiple-choice questions before tackling derivations. Instructors supply plain-text questions, choices and correct answers; LogicLab validates structure, protects answer keys and grades selections under existing assignment policies. Reuse versioned problems and assignments, preserving truth-table behavior. See [conceptual question scope and slices](conceptual-questions.md). Exact placement relative to the audit/deployment follow-ups will be settled when QA closes; no feature implementation belongs in the current QA branch.

## Near-term notation feature: biconditional

Biconditionals are common enough in introductory logic that their absence is a meaningful limitation. Add support in a small, separate feature branch: parse and evaluate biconditionals in truth tables now, with an explicit AST operator that future derivation work can use. This is planned work, not part of the current QA fixes.

Propose Unicode `↔` with keyboard alias `<->`, subject to confirming notation before implementation. Define precedence relative to implication and the associativity/chaining rule explicitly; do not assume all textbooks use the same convention. Evaluation is true exactly when both operands have the same truth value. Update canonical labels/structural identifiers for the new operator without changing existing formulas' identifiers, and retain existing length/variable/nesting bounds.

Carry support through shared parser/evaluator/table generation, server validation, authoring/previews, assignments and the keyboard guide. Cover the four truth-value combinations, notation equivalence, grouping/precedence, malformed input, stable existing tables and API/UI integration. Extending the engine does not implement derivation rules; those remain separate work.

Include textbook negation alias `~` in the same branch, alongside existing `!` and `¬`. It maps to the existing negation operator without changing precedence or evaluation; canonical labels remain `¬` and existing structural IDs remain stable. Update the tokenizer, error guidance, keyboard guide and grammar documentation together. Test that `~P`, `!P` and `¬P` produce identical ASTs/tables, including nested grouping and use with biconditionals. This alias remains unsupported until that branch is implemented; do not add it as a current QA fix.

## Product-wide UI and UX audit before deployment

A separate UI/UX audit follows functional QA and precedes public deployment. Review aesthetics and consistency, accessibility, navigation and task flow, interface states, and mobile/zoom behavior across the existing product. Keep this distinct from the code audit and new feature work. Agree a visual direction and accessibility target, make small traceable fixes, and record before/after evidence plus testing limitations. See [UI/UX audit plan](ui-ux-audit.md).

## Instructor-controlled results release

Complete and verify a separate instructor-results-release feature branch before initial deployment, including the public demo, with graded results available either at submission or after an explicit instructor release. User decision on October 29: answer access remains independently controlled; releasing grades does not automatically reveal answers. Completion-only has no grade-release control: acknowledge completion at submission and control answer reveal independently. The active branch is `015-feat-instructor-controlled-results-release`. Keep ungraded practice assistance conceptually distinct from official results. The implemented branch provides separate Grade release and Answer reveal controls, server-side withholding and immediate completion acknowledgement. Legacy published completion assistance and historical result visibility are preserved. Remaining notation/conceptual features precede the UI/visual audit and portfolio sandbox; verification is proportional to core journeys and data/access boundaries rather than exhaustive contingency coverage. See [results-release scope and decisions](instructor-results-release.md).

## QA billing correction: one unresolved or paid purchase per class

Do not allow another class checkout while any purchase for that class is pending or paid, or active publishing coverage exists. Enforce this server-side across plans and independently of paginated history, and disable the UI action. Preserve same-request idempotent recovery, payment history and existing grants. Failed/refunded states may permit a fresh purchase; paid records continue to block checkout after period expiry, so renewals require a future deliberate policy rather than implicit stacking. This correction applies to normal and demo billing without real charges or a schema migration.
