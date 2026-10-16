# Student assignment work API

Students can read published work for enrolled classes, save incomplete answers, make one final submission, and access official feedback/solutions according to assignment policy. This slice supplies the backend; student screens and instructor submission review follow separately. No deadlines, late-work rules, repeated final submissions, immediate feedback, or completion-only assessment are implemented.

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

Archiving hides assignments and blocks all student work endpoints, including reads and solution access. Existing answers/results remain retained; restore re-enables access for currently enrolled students. Enrollment removal blocks further access without deleting attempts. Assignment/student foreign keys restrict deletion while work exists. Instructor review access will use separate owner-scoped endpoints, not these student routes.

Assignment and enrollment rows are held with shared locks during a work operation, excluding archive/removal until it finishes. Each write locks this student's attempt; different students can save concurrently. First-write upsert plus the unique key prevents duplicate attempts; refreshed row locks and revision checks prevent lost updates. Save-versus-submit races yield one winner and a conflict for the other. Submitted-row triggers retain the final record independently of HTTP handling.

Answer saves allow 120 requests/minute per IP; other route limits retain the shared read/mutation defaults. Rate limits remain process-local. Invalid requests return 400; invalid sessions 401; wrong role/origin or locked solution 403; inaccessible work 404; stale revisions/submitted edits/unsupported policy 409; body/content/rate errors retain 413/415/429. Unexpected failures return sanitized `503 STUDENT_WORK_UNAVAILABLE`, with no provider/database details.

## Setup and verification

Apply the new attempt migration using `npm run db:migrate` on existing development databases. `npm run check` covers type checking, pure practice/assignment evaluation behavior, route/handler validation, authorization, response serialization, and production builds. `npm run db:test` verifies migrations/schema alignment, attempt uniqueness, revision/result constraints, retention and immutability, plus the real student-work workflow in an isolated disposable schema. Concurrency checks observe PostgreSQL lock waits and verify that one locked attempt does not block another student's saves. These checks use synthetic identities without Cognito/AWS requests; browser verification belongs to the upcoming student-page slice.
