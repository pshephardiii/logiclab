# Instructor assignment API

This slice implements instructor authoring and publication only. All routes require an instructor session and ownership through the assignment's classroom. Instructor pages are available at `/assignments`. Enrollment-scoped student reads, saved attempts, final submission, and feedback/solution enforcement are implemented in the [student-work API](student-work-api.md); student completion UI is available at `/work`. Publishing records the locked assignment and makes it eligible for the separate enrollment-scoped student endpoints.

Authorization runs before request-field validation and reuses the authenticated user within the request. Foreign and missing classrooms/assignments both return 404. Mutations require the configured exact `Origin`; responses use `Cache-Control: no-store`. Shared account-route rate limits and cookie handling apply.

| Method | Path                                     | Behavior                                                            |
| ------ | ---------------------------------------- | ------------------------------------------------------------------- |
| POST   | `/api/classes/:classId/assignments`      | Create a draft; return 201 with `{ assignment }`                    |
| GET    | `/api/classes/:classId/assignments`      | List owned-class summaries; return `{ assignments, nextOffset }`    |
| GET    | `/api/assignments/:assignmentId`         | Read owned details, ordered items, and pinned publication snapshots |
| PATCH  | `/api/assignments/:assignmentId`         | Edit supplied fields of an active, unpublished draft                |
| POST   | `/api/assignments/:assignmentId/publish` | Publish nonempty content; return `{ assignment }`                   |
| POST   | `/api/assignments/:assignmentId/archive` | Archive a draft or publication; retain all content                  |
| POST   | `/api/assignments/:assignmentId/restore` | Restore listing visibility; published content remains locked        |

## Authored fields

```json
{
  "title": "Conjunction exercises",
  "instructions": "Complete each truth table.",
  "problemVersionIds": ["f516a148-91c7-4bf3-bf7f-42cbf18ad995"],
  "assessmentMode": "graded",
  "feedbackTiming": "on_submission",
  "allowSolutions": false
}
```

Titles are trimmed, required, and limited to 120 characters. Instructions are optional, trimmed, nullable, and limited to 5,000 characters; null clears them. Creation defaults to an empty item list, graded assessment, feedback on submission, and solution access off. These policy dimensions remain independent; completion-only, ungraded, and immediate-feedback modes are not supported yet. Unknown fields, client-supplied ownership/classroom changes, invalid IDs, and unsupported policy values are rejected.

`problemVersionIds` holds up to 50 published version UUIDs belonging to the same instructor. Draft problem IDs are not accepted as publication references. Archived library problems' retained publications may still be selected. Repeated versions are allowed: each ordered occurrence has its own item ID and a positive position starting at one.

PATCH requires at least one field and has no creation defaults. Omitted fields retain their values; a supplied item list atomically replaces the entire ordered list and generates new occurrence IDs. Metadata-only edits retain item IDs. Invalid references or database failures roll back both assignment changes and item replacement. The assignment cannot move to another classroom.

## Publication, archiving, and responses

Action POSTs require `{}`. Publishing requires at least one item and rechecks selected publication ownership. Publication locks title, instructions, item selection/order, and all policy fields through the assignment store/API. It is idempotent: repeated or concurrent requests preserve the same publication timestamp and item identities. No new problem versions are generated.

Archive/restore are idempotent. Archived drafts cannot be edited or published until restored. Published assignments remain content-locked after restore. Both drafts and publications remain readable to their owner while archived. This slice adds no deletion endpoint.

Detail responses contain `id`, `classId`, title/instructions, policy fields, nullable publication/archive timestamps, creation/update timestamps, and `items`. Each item contains `id`, `position`, and its complete immutable `problemVersion` snapshot, including its version/problem IDs and authored definition. Generated answers, student work, session information, and instructor identity fields are omitted. Lists contain assignment summaries without items.

List queries accept `archive=active|archived|all` (default active), `limit=1..50` (default 20), and nonnegative `offset` (default 0). Results use creation time descending with ID tie-breaking. Fetching an extra row determines `nextOffset`; an exactly full final page returns null. Offset pagination does not guarantee a snapshot across concurrent changes.

All draft writes, publication, and archive transitions lock the parent assignment row in a transaction. Waiting writers recheck publication/archive state after acquiring the lock. Published content cannot change through these operations, and later library edits cannot change pinned versions. Unlike immutable problem versions' database triggers, assignment publication policy is enforced by the store; direct database writes are outside that policy boundary.

## Errors and verification

