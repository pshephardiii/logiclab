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

Branch 010 introduced template 2; branch 011 now creates template 3 with immediate practice feedback. Existing active workspaces keep their changes; explicit reset upgrades the template, replaces visitor data and credentials, and retains the original absolute deadline. Shared catalog plans and ordinary account data remain unchanged.

## Verification and remaining scope

See [final learning-mode verification](../verification/assignment-learning-modes-verification.md). Local Chrome rollout checks cover instructor publication, practice check/save/reload/solutions, completion gating/finalization, score-free instructor review, reset, mobile layout and empty browser storage. This is local evidence, not a browser CI suite or exhaustive QA.

Immediate feedback is the next feature branch, described below. Deadlines, retryable final submissions, new exercise types, analytics, and deployment remain separate work.

## Immediate feedback: 011-feat-immediate-answer-feedback

Agreed behavior: instructors can choose immediate feedback for completion-only and ungraded practice work. Graded work retains submission-only feedback. Manual Check remains available in immediate mode. Incorrect answered cells are highlighted without returning expected answers; blanks remain neutral. Solution release stays independent. Checking is transient, saving stays explicit, and publication freezes policy.

Use the existing enrollment-authorized check endpoint with debounced requests. Cancel and invalidate outdated checks after edits, item changes, session changes, and unmount; late responses must never restore stale feedback. Keep requests bounded by the existing rate limits, and preserve editable answers and retry behavior on failure.

Commit-sized sequence:

1. Shared learning-policy support and capability/transition tests (implemented). At that slice, transport still rejected immediate timing; there were no database or UI behavior changes.
2. Database enum/constraint migration and persistence regression checks (implemented), preserving existing rows and refusing lossy rollback.
3. Enable API authoring/read/check support with authorization, publication immutability, transient-write and policy coverage (implemented).
4. Instructor feedback-timing controls and valid mode transitions (implemented), with failed-save retention and published/archive locks.
5. Student debounced feedback, cancellation/stale-response protection, neutral blanks, manual check and failure/retry coverage (implemented).
6. One resettable demo example and walkthrough (implemented: template 3); final branch verification and local PR draft complete.

Dedicated demo QA, code audit, and deployment follow this feature; they are not replaced by its focused regression checks.

### Immediate-feedback persistence rollout

Migration `Migration20261023120000` expands the existing string-column checks; it does not rewrite assignments, publication timestamps, solution rules, or defaults. Only completion-only and ungraded practice may store `immediate`. Graded work still requires `on_submission`; practice still rejects after-submission solutions.

Apply with `npm run db:migrate` before the later API rollout. Slice 3 enables transport authoring and persisted-policy responses after the slice 2 migration. The existing transient check endpoint serves immediate and on_check policies; neither saves work. Instructor timing controls and automatic student checks are implemented in slices 4 and 5. Down migration restores the prior checks only when no immediate assignments remain; it refuses to silently convert their policy.

### Instructor timing controls

Draft authoring now offers explicit Check answers or immediate feedback for completion-only and ungraded practice. Switching between those two modes retains the selected timing. Choosing graded work resets timing to on_submission and disables that selector; leaving graded starts with on_check. Solution choices remain independent, except the existing practice/after-submission incompatibility. Saved immediate policies restore in the editor; published and archived editors stay locked. Failed saves retain timing edits for retry.

Student immediate-policy work now checks transient answers after 1.2 seconds without an edit. Manual Check bypasses and cancels the queued timer. Editing cancels any previous request and clears stale feedback for that occurrence; problem navigation, reload, save, solution actions, assignment/session changes and unmount cancel queued/in-flight work. Graded and on_check work never checks automatically. Submitted work remains read-only. Blank cells receive no Unanswered marker in immediate mode; expected values remain protected by solution policy.

Automatic failures preserve entries, display the existing error, and do not retry in a loop. Students can retry with Check answers or make another edit. The delay bounds automatic requests to at most 50/minute during sustained edits, leaving some headroom under existing limits; this is not a replacement for server rate limiting, and manual or multi-tab traffic can still reach it. Saving and final submission remain explicit. Synthetic-timer/DOM regression tests cover request replacement, late results, queued/in-flight lifecycle cancellation, retry and neutral blanks; template 3 now supplies the seeded example and reviewer walkthrough. Final automated and focused Chrome checks passed; see [verification evidence](../verification/immediate-answer-feedback-verification.md).

Next sequence: `012-test-demo-qa`, `013-refactor-demo-audit`, then `014-chore-demo-deployment`. These deliberate release-readiness passes remain separate from this feature’s focused checks.
