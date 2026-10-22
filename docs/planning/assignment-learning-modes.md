# Assignment learning modes

Implemented in `010-feat-assignment-learning-modes`. All valid policies can now be authored and published. Anonymous practice remains a separate workflow.

## Product rules

| Mode              | Feedback                                 | Final submission                        | Correctness score | Instructor review                 |
| ----------------- | ---------------------------------------- | --------------------------------------- | ----------------- | --------------------------------- |
| Graded            | On submission                            | Yes; blanks count as unanswered         | Yes               | Final submissions                 |
| Completion-only   | Explicit Check answers before submission | Yes; every expected cell must be filled | No                | Final submissions/completion      |
| Ungraded practice | Repeated explicit Check answers          | No                                      | No official score | Answers remain private to student |

Completion requires every expected cell across every assigned occurrence, not just a nonempty answer map. Incorrect answers count as filled; missing/null cells do not. Checking evaluates transient inputs without saving, submitting or recording a grade. Saving remains explicit.

Solution access is independent: `never`, `after_submission`, or `anytime`. Practice supports only never/anytime. Existing boolean solution flags were migrated from false to never and true to after_submission. New authoring defaults to graded/on_submission/never. Anytime solutions can intentionally be available before a graded submission.

Published assessment, feedback and solution settings are frozen. Enrollment, ownership, archive visibility, class coverage for new publication, and server authorization still apply. Practice answers are excluded from instructor submission lists/detail, including unexpected final practice data.

## Implemented slices

1. Shared learning-policy contract, pure capabilities/release rules and legacy mapping.
2. Assessment/feedback enums and SQL constraints, with preservation and rollback tests.
3. SolutionAccess storage and preserving boolean backfill. The API now uses solutionAccess and rejects allowSolutions.
4. Full-policy authoring: defaults on creation, omitted PATCH fields retained, merged policy validated under the parent lock before mutations.
5. Explicit check endpoint: enrollment-scoped, status-only feedback, no attempt/grade writes.
6. All-mode reads/saves, solution release, rejected practice submission and private instructor review.
7. Atomic completion finalization: completeness validation, frozen completion_v1 counts, idempotent retries and score-free review.
8. Instructor mode/solution controls, valid transitions, failed-save retention and locked publications.
9. Student checking, canceled late-feedback protection, practice without final submission, completion/save gating and policy-based solution controls.
10. Publication rollout and demo template 2, with the original graded assignment plus private practice and anytime solutions.

Temporary rollout gates have been removed. Mode-specific policy and workflow tests remain in place.

## Rollout and compatibility

Apply both new migrations before starting the new API. The solution migration changes the stored column; old and new application versions should not serve concurrently during that change. Existing graded rows retain their behavior and publication timestamps.

Rollback cannot silently discard new semantics: the solution migration refuses anytime policies, and the assessment migration refuses non-graded rows. Older application versions do not understand completion_v1 result JSON. Plan rollback deliberately once new policies/results exist.

New demo workspaces use template 2. Existing active workspaces keep their changes; explicit reset upgrades the template, replaces visitor data and credentials, and retains the original absolute deadline. Shared catalog plans and ordinary account data remain unchanged.

## Verification and remaining scope

See [final learning-mode verification](../verification/assignment-learning-modes-verification.md). Local Chrome rollout checks cover instructor publication, practice check/save/reload/solutions, completion gating/finalization, score-free instructor review, reset, mobile layout and empty browser storage. This is local evidence, not a browser CI suite or exhaustive QA.

Immediate per-cell feedback, deadlines, retryable final submissions, new exercise types, analytics, and deployment remain outside this branch. Next are a dedicated local demo QA branch, a code audit, and deployment planning.
