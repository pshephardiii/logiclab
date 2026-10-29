# Student assignment work API

Students read published assignments in their enrolled classes, explicitly save answers, and check/submit/view solutions according to assignment policy. The student page is `/work`; instructors review final graded/completion submissions under `/assignments`. Practice answers remain private.

All routes require a student session. Role checks precede field validation. The server resolves assignment/item/enrollment scope; clients cannot supply a student identity, formula, expected value or score. Foreign/missing, unpublished, archived or unenrolled work returns 404. Responses use `Cache-Control: no-store`; mutations require the exact configured Origin.

| Method | Path                                                            | Behavior                                          |
| ------ | --------------------------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/student/classes/:classId/assignments`                     | List published active work in an enrolled class   |
| GET    | `/api/student/assignments/:assignmentId`                        | Read assigned exercises and the student's attempt |
| PATCH  | `/api/student/assignments/:assignmentId/attempt`                | Replace saved answers for one occurrence          |
| POST   | `/api/student/assignments/:assignmentId/check`                  | Check transient answers when policy permits       |
| POST   | `/api/student/assignments/:assignmentId/submission`             | Finalize saved graded/completion work             |
| GET    | `/api/student/assignments/:assignmentId/items/:itemId/solution` | Read a policy-permitted solution                  |

Demo resources use the same paths under `/api/demo/resources/student/...` with isolated identities. List queries accept limit 1–50 (default 20) and nonnegative offset (default 0), ordered by publication time descending then ID. Responses contain assignments and nullable nextOffset. Offset pagination is not a stable snapshot during concurrent changes.

## Policy

| Assessment        | Feedback                             | Submission                                               | Solutions                                            |
| ----------------- | ------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------- |
| graded            | on_submission                        | One final correctness result; blanks allowed             | never, after_submission, anytime, instructor_release |
| completion_only   | on_submission, on_check or immediate | One final completion result; all expected cells required | never, after_submission, anytime, instructor_release |
| ungraded_practice | on_check or immediate                | None                                                     | never, anytime                                       |

Policy is returned as assessmentMode, feedbackTiming and solutionAccess. Published policies cannot be edited. The removed allowSolutions field is not accepted. See [authoring](assignment-api.md).

## Exercises and saves

Detail returns `{ assignment, attempt }`. Items contain occurrence IDs, pinned snapshot text/formulas, and tables with given-column values only. Expected answer values are omitted. Repeated versions have separate occurrence IDs and answers. Reading creates no attempt.

Save one occurrence's full answer array:

```json
{
  "revision": 0,
  "itemId": "a3333333-3333-4333-8333-333333333333",
  "answers": [
    { "rowId": "<row ID>", "columnId": "<answer-column ID>", "value": false },
    { "rowId": "<another row ID>", "columnId": "<answer-column ID>", "value": null }
  ]
}
```

Use revision zero before starting, then the latest returned revision. Saves increment revision and retain other items' answers. An empty array clears that occurrence. False is filled; null/omission is blank. Invalid/given-column or duplicate cells are rejected without changing work. Requests accept at most 4,096 cells and Fastify's body limit.

Attempts contain id, revision, answers by item ID, nullable submittedAt and result. Before final submission, result is null. Saving does not grade or return correctness. Stale revisions return 409 ATTEMPT_REVISION_CONFLICT; reload/reconcile instead of overwriting another tab.

## Transient checking

Check accepts `{ itemId, answers }` using current transient entries. It returns `{ itemId, feedback }`: cell statuses and correct/incorrect/unanswered counts, without expected values. There is no revision parameter because checking does not evaluate a saved snapshot. Both on_check and immediate policies use this same endpoint, with the same authorization, origin, rate-limit and no-store protections. Immediate timing does not reveal expected values or persist checks. Immediate browser checking waits 1.2 seconds after the last answer edit; manual checks cancel that timer and run immediately. Errors retain entries without automatic retries. Blank cells remain visually neutral in immediate mode.

Checks create no attempt, save no answers, increment no revision and persist no score/result. Graded assignments return 403 CHECK_UNAVAILABLE; final attempts return 409 ATTEMPT_SUBMITTED. Invalid/duplicate cells are rejected.

The UI permits repeated checks, preserves unsaved work and clears that occurrence's feedback on edits. Edits, reload, saves, solution actions and submission cancel pending checks; aborted results cannot restore stale feedback.

## Final submission

Submit `{ "revision": <latest saved revision> }` after explicitly saving edits. Finalization locks the attempt, checks revision and freezes answers. Repeated/concurrent finalization returns the existing result, including retries with the pre-submission revision. Final work cannot be edited or regraded; PostgreSQL retention triggers reject updates/deletion except for explicitly scoped disposable demo cleanup/reset.

Graded results retain truth_table_v1, per-item cell feedback and aggregate correctness counts. Untouched items/cells count as unanswered.

Completion requires every expected cell in every occurrence. Missing/null answers return 409 ATTEMPT_INCOMPLETE with no saved-state/revision/result changes. Incorrect filled answers still complete. Completion results contain no correctness score or grading feedback:

```json
{
  "gradingVersion": "completion_v1",
  "items": [{ "itemId": "<uuid>", "completedCells": 4, "totalCells": 4 }],
  "summary": { "completedCells": 4, "totalCells": 4 }
}
```

The version field name is retained for compatibility; completion is not graded. Instructor summaries/detail and student views support both result formats. Practice submission returns 403 SUBMISSION_UNAVAILABLE before creating/changing an attempt; there is no final-submission UI for practice.

## Solutions, privacy and retention

Never denies solutions; after_submission requires this student's final attempt; anytime permits access without saving/submitting. All ownership, enrollment, publication/archive and item checks still apply. The solution contains the regenerated full table for the pinned formula, displayed without replacing entries.

Instructor review includes only final graded/completion work. Practice list/detail returns not found, even if unexpected final data exists. Archives hide all student endpoints while retaining work; restore re-enables access for current enrollments. Withdrawal blocks further student access without deleting retained submissions or instructor review.

Shared assignment/enrollment locks serialize access with archive/removal. Per-student attempt locks serialize saves/finalization; unrelated students can save independently. Demo operations additionally run inside the workspace/generation transaction. Expected values are never trusted from the browser; anonymous analysis of public formulas remains possible outside assignment feedback policy.

## Verification and limits

See [learning-mode verification](../verification/assignment-learning-modes-verification.md). Run `npm run check` and `npm run db:test` for contracts, policies, UI, authorization, migration, retention and concurrency coverage. Apply committed migrations first on development checkouts.

Immediate per-cell feedback, deadlines, late-work rules, multiple final submissions and alternate scoring weights remain deferred. Official results retain their version; later engine/library changes do not recompute them. Completion uses the existing JSON result column, so older application versions need deliberate rollback handling once completion results exist.

## Grade disclosure and independent answers

Graded submission still evaluates and retains an immutable result, but student submit/retry/read/save projections withhold it until `gradeReleaseTiming` permits disclosure. While waiting, `submittedAt` and final answers confirm receipt, `result` is null and `gradePending` is true. No result items or correctness summary are returned. Current responses include `gradePending`; it is optional in the additive contract for compatibility. Release before a student's submission does not reveal a result; a late submission after release receives its result immediately. Instructor review independently retains the frozen result.

Completion-only submission returns its score-free completion result immediately, with `gradePending: false`; it has no grade-release gate. Practice has no final result. Checking remains unavailable for graded or submission-feedback work, preventing that endpoint from bypassing withheld grades.

Answers follow only `solutionAccess`: never, after_submission, anytime or explicit instructor reveal. A manual answer reveal may happen before or after grade release and is assignment-wide; it is not implicitly contingent on student submission. Without reveal, the solution endpoint returns 403 `SOLUTION_UNAVAILABLE`. Enrollment, publication/archive restrictions and normal/demo isolation still apply to every access path. Revealing answers does not release grades. The student UI confirms receipt while grades are pending and offers Refresh results and answer access. Instructor actions and student refresh reuse the normal/demo resource namespace.

## Conceptual response workflows (`017`, server integration)

The server supports mixed truth-table/true-false/multiple-choice work. Assignment authoring still rejects conceptual versions until browser choice controls land. The current student browser explicitly refuses conceptual assignments rather than silently converting saved choices to empty table maps. The following shapes describe implemented server behavior, verified with pinned database fixtures, not a completed browser feature.

A conceptual assigned item retains `id`, `position`, `title` and `instructions`, and has `content` instead of `formula`/`exercise`. Content includes `type`, `definitionVersion`, `question` and, for multiple choice, ordered `{ id, text }` options. Neither keys nor explanations occur in ordinary assigned content.

The same save/check endpoints accept tagged values in `answers`:

```json
{ "type": "true_false", "answer": false }
```

```json
{ "type": "multiple_choice", "optionId": "b1111111-1111-4111-8111-111111111111" }
```

An explicit null value clears a conceptual response. False is filled. The response type must match the pinned definition; option IDs must belong to that version. Missing fields, foreign IDs and injected keys are rejected. All existing authorization, revision, transaction and no-store rules apply. Checking returns only `{ status: "correct" | "incorrect" | "unanswered" }` in `feedback`; it does not create an attempt or disclose an explanation.

Truth-table-only finalization retains the exact legacy formats. An assignment containing conceptual items stores `mixed_v1` for graded work or `mixed_completion_v1` for completion-only work. Each table cell and each conceptual question contributes one response unit. Mixed graded items carry `type`, `itemId` and type-specific `feedback`; their aggregate summary retains correct/incorrect/unanswered/total counts. Completion items and summary use `completedResponses`/`totalResponses`, with no correctness data. Repeated occurrences remain independent. Null/omission is unanswered, and incomplete completion work rolls back without changing the saved revision. Finalization retries return the original frozen result subject to current disclosure permission.

The solution endpoint returns the legacy full table or a tagged conceptual solution containing `correctAnswer` or `correctOptionId` and nullable `explanation`. Only authorized answer access releases these fields. Grade release alone discloses correctness but never the explicit key or explanation; answer reveal does not release a withheld grade. Instructor final review supports both legacy and mixed formats while practice drafts remain private. Older clients cannot assume all answers are arrays or all results use cell counts; coordinate application rollback if mixed results have been stored.
