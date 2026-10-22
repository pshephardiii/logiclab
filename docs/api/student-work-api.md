# Student assignment work API

Students can read published work for enrolled classes, save incomplete answers, make one final submission, and access official feedback/solutions according to assignment policy. Students use the **Assigned work** page at `/work`; instructors review final submissions through their **Assignments** page. No deadlines, late-work rules, repeated final submissions, immediate feedback, or completion-only assessment are implemented.

All routes require a student session. Authentication/role checks precede field validation. Assignment, item, enrollment, and attempt scope is established on the server; no student ID, formula, expected answer, or grade is accepted from the client. Foreign/missing, unpublished, archived, or unenrolled work returns the same 404. Responses use `Cache-Control: no-store`; mutations require the exact configured Origin.

| Method | Path                                                            | Behavior                                                                          |
| ------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/api/student/classes/:classId/assignments`                     | List published, active assignments in an enrolled class                           |
| GET    | `/api/student/assignments/:assignmentId`                        | Read assigned exercises and this student's saved attempt, or null before starting |
| PATCH  | `/api/student/assignments/:assignmentId/attempt`                | Replace saved answers for one assigned occurrence                                 |
| POST   | `/api/student/assignments/:assignmentId/submission`             | Finalize saved work and return official feedback                                  |
| GET    | `/api/student/assignments/:assignmentId/items/:itemId/solution` | Read an enabled solution after final submission                                   |

List queries use `limit=1..50` (default 20) and nonnegative `offset` (default 0). Results are ordered by publication time descending, with ID tie-breaking, and return `{ assignments, nextOffset }`. An exactly full final page returns null. Archives are excluded and offset pagination is not a stable snapshot during concurrent changes.

## Exercises and saved work

Detail returns `{ assignment, attempt }`. Assignment metadata follows the shared summary contract; each item exposes its occurrence ID/position, snapshot title/instructions/formula, and an exercise containing only given-column values. Expected answer-column values are omitted. Repeated problem versions retain separate item IDs and independent answers.

A read does not create an attempt. The first successful save or submission creates one row, unique per assignment and student. Attempt responses contain `id`, `revision`, `answers` keyed by item UUID, nullable `submittedAt`, and nullable `result`. Before submission, result is always null and no correctness feedback is returned.

Save one item's entire answer array:

```json
{
  "revision": 0,
  "itemId": "a3333333-3333-4333-8333-333333333333",
  "answers": [
    { "rowId": "<generated row ID>", "columnId": "<generated answer-column ID>", "value": false },
    { "rowId": "<another row ID>", "columnId": "<generated answer-column ID>", "value": null }
  ]
}
```

Use revision zero before starting, then the revision returned by the latest read/save. A successful save increments revision. Stale revisions return `409 ATTEMPT_REVISION_CONFLICT`; reload and reconcile before retrying rather than overwriting another tab's work. Each save retains other items' answers. An empty array clears this item's entries. False and blank null are distinct; omitted cells are blank too. Unknown/given-column cells and duplicate cells are rejected without changing saved work or revision. Each request accepts at most 4,096 cells and retains Fastify's existing body-size limit.

## Final submission and solutions

Submit `{ "revision": <latest saved revision> }`. Submit carries no answers: callers must save edits first. A stale revision conflicts. Untouched items/cells are allowed and count as unanswered. Submission increments revision, records a timestamp, and stores a `truth_table_v1` evaluation snapshot covering every assigned occurrence. Result includes per-item cell statuses (`correct`, `incorrect`, `unanswered`), per-item counts, and aggregate counts. The aggregate counts every answer cell equally; percentages can be derived, while alternate weighting is not implemented. Completion means final submission, independently of whether answers are correct.

Final work cannot be saved again. Repeated/concurrent submission requests return the existing frozen attempt/result without regrading, including retries carrying the pre-submission revision. PostgreSQL rejects updates or deletion of submitted attempt rows. Later library edits and engine changes do not recompute stored official feedback. Changes to the grading algorithm or structural cell-ID format require an explicit compatibility/versioning decision.

Official feedback is available only after submission. Solutions require both `allowSolutions=true` and this student's final submission; otherwise the endpoint returns `403 SOLUTION_UNAVAILABLE`. Enabled solutions contain the full regenerated table for the pinned formula. The initial release rule is deliberately after submission; future configurable release schedules remain separate from assessment mode and feedback timing.

Anonymous practice still permits independent formula analysis. Assignment policy governs official assignment feedback/solution responses; it cannot prevent students from calculating the same public formula elsewhere.

## Access, retention, and concurrency

Archiving hides assignments and blocks all student work endpoints, including reads and solution access. Existing answers/results remain retained; restore re-enables access for currently enrolled students. Enrollment removal blocks further access without deleting attempts. Assignment/student foreign keys restrict deletion while work exists. Instructor review uses separate owner-scoped [submission endpoints](assignment-api.md#final-submission-review), never these student routes or unsubmitted attempts.

Assignment and enrollment rows are held with shared locks during a work operation, excluding archive/removal until it finishes. Each write locks this student's attempt; different students can save concurrently. First-write upsert plus the unique key prevents duplicate attempts; refreshed row locks and revision checks prevent lost updates. Save-versus-submit races yield one winner and a conflict for the other. Submitted-row triggers retain the final record independently of HTTP handling.

Answer saves allow 120 requests/minute per IP; other route limits retain the shared read/mutation defaults. Rate limits remain process-local. Invalid requests return 400; invalid sessions 401; wrong role/origin or locked solution 403; inaccessible work 404; stale revisions/submitted edits/unsupported policy 409; body/content/rate errors retain 413/415/429. Unexpected failures return sanitized `503 STUDENT_WORK_UNAVAILABLE`, with no provider/database details.

## Setup and verification

Apply the new attempt migration using `npm run db:migrate` on existing development databases. `npm run check` covers type checking, pure practice/assignment evaluation behavior, route/handler validation, authorization, response serialization, and production builds. `npm run db:test` verifies migrations/schema alignment, attempt uniqueness, revision/result constraints, retention and immutability, plus the real student-work workflow in an isolated disposable schema. Concurrency checks observe PostgreSQL lock waits and verify that one locked attempt does not block another student's saves. These checks use synthetic identities without Cognito/AWS requests; the student/instructor page walkthrough uses Chrome with real routes/store/PostgreSQL and synthetic identities.

## Student completion page

Sign in as a student and choose **Assigned work**. Select an enrolled class, load published assignments (both lists support pagination/retry), then select an assignment. Choose an item using **Problem** or **Previous/Next problem**. Repeated formulas retain separate answer state because occurrence IDs are distinct.

Changes remain local until **Save problem** succeeds. Save every edited item before final submission; saving one does not discard unsaved edits in another. Failed saves and revision conflicts preserve local inputs. **Reload saved work (discard unsaved edits)** explicitly reloads the server's current revision and answers. Changing classes, assignments, accounts, or pages discards unsaved changes and cancels pending requests so late responses cannot populate another workspace. No work or tokens are persisted in local/session storage.

Final submission requires a checked acknowledgment that work cannot be edited. Blank cells may be submitted and count as unanswered. After confirmation, answers become read-only and the stored result appears, with correctness shown separately from completion. Reloads restore those saved answers/results without requesting new grading. **Show assigned solution** appears only for enabled solution access after submission, requests the protected endpoint, and preserves the student's entries when shown/hidden. No public practice checking/solution endpoints are called by the assignment workflow.

An uncertain submission failure can be resolved by reloading saved work to see whether the final result was recorded. Submission requests are idempotent, and the UI does not automatically retry them. Student work state remains independent of the Practice page.

Local verification for the completion/review slice includes DOM/hook regression tests for save failures, stale revisions, per-occurrence dirty state, final confirmation, readonly restoration, solution gating, pagination/retry, and late-response cancellation. A local Chrome walkthrough against real Fastify routes/PostgreSQL verifies student save/reload/submission/solutions, instructor final-only review, draft privacy, cross-owner rejection, and desktop/mobile layouts without document overflow. Scripts and screenshots remain ignored under `.codex-local/verification/`. No live Cognito, remote CI, alternate browser, or screen-reader audit is implied.

## Learning-policy contract rollout

Assignment responses now use solutionAccess (never/after_submission/anytime). The currently published student workflow remains graded/on_submission, with solutions enabled only by after_submission and a final submission. New learning policies can be authored as drafts but cannot yet be published; explicit checking and new mode-specific submission behavior follow in a later slice.

## Explicit check foundation

`POST /api/student/assignments/:assignmentId/check` accepts `{ itemId, answers }`. The answers use the existing truth-table cell format. It evaluates the submitted transient item answers and returns `{ itemId, feedback }`, with cell statuses and correct/incorrect/unanswered totals. Omitted/null cells are unanswered. Duplicate/invalid cells are rejected. Expected values and solutions are not included.

This operation does not create an attempt, save answers, increment revisions, finalize work, or persist a result/official grade. It intentionally has no revision parameter because it checks the supplied answers rather than a saved snapshot. A frontend must discard stale feedback when its inputs change.

Only enrolled students can check published, nonarchived work whose policy permits explicit checks (completion_only/on_check or ungraded_practice/on_check). Graded assignments return 403 CHECK_UNAVAILABLE. Submitted attempts reject checks with 409 ATTEMPT_SUBMITTED; those students use their final feedback instead. Missing/foreign/unpublished/archived assignments and foreign items return 404. Origin, role, rate, and no-store policies apply, including the existing demo resource namespace.

Publication of the new modes remains blocked during staged rollout. This endpoint is the checking foundation; mode-specific read/save/submit/solution support and frontend integration follow. Integration fixtures exercise the new policies directly without removing the public publication guard.

## Learning-mode saved work and solution release

Published assignments with any valid learning policy can now be read and saved by their enrolled student. Existing per-item revision/conflict checks, invalid-cell rejection, immutable final-attempt guards, and archive/enrollment locks remain in force. Saving never grades, checks, or submits work.

Solution reads apply never/after_submission/anytime on the server. Anytime can return a solution without a saved attempt; after_submission requires a final attempt; never always denies access. Enrollment, item ownership, publication and archive rules apply regardless of release timing.

Ungraded practice rejects final submission with 403 SUBMISSION_UNAVAILABLE before creating or changing an attempt. Instructor submission list/detail reject practice assignments as not found, including any accidentally retained final practice rows. Practice answers remain student-private. Completion-only submission still returns ASSIGNMENT_POLICY_UNSUPPORTED until the next finalization slice; reads, saves and explicit checks are available in the internal/test workflow.

New-mode/anytime publication remains blocked through the authoring API during rollout. No frontend learning-mode controls or new demo assignments are enabled by this slice.

## Completion-only finalization

Completion-only submissions use the existing revisioned submission endpoint. Every expected answer cell in every assigned occurrence must contain T/F; missing items/cells and null values return 409 ATTEMPT_INCOMPLETE. A failed finalization leaves saved answers, revision and result unchanged. Incorrect answers still count as filled. Extra, foreign or duplicate cells cannot substitute for expected cells.

Successful completion freezes the answers and persists a versioned score-free result:

```json
{
  "gradingVersion": "completion_v1",
  "items": [{ "itemId": "<uuid>", "completedCells": 4, "totalCells": 4 }],
  "summary": { "completedCells": 4, "totalCells": 4 }
}
```

The existing version field name is retained for compatibility; this result contains no correctness counts or per-cell grading feedback. Existing truth_table_v1 graded snapshots are unchanged. Instructor list summaries accept either correctness counts or completion counts; detail returns the retained result and final answers. Existing views render completion without a score.

Finalization increments revision once, is idempotent after submission, and serializes with saves/checks through the existing attempt locks. Final answers cannot be edited; permitted after-submission solutions become available. Practice still has no final submission and remains excluded from instructor review.

No database migration or rewrite of old results is needed: result is stored in the existing JSON column and covered by the existing final-attempt retention trigger. Application rollback to a version that only understands graded results requires care once completion results exist. New-mode publication remains blocked until the planned frontend controls/workflow rollout; this slice verifies completion through isolated test fixtures.
