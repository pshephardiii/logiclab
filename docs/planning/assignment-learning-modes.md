# Assignment learning modes

Agreed for `010-feat-assignment-learning-modes`. These decisions extend assigned work; anonymous practice remains separate.

## Product rules

| Mode              | Feedback                                 | Final submission                               | Correctness score | Instructor review                 |
| ----------------- | ---------------------------------------- | ---------------------------------------------- | ----------------- | --------------------------------- |
| Graded            | On submission                            | Yes; existing blank-answer behavior retained   | Yes               | Final submissions                 |
| Completion-only   | Explicit Check answers before submission | Yes; every expected answer cell must be filled | No                | Final submissions/completion      |
| Ungraded practice | Repeated explicit Check answers          | No                                             | No official score | Answers remain private to student |

Completion-only submission requires every expected cell across every assignment item, not merely a nonempty answer map. Incorrect answers do not prevent completion. Checking provides correctness feedback but does not save an official grade or finalize work. Students explicitly save practice work; checking must not silently submit it.

Solution access is independent: `never`, `after_submission`, or `anytime`. Ungraded practice permits only never/anytime because it has no submission. Existing graded assignments map `allowSolutions=false` to never and true to after_submission. Default new authoring should retain graded/on_submission/never. Anytime solutions may intentionally be available before a graded submission; that is an instructor choice.

Published assessment, feedback and solution settings remain frozen. Enrollment, ownership, archive visibility and server-side authorization continue to apply. Private practice answers must not leak through instructor review endpoints or aggregates. Immediate per-cell feedback, retries after final submission, deadlines, new exercise types, and broader analytics are outside this branch.

## Commit-sized sequence

1. **Policy/contracts foundation (implemented):** standalone target contract, pure capabilities/solution-release helpers, legacy mapping, and policy tests. Existing endpoints, database checks, UI, and demo template remain unchanged; the new contract is not yet accepted by assignment routes.
2. **Persistence and authoring API (assessment/feedback storage foundation implemented):** enum/check/field changes and migration for learning/solution policies; preserve legacy behavior and final-work retention; validate complete saved policy on partial updates.
3. **Student workflow API:** explicit check operation, mode-specific saves/submission/results, complete-cell validation, protected solutions and private practice access. Add authorization and concurrency regression coverage.
4. **Instructor UI:** mode and solution controls, consistent published read-only display, mode-appropriate review without practice answers.
5. **Student UI:** repeated checking, completion requirements, practice without final submission, mode-specific feedback/results.
6. **Demo and final verification:** seed an additional practice assignment, verify reset/cleanup and existing graded behavior, update walkthrough/evidence and draft PR notes.

Keep each slice small; split API work further if needed. QA and code audit branches remain planned before deployment and will be numbered after this feature. No hosted rollout or resources are part of this branch.

## Persistence rollout checkpoint

The database now stores the three assessment modes and enforces their supported feedback pairs. Existing defaults, solution flags, published data and submissions are unchanged. The migration changes constraints only; it does not rewrite assignments. Rollback is valid while all rows remain graded/on_submission and deliberately fails if new modes exist rather than coercing or deleting them.

Assignment endpoints remain graded-only, and response serialization rejects unsupported stored policies instead of describing them as graded. Do not manually enable new modes for live assignments yet. Replacing the legacy solution boolean with release policy, full-policy validation on PATCH, authoring support, and student workflow enforcement remain subsequent slices. This split keeps the migration review small.
