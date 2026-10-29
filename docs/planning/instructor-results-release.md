# Instructor-controlled grade release and answer reveal

Status: in progress on `015-feat-instructor-controlled-results-release`, October 29, 2026. This replaces the provisional `019` name. Complete and verify this feature before initial deployment, including the public demo. Slices 1–3 establish the grade-timing contract, persistence, authorized release endpoints and student disclosure enforcement. Browser controls remain for the next slice.

## Agreed controls by assessment mode

User clarification, October 29:

| Mode              | Grade release                                                                                  | Answer reveal                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Graded            | At submission or when the instructor releases grades                                           | Independently controlled; may coincide with grade release or occur separately |
| Completion only   | No grade-release control; completion is acknowledged at submission without a correctness score | Independently controlled                                                      |
| Ungraded practice | No grades or final submission                                                                  | Preserve existing practice assistance and answer-access rules                 |

Grade release does not automatically reveal the answer key. Revealing answers does not release grades. For graded work these need independent policies, actions and durable metadata; completion-only needs only the answer side. Offer a deliberate combined action if useful later, but do not make either action implicitly perform the other.

A graded result currently contains per-cell correctness. With binary answers, correctness plus the student's answer can reveal the expected value even when the explicit answer key is locked. Explain this limitation rather than promising that separate controls eliminate inference. Completion-only results remain score-free and disclose no correctness feedback.

## Slice 1 contract and lifecycle

- `gradeReleaseTiming`: `on_submission` or `instructor_release`, applicable only to graded work. Default new graded assignments to `on_submission`.
- A student's grade is visible only after their submission and the configured release condition. A late submission after an assignment-wide grade release receives its grade immediately. Release before submission does not disclose that student's grade.
- Completion status/counts are visible immediately after completion-only submission. There is no pending-grade state or instructor grade-release action for completion-only work.
- Keep existing answer policies `never`, `after_submission` and `anytime` meaningful. Add an independent instructor-controlled answer-reveal option in a later slice, usable for both graded and completion-only work. Do not substitute `after_results_release`, which would couple answer access to grades and make completion-only ambiguous.
- Grade and answer release actions are assignment-wide, owner-authorized, explicit, idempotent and irreversible. Require a published, non-archived assignment with the corresponding instructor-controlled policy. Permit release before all students submit, with clear confirmation; no automatic all-students-submitted detection.
- Persist separate release timestamps and releasing application-user identities. Preserve release metadata through archive/restore; duplicate assignments start as unreleased drafts. Repeating an action returns its existing state without changing the other release.
- A graded student awaiting grades sees saved/final answers and a submission receipt, with `result: null` and an explicit pending-grade state. Withhold grade items and summaries on every response. Access to the answer key follows its independent policy, even when grades are pending.
- New completion-only authoring uses submission-time completion acknowledgement rather than a grade-release control. Preserve existing published pre-submission checking behavior under the compatibility rules below. Ungraded practice retains manual/immediate assistance. Subsequent slices must enforce new authoring combinations consistently in API and UI.

## Compatibility and rollout

Existing graded assignments retain submission-time grade visibility; never retrospectively withhold previously visible results. Preserve existing answer access and published completion-only checking policies. New drafts and explicit edits adopt the new valid combinations; document how legacy duplication normalizes into a valid new draft. Test preservation, transitions and rollback before shipping.

No active response, database field or authoring control changes in slice 1. The standalone timing schema and predicate are foundations, not an implemented server disclosure boundary. Roll out matching database, contracts, server and frontend after compatibility tests pass.

## Implementation boundaries

- Store frozen results separately from disclosure metadata. Grade release changes visibility, not the saved evaluation or final work.
- Enforce grade and answer policies independently on submission responses, attempt reads, summaries, checking/solution endpoints and progress views. Preserve ownership, enrollment and normal/demo isolation. UI hiding alone is insufficient.
- Keep instructor review available regardless of student grade release. Completion-only review stays score-free; private practice stays excluded.
- Test independent action ordering: grades first, answers first, both released, neither released, retries, late submissions and concurrent submission/release. Include completion-only answer reveal without any grade action.
- Published policies remain immutable; release metadata changes through dedicated authorized actions. Keep retained snapshots and final work immutable.

## Suggested slices and verification

1. Establish semantics, standalone grade timing contract and result visibility predicate. Completed October 29, including the clarification that completion-only has no grade-release gate. No active disclosure-path changes yet.
2. Add persistence and policy support for independent grade/answer metadata, compatibility migrations and rollback tests. Slice 2 adds `gradeReleaseTiming`, separate grade/answer timestamps and actor relations, and `solutionAccess: instructor_release` at the database layer. Non-graded rows use an inert `on_submission` grade-timing default and cannot hold manual grade-release metadata; this does not create a grade control for completion-only. The additive migration preserves existing policies/results, permits submission-time completion alongside legacy checking, and refuses lossy rollback. These choices were database-only in slice 2; slice 3 enables them through validated API authoring and authorized release workflows.
3. Add server withholding and independent release workflows, with tests across disclosure paths, concurrency, ownership/enrollment and archived work. Implemented in slice 3: authoring contracts, owner release actions, student result projection and independent solution gating; UI follows separately.
4. Add instructor controls and student pending-grade/answer views with readable terminology and recoverable failures; cover normal/demo workflows.
5. Verify old/new assignments, score-free completion and private practice; update the QA runbook, evidence and local PR draft.

Delaying disclosure can reduce answer sharing through LogicLab; it cannot prevent external solvers or assistance. See the separate [controlled assessment investigation](controlled-assessment.md).

## Slice 2 verification — October 29

`npm run check` passed type checks, 767 tests (83 engine, 503 API, 181 web) and production builds. `npm run db:test` passed 176 PostgreSQL checks (133 database, 43 API/workflow). The release tests cover independent action ordering, completion-only answer metadata, invalid/partial states, legacy graded/completion/practice preservation, schema comparison and rollback refusal. Formatting and whitespace checks passed. This slice does not implement release endpoints, student withholding or browser controls; no live provider or browser verification was performed.

## Slice 3 verification — October 29

`npm run check` passed type checks, 774 tests (83 engine, 510 API, 181 web) and production builds. All 46 API PostgreSQL integration checks passed. They cover independent grade/answer release order, repeated release, concurrent submission/release, unchanged frozen results, late submissions, immediate score-free completion, invalid merged PATCH rollback, ownership/enrollment, archive/restore and duplication. Demo HTTP coverage exercises cross-workspace rejection and committed release metadata and reset after both releases. Formatting and whitespace checks passed. Browser controls and pending-grade presentation are not implemented or browser-tested in this slice; current legacy policies retain their behavior.
