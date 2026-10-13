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
- Synthetic development/demo accounts can be preconfirmed for repeatable testing. Still verify actual confirmation and recovery flows against a development Cognito pool.
- Start with Cognito's default email sender for development and a controlled demo; configure SES before broader public registration. See [AWS deployment notes](aws-deployment-notes.md) for the sending limit and follow-up setup.
- MFA and institutional SSO are deferred.
- Use one development pool in `us-east-1`; keep production configuration separate later. Prepare version-controlled infrastructure before provisioning.
- Browser signup/login screens call the API. An opaque HTTP-only cookie identifies a persistent backend session; Cognito tokens remain encrypted in PostgreSQL rather than browser storage. Initial session lifetime is seven days with no remember-me option yet.
- Save the chosen role in the app user as soon as Cognito signup returns its subject, before email confirmation. Confirmation/login retain it; ordinary profile updates cannot change it. Compensate failed local provisioning and explicitly flag failures requiring reconciliation.

See [Cognito Development](cognito-development.md) for the implemented foundation, remaining HTTP integration, and AWS setup walkthrough.

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
| --- | --- | --- |
| T | T | Blank |
| T | F | Blank |
| F | T | Blank |
| F | F | Blank |

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

| Setting | Intended choices |
| --- | --- |
| Purpose | Practice or graded |
| Feedback timing | Immediately after an entry, or only on submission |
| Solution access | Allow or disable **Show solution** |

Practice and graded presets should provide sensible defaults while letting instructors adjust the settings. Exact preset values are not yet settled. Independent practice can default to immediate feedback and solution access.

The first truth-table slice uses **Check answers** and **Show solution**. Instructor configuration comes later. For assigned work, enforce solution access on the backend; disabling a browser button alone is insufficient. Feedback and solution availability must follow the selected assignment policy.

## Proposed billing journeys

Support two possible funding journeys. These are product directions to explore, not finalized pricing or entitlement rules.

- **Institution-sponsored access:** an institution pays through a subscription, and associated instructors can use the covered platform features without paying personally. The subscription could cover an allowance of instructor seats or active classes; the billing unit and limits remain open.
- **Self-funded instructor access:** an independent instructor pays for their own use, potentially through a fee per class. A class fee covering a defined teaching period, such as a semester or course run, is the proposed starting model rather than an indefinite purchase.

Keep payment ownership separate from instructor identity. One instructor account could teach both institution-funded and personally funded classes without acquiring a second account or a student role. A proposed model gives each class a funding source and checks the resulting entitlement rather than requiring the instructor to have personally paid.

The simulated-payment milestone can demonstrate both journeys without real charges. Billing work remains outside the classroom-access branch.

Open billing questions:

- What does an institutional subscription cover, and is its allowance measured by instructor seats, active classes, or another unit?
- Who manages institutional membership and billing, and what happens to classes and access when an instructor leaves?
- What counts as a billable class, how long does a class purchase last, and how are renewals or repeat course runs handled?
- What happens when an institutional subscription expires, is canceled, or fails payment?
- Do students and instructors retain access to completed work after class funding ends?
- Can a class change funding sources, and how do we avoid duplicate coverage or charges during a transfer?
- What pricing, limits, refund behavior, and expiration rules apply to each journey?

## Implementation scope

`002-feat-truth-table-practice` is merged and delivers anonymous formula-to-table practice, checking, and solutions without persistence.

`003-feat-classroom-access` introduces Docker PostgreSQL/DBeaver setup, Cognito email/password authentication with confirmation and recovery, separate account roles, instructor-owned classes, invitation enrollment, and scoped access checks. Instructor Student view remains an eventual preview feature; it does not require dual-role enrollment. Problem libraries, assignments, grades, institutions, billing, and derivation checking remain later work.

## Questions still to resolve

- How do class invitation codes expire or get replaced, and how should enrollment errors be presented?
- How should incomplete work affect final submission and grading? Practice checking already distinguishes unanswered cells from incorrect answers.
- What are the exact practice/graded defaults, retry rules, grading rules, and deadline behavior?
- Does viewing a solution affect an attempt or grade, and can solutions become available after a deadline?
- Are independent exercises and attempts saved, and is anonymous practice available?
- What proof system and axioms/rules will derivation exercises use?

## Technical direction already agreed

Use React/TypeScript with Vite for the browser app, Node.js/TypeScript with Jest for backend tests, and the shared contracts package for contracts. Keep browser apps under `apps/` and backend services under `services/` so an admin app or worker can be introduced later.

Eventually run local PostgreSQL in Docker and document connecting DBeaver to it. Deploy frontend and backend to AWS using the cheapest viable configuration once runtime, database, and scheduling requirements are known. The classroom-access branch adds local database setup and Cognito integration; frontend/backend AWS hosting remains separate deployment work.
