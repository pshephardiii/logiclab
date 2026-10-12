# LogicLab — Product Direction

Decision record · October 12, 2026

This document records the product decisions agreed in our planning conversation. It guides the [implementation plan](initial-implementation-plan.md); where that plan still lists a resolved question, use the decisions here. These are intended behaviors, not claims that the features already exist.

## Purpose

Build an interactive formal-logic learning platform as a public portfolio project visible to potential employers. Students should have a useful practice experience, and instructors should be able to create and assign logic problems and review assigned submissions.

## Accounts and instructor preview

- Students and instructors can sign up and sign in.
- Student and instructor accounts have distinct roles. An instructor account is not also a student account.
- Instructors should eventually have a **Student view** mode to preview the learner experience. Preview does not enroll the instructor as a student or create student submissions.

The exact signup flow, instructor eligibility, and preview interface remain to be designed.

## Assigned work and independent practice

- Instructors create logic problems that are visible to the students assigned to them.
- Instructors have a reusable problem library, allowing the same problem to appear in multiple problem sets.
- Students can also create their own truth tables for independent practice.
- Instructors can view submissions for their assignments. Independent student practice stays private from instructors.

Classes and invitation codes remain proposals from the starter plan. Whether assignment targets are classes, individual students, or both has not been decided.

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

For `(P ∧ Q) → R`, a table may also ask the student to complete `P ∧ Q` alongside the final expression. The precise policy for choosing intermediate columns remains open.

## Instructor settings for problem sets

Introduce these settings with instructor assignments, separately from the logic engine:

| Setting | Intended choices |
| --- | --- |
| Purpose | Practice or graded |
| Feedback timing | Immediately after an entry, or only on submission |
| Solution access | Allow or disable **Show solution** |

Practice and graded presets should provide sensible defaults while letting instructors adjust the settings. Exact preset values are not yet settled. Independent practice can default to immediate feedback and solution access.

The first truth-table slice uses **Check answers** and **Show solution**. Instructor configuration comes later. For assigned work, enforce solution access on the backend; disabling a browser button alone is insufficient. Feedback and solution availability must follow the selected assignment policy.

## First implementation scope

The current branch, `002-feat-truth-table-practice`, should deliver the formula-to-table practice experience, deterministic checking, and a browser/API flow. It does not require accounts or database persistence yet.

Account roles, assignment visibility, instructor preview, and configurable problem-set behavior are agreed product direction for later branches. Derivation checking follows the truth-table milestone.

## Questions still to resolve

- How are students connected to instructors, and what can an instructor assign to a class versus an individual?
- Which formula notation, text aliases, precedence, and complexity limits should the first version support?
- Which intermediate expressions should appear as answer columns?
- How should blank answers behave when checking or submitting?
- What are the exact practice/graded defaults, retry rules, grading rules, and deadline behavior?
- Does viewing a solution affect an attempt or grade, and can solutions become available after a deadline?
- Are independent exercises and attempts saved, and is anonymous practice available?
- What proof system and axioms/rules will derivation exercises use?

## Technical direction already agreed

Use React/TypeScript with Vite for the browser app, Node.js/TypeScript with Jest for backend tests, and the shared schema package for contracts. Keep browser apps under `apps/` and backend services under `services/` so an admin app or worker can be introduced later.

Eventually run local PostgreSQL in Docker and document connecting DBeaver to it. Deploy frontend and backend to AWS using the cheapest viable configuration once runtime, database, and scheduling requirements are known. These choices do not add database or deployment work to the first truth-table slice.
