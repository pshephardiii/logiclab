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
2. **Persistence and authoring API (assessment/feedback and solution-release storage implemented):** enum/check/field changes and migration for learning/solution policies; preserve legacy behavior and final-work retention; validate complete saved policy on partial updates.
3. **Student workflow API (explicit check foundation implemented):** explicit check operation, mode-specific saves/submission/results, complete-cell validation, protected solutions and private practice access. Add authorization and concurrency regression coverage.
4. **Instructor UI:** mode and solution controls, consistent published read-only display, mode-appropriate review without practice answers.
5. **Student UI:** repeated checking, completion requirements, practice without final submission, mode-specific feedback/results.
6. **Demo and final verification:** seed an additional practice assignment, verify reset/cleanup and existing graded behavior, update walkthrough/evidence and draft PR notes.

Keep each slice small; split API work further if needed. QA and code audit branches remain planned before deployment and will be numbered after this feature. No hosted rollout or resources are part of this branch.

## Persistence rollout checkpoint

The database now stores the three assessment modes and enforces their supported feedback pairs. Existing defaults, solution flags, published data and submissions are unchanged. The migration changes constraints only; it does not rewrite assignments. Rollback is valid while all rows remain graded/on_submission and deliberately fails if new modes exist rather than coercing or deleting them.

Assignment endpoints remain graded-only, and response serialization rejects unsupported stored policies instead of describing them as graded. Do not manually enable new modes for live assignments yet. Replacing the legacy solution boolean with release policy, full-policy validation on PATCH, authoring support, and student workflow enforcement remain subsequent slices. This split keeps the migration review small.

### Solution-release storage checkpoint

Assignments now persist `solutionAccess` as never/after_submission/anytime instead of the boolean. The migration backfills both legacy boolean values before dropping that column, without changing publication timestamps or attempt data. Rollback restores the old flags only if no anytime policy exists; otherwise it fails explicitly. The database rejects practice with after_submission access.

Active API requests/responses still use the graded-only legacy contract. The authoring store translates the boolean at that boundary, and student solutions retain the existing after-submission gate. Serialization rejects anytime rows until the full contract/workflows support them. This is staged persistence support, not an enabled new learning mode. Complete-policy PATCH validation and authoring/student support remain next.

### Authoring contract checkpoint

Authoring now accepts all valid draft policies, returns solutionAccess, and rejects the removed allowSolutions API field. Creation defaults remain graded/on_submission/never. PATCH merges supplied policy fields with locked saved state and validates the full combination before changing anything. Published policy remains immutable.

New modes and anytime solutions are intentionally draft-only until student workflow support exists; publication fails with ASSIGNMENT_POLICY_NOT_READY. The current web editor preserves saved policies and sends the new contract, but mode/solution selectors remain a later UI slice. Existing graded checks, demo seeds, and frontend fixtures were updated together for the contract replacement. No new migration is needed for this slice.

### Explicit checking checkpoint

The student check endpoint evaluates transient per-item answers under assignment/enrollment locks and applicable feedback policy, returns status-only feedback, and never writes an attempt or grade. Completion-only submitted work rejects further checks. Existing graded read/save/submission/solution behavior is unchanged. Public publication remains blocked for new modes until the remaining student workflows are implemented. Next sub-slice: mode-specific saved work, completion results, submission/solution rules and privacy.

### Saved work, solution release and privacy checkpoint

Student reads and revisioned saves now support valid policies across all modes. Solution release uses the shared never/after_submission/anytime rules. Practice submission is explicitly rejected without attempt mutation, and instructor submission review excludes practice even if unexpected final data exists. Existing graded work remains supported.

Completion-only finalization and its score-free result representation remain the next small slice. New-mode/anytime publication stays blocked, and UI controls/demo changes remain deferred. The integration suite exercises these staged policies through test-only publication fixtures.

### Completion finalization checkpoint

Completion-only finalization now requires all expected cells for every occurrence, freezes work atomically, and stores completion_v1 counts without correctness scores or grading feedback. Instructor summaries/detail and existing result views support both retained graded snapshots and score-free completion snapshots. Failed/incomplete work rolls back; concurrent/retried finalization remains idempotent.

Practice still cannot submit. No migration or result backfill is required. New-mode publication remains staged off while instructor/student controls are added. The next slices are instructor mode/solution controls, student explicit-check/practice interactions, then publication rollout, demo examples and final verification.