Errors use `{ error: { code, message } }`. Validation returns 400; missing/expired sessions 401; wrong roles/origins 403; absent/foreign assignments/classes `404 ASSIGNMENT_NOT_FOUND`; absent/foreign selected versions `404 PROBLEM_VERSION_NOT_FOUND`; published edits `409 ASSIGNMENT_PUBLISHED`; archived edits/publication `409 ASSIGNMENT_ARCHIVED`; empty publication `409 ASSIGNMENT_EMPTY`. Transport errors preserve 400/413/415, rate limits return 429, and operational failures return sanitized `503 ASSIGNMENT_UNAVAILABLE`.

Run `npm run check` and `npm run db:test`. Colocated handler/route tests cover normalization, omission semantics, authorization ordering, origin policy, pagination, and error sanitization. The real PostgreSQL workflow additionally checks ownership, pinned snapshots, distinct occurrences, atomic rollback, publication idempotency, and publication/edit/archive lock races in an isolated disposable schema. No AWS calls are required. No new migration is introduced by this API slice; apply the preceding assignment-foundation migration with `npm run db:migrate` on existing development checkouts.

## Instructor pages

Sign in as an instructor and choose **Assignments**. Select an owned class; **Load more classes** exposes later pages. If no class exists, follow **Manage classes** to create one. Class selection and unsaved editor state are local to the page and reset on reload/navigation; saved assignments remain in PostgreSQL.

Create a draft with title, optional instructions, and the solution-access checkbox (off by default). Graded assessment and feedback on submission are currently fixed. Choose a library problem, then add a specific published version. Library problems and publications have separate pagination/retry controls; unpublished problems show guidance to publish first. Retained publications of archived problems remain selectable.

The ordered item list displays snapshot titles, versions, instructions, and formulas. Repeated versions are separate occurrences. **Move up**, **Move down**, and **Remove** update the local order; additions stop at 50 items. Empty drafts can be saved, but cannot be published. Failed saves retain input and ordering. Metadata-only edits omit item replacement so existing occurrence IDs survive.

Select an assignment from the paginated class list to load its full saved contents. A failed detail read shows **Retry assignment**, rather than incorrectly offering creation in place of the selected record. Switching assignments/classes or choosing **New assignment** discards unsaved edits, as the page notice explains. Class/account changes unmount the workspace and abort pending reads/writes; aborted responses cannot populate a different class's editor.

Save changes before publishing or archiving; these controls are disabled while edits are unsaved. Publication uses saved content, is idempotent, and locks both the form and item controls. **Archive assignment** retains content; use the **Archived**/**All** filter to find it after reload. Restoring a draft allows editing; restoring a publication retains its content/policy lock. **Reload saved assignment** discards local changes and rereads the server.

Students use **Assigned work** at `/work`. The student-work API enforces the saved solution setting and releases enabled solutions only after final submission. The instructor page links publication to enrolled student access.

Local verification for the initial instructor-authoring UI slice: `npm run check` passed 382 tests (71 engine, 272 API, 39 frontend), type checks, and production builds. A temporary Chrome/Playwright walkthrough used Vite, real Fastify routes and PostgreSQL in an isolated test schema with synthetic instructor/student identities: ordering/repeats/removal, solution policy, item-ID retention on metadata edits, publication, archive/restore/reload, class reset, student role denial, and 1280px/390px layouts without document overflow passed. Local screenshots/script remain ignored under `.codex-local/verification/`. No live Cognito/AWS or remote CI checks were performed; browser evidence is not a committed CI regression suite. Existing bundle-size and test-tool warnings remain.

## Final submission review

| Method | Path                                                       | Behavior                                                                      |
| ------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| GET    | `/api/assignments/:assignmentId/submissions`               | List final-submission summaries for an owned assignment                       |
| GET    | `/api/assignments/:assignmentId/submissions/:submissionId` | Read a final submission, saved answers, pinned exercises, and frozen feedback |

Review requires the same instructor session and ownership through the assignment classroom. Foreign/missing assignments/submissions and unsubmitted attempt IDs return 404. There is no endpoint for instructors to inspect students' unfinished answers. Archived assignments and retained submissions from withdrawn students remain reviewable by the owning instructor.

List queries accept `limit=1..50` (default 20) and nonnegative `offset` (default 0), ordered by submission time descending with ID tie-breaking. Responses contain `{ submissions, nextOffset }`; each summary contains its ID, student ID/email (nullable email), submission timestamp, and frozen grading counts. No Cognito/session fields are exposed. Detail returns `{ submission, assignment, attempt }`, with given-only exercises and the retained final attempt/result. No regrading or draft-answer read occurs.

In the instructor **Assignments** page, select a published assignment to see **Final submissions**. Reload the list for new submissions, select a student to review read-only answers and feedback, and use **Submitted problem** to move between occurrences. List/detail failures support retries and subsequent pages load explicitly. Incomplete students are omitted, so this list is not a live draft-progress roster.
