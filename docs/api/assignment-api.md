# Instructor assignment API

This API implements instructor authoring, publication and independent grade/answer release. All routes require an instructor session and ownership through the assignment's classroom. Instructor pages are available at `/assignments`. Enrollment-scoped student reads, saved attempts, final submission, and feedback/solution enforcement are implemented in the [student-work API](student-work-api.md); student completion UI is available at `/work`. Publishing records the locked assignment and makes it eligible for the separate enrollment-scoped student endpoints.

Authorization runs before request-field validation and reuses the authenticated user within the request. Foreign and missing classrooms/assignments both return 404. Mutations require the configured exact `Origin`; responses use `Cache-Control: no-store`. Shared account-route rate limits and cookie handling apply.

| Method | Path                                            | Behavior                                                                           |
| ------ | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| POST   | `/api/classes/:classId/assignments`             | Create a draft; return 201 with `{ assignment }`                                   |
| GET    | `/api/classes/:classId/assignments`             | List owned-class summaries; return `{ assignments, nextOffset }`                   |
| GET    | `/api/assignments/:assignmentId`                | Read owned details, ordered items, and pinned publication snapshots                |
| PATCH  | `/api/assignments/:assignmentId`                | Edit supplied fields of an active, unpublished draft                               |
| POST   | `/api/assignments/:assignmentId/release-grades` | Release grades for a published graded assignment with instructor-controlled timing |
| POST   | `/api/assignments/:assignmentId/reveal-answers` | Independently reveal answers under instructor-controlled solution access           |
| POST   | `/api/assignments/:assignmentId/publish`        | Publish nonempty content; return `{ assignment }`                                  |
| POST   | `/api/assignments/:assignmentId/archive`        | Archive a draft or publication; retain all content                                 |
| POST   | `/api/assignments/:assignmentId/restore`        | Restore listing visibility; published content remains locked                       |

## Authored fields

```json
{
  "title": "Conjunction exercises",
  "instructions": "Complete each truth table.",
  "problemVersionIds": ["f516a148-91c7-4bf3-bf7f-42cbf18ad995"],
  "assessmentMode": "graded",
  "feedbackTiming": "on_submission",
  "solutionAccess": "never"
}
```

Titles are trimmed, required, and limited to 120 characters. Instructions are optional, trimmed, nullable, and limited to 5,000 characters; null clears them. Creation defaults to empty items, graded/on_submission, submission-time grade release and no solutions. Graded work requires on_submission feedback; completion-only permits on_submission and retained on_check/immediate assistance, while ungraded practice permits on_check/immediate. Solution access is never, after_submission, anytime or instructor_release; practice permits only never/anytime. Unknown fields, supplied ownership/class changes and invalid policies are rejected.

`problemVersionIds` holds up to 50 published version UUIDs belonging to the same instructor. Draft problem IDs are not accepted as publication references. Archived library problems' retained publications may still be selected. Repeated versions are allowed: each ordered occurrence has its own item ID and a positive position starting at one.

PATCH requires at least one field and has no creation defaults. Omitted fields retain their values. The full saved policy is merged and validated under the assignment lock before any mutation; invalid combinations return 400 ASSIGNMENT_POLICY_INVALID and leave metadata/items unchanged. A supplied item list atomically replaces the entire ordered list and generates new occurrence IDs. Metadata-only edits retain item IDs. Invalid references or database failures roll back both assignment changes and item replacement. The assignment cannot move to another classroom.

The legacy `allowSolutions` field is no longer accepted or returned. Existing clients and demo seeding now send `solutionAccess`; false/true stored behavior was migrated to never/after_submission in the preceding database slice. Creation defaults remain graded/on_submission/never.

## Learning-mode publication

All valid learning policies can now be published, including practice/completion modes and anytime solutions. The temporary rollout guard has been removed from API and UI. Ownership, nonempty pinned content, current class coverage, archive rules, and immutable published policies still apply.

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

Create a draft with title, optional instructions, assessment mode, and solution-release policy. Defaults remain graded/on_submission/never. The mode sets its currently supported feedback timing; the editor explains graded scoring, completion requirements and private practice. Practice offers only Never/Anytime solutions. Switching from After final submission to practice selects Never and announces the change. Published/archived policy controls are read-only. All valid modes and solution-release policies can be published after saving, with the usual content/coverage requirements. Choose a library problem, then add a specific published version. Library problems and publications have separate pagination/retry controls; unpublished problems show guidance to publish first. Retained publications of archived problems remain selectable.

The ordered item list displays snapshot titles, versions, instructions, and formulas. Repeated versions are separate occurrences. **Move up**, **Move down**, and **Remove** update the local order; additions stop at 50 items. Empty drafts can be saved, but cannot be published. Failed saves retain input and ordering. Metadata-only edits omit item replacement so existing occurrence IDs survive.

Select an assignment from the paginated class list to load its full saved contents. A failed detail read shows **Retry assignment**, rather than incorrectly offering creation in place of the selected record. Switching assignments/classes, choosing **New assignment**, or reloading the saved assignment asks before discarding dirty edits. Stay retains the current fields; list refreshes and filters preserve them without prompting. Class/account changes unmount the workspace and abort pending reads/writes; aborted responses cannot populate a different class's editor.

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

## Class coverage for new publication

Publishing a draft now requires an unrevoked `publish_assignments` grant for that class with `startsAt <= now < endsAt`. Without coverage, the API returns 409 `CLASS_COVERAGE_REQUIRED` and preserves the draft. This policy applies even when billing endpoints are disabled. Grants can eventually come from individual purchases or institution subscriptions; publication does not inspect funding source or purchase status. See [billing access and concurrency](billing-api.md#publication-access-and-refund-concurrency).

Existing published assignments, student work, and instructor review remain available under normal authorization rules after funding loss. Repeated publication requests for an already-published active assignment and archive/restore require no new coverage. New drafts remain editable without payment.

## Immediate-feedback policy support

After applying `Migration20261023120000`, create/read/list/update/publication support `feedbackTiming: "immediate"` for completion-only and ungraded practice assignments. Graded policies remain on_submission. Defaults stay graded/on_submission/never. Omitted PATCH fields retain saved values; validate the merged policy under the assignment lock, rejecting invalid transitions without partial writes. Published policy remains immutable. Instructor draft controls now expose timing for non-graded work, preserve it between practice/completion modes, and reset it to submission-only for graded work. Published/archived fields remain disabled. Immediate student feedback is implemented with debounced transient checks; see the [student-work API](student-work-api.md).

## Duplicate as draft

`POST /api/assignments/:assignmentId/duplicate` accepts exactly `{}` and returns `201` with the existing `{ assignment }` response. The instructor must own the source through its class. Anonymous/student requests are rejected before storage; foreign/missing sources return the same 404. Existing exact-Origin, mutation rate-limit (10 requests per 15 minutes per IP for this route), no-store and sanitized-error handling apply. Demo resources expose the same operation at `/api/demo/resources/assignments/:assignmentId/duplicate` within the authenticated visitor workspace.

The operation copies saved title/instructions, learning policy and ordered pinned problem references, including repeated occurrences, into the same class. The title starts with Copy of and stays within the existing length limit. Assignment/item IDs and timestamps are new; publication and archive fields are cleared. Draft, published and archived sources are allowed. Source contents, attempts/results and billing remain unchanged. An empty source produces an empty draft. Source locking serializes duplication with edit/publication/archive; the entire copy joins the owning transaction, including demo resources.

Creating the copy needs no class coverage; later publication still enforces the ordinary coverage/content checks. Client-supplied target class, title, owner or item overrides are rejected. Every successful request creates another draft: no idempotency key or automatic retry is provided. After an uncertain response, inspect/reload the assignment list before deliberately trying again.

The instructor editor exposes Duplicate as draft for saved assignments. Dirty source edits require confirmation and are not copied. Success opens the returned draft; failure preserves local edits and advises inspecting Active or All assignments before retrying. A list-refresh failure retains a confirmed copy and does not repeat the POST. Normal/demo frontend clients share the response contract and explicit resource scope. No migration is required.

## Independent grade release and answer reveal

`gradeReleaseTiming` is `on_submission` (default when omitted on creation) or `instructor_release`. Only graded work can use instructor-controlled grade timing. Completion-only has no grade-release control; completion is acknowledged on submission. PATCH omission preserves the stored timing; a change of mode must include a compatible grade timing when necessary.

`solutionAccess: instructor_release` enables a separate answer-reveal action for graded or completion-only work. It does not depend on submission or grade release. Existing never/after_submission/anytime policies retain their meanings. Graded per-cell correctness can reveal binary answers by inference after grades are released, even when the explicit answer key remains locked.

Both POST actions accept `{}` and return `{ assignment }`. Responses include `gradeReleaseTiming`, nullable `gradesReleasedAt` and nullable `answersRevealedAt`; actor identities are retained in the database rather than included in these views. Response contracts allow these additive fields to be absent for older response compatibility; current database-backed responses supply them. Client-authored release timestamps/actors are rejected.

Actions require ownership, a published non-archived assignment and the matching manual policy. Unsupported actions return 409 `ASSIGNMENT_RELEASE_UNAVAILABLE`; archived work returns 409 `ASSIGNMENT_ARCHIVED`, and foreign/missing assignments return 404. Repeats preserve the first timestamp and actor. No payment coverage is required to release existing published work. Independent actions serialize on the assignment lock alongside submission/read locks, edits and archive changes. Release is assignment-wide, including future late submissions; no automatic release or revocation action exists. Archive/restore preserves release state. Duplication copies policies into a new draft and clears both release histories.

The same actions are available under `/api/demo/resources/assignments/:assignmentId/` with workspace-scoped authorization and transaction commit before success. The instructor editor exposes independent Grade release and Answer reveal policies; published work provides separately confirmed release actions. Completion-only has only answer controls.

## Mixed conceptual assignments (`017`)

Ordered items may pin truth-table, true/false or single-answer multiple-choice versions, including repeated occurrences of the same version. The instructor picker and create/update/publication paths now accept all supported definitions. Ownership, nonempty publication, class coverage, archive rules and immutable published policies remain enforced. Draft/key/option edits in the library do not alter assigned snapshots. Each conceptual occurrence is one response unit; table cells retain their existing unit weight. Student responses, mixed final results, completion and release rules are documented in the [student work API](student-work-api.md#conceptual-response-workflows-017-server-integration).

## Point allocations (`019`)

All graded assignments use points. There is no assignment-level `scoringVersion` request field. For explicit weights, create with:

```json
{
  "title": "Weighted assignment",
  "items": [
    { "problemVersionId": "<published version UUID>", "maxPoints": 20 },
    { "problemVersionId": "<another version UUID>", "maxPoints": 5 }
  ]
}
```

Use whole-point maxima 1–1,000, up to 50 occurrences. Repeated versions have independent IDs/weights. Creating with `problemVersionIds` instead assigns 10 points per occurrence. Do not combine a nonempty version list with weighted items. Completion-only/private practice award no points and reject explicit weighted authoring inputs.

PATCH `pointAllocations: [{ itemId, maxPoints }]` supplies the complete current occurrence set without replacing content/IDs. Ordered weighted `items` replaces/reorders content with fresh occurrences. Do not combine replacement and allocation forms. An identical `problemVersionIds` list preserves existing IDs/weights; changing a nonempty graded list requires weighted `items` so weights cannot be silently reset. Metadata-only PATCH preserves allocations. Mode changes need no scoring toggle and retain allocation metadata for future graded use.

Instructor item responses include `maxPoints`; student graded items include it too. Publication validates allocations under the assignment lock and retains ownership/content/coverage checks. Duplication preserves weights with fresh occurrences and clears final work/release state. Published/archive locks apply. Invalid combined state returns 400 `ASSIGNMENT_SCORING_INVALID` without partial changes.

The instructor form exposes per-problem points and a total for graded drafts, retains failed edits and validates whole-point bounds before saving. Weight-only edits preserve occurrence IDs; reordering carries allocations and defaults new occurrences. Published/archived weights are locked. Student final results and instructor review display the retained score, separate from correctness counts. See [scoring policy and rollout](../planning/assignment-scoring.md).

## Fitch assignment admission and final review (022–024)

Published Fitch, dependency and tree derivation versions are available in graded, practice and completion-only assignments. Graded/completion proofs require `feedbackTiming: "on_submission"`. The owner form/picker enforces these choices; the server independently validates the complete merged item/policy state on create, replacement, policy-only PATCH, duplication and publication. Unsupported combinations return `409 DERIVATION_ASSIGNMENT_MODE_UNAVAILABLE` and roll back the entire mutation. Removing all proofs and switching to a valid objective-only policy in the same PATCH is allowed. Graded proofs use the instructor grading workflow below.

Owner item DTOs may carry private published definitions through `LibraryProblemVersion`; student content and final review instead use pinned redacted content. Repeated versions retain independent occurrence identities; duplication preserves their versions/policies and creates fresh occurrences without student work. Existing coverage, ownership, archive and publication locks still apply. No arbitrary private client-supplied definition is accepted as an assignment item.

The existing owner submission list/detail routes now accept final `proof_completion_v1` work. Lists include completed-response counts and separate verified/error/unavailable proof counts, with no point score. Detail contains frozen submitted proof answers and diagnostics plus redacted pinned content, never the reference/explanation. Instructors may inspect mistakes without revoking completion or assigning a correctness grade. Unsubmitted/practice work remains private; student and foreign-owner/demo visitor access remains denied. Answer reveal remains a separate confirmed action, and completion has no grade-release control. Completion remains score-free; graded proof adjustments use the separate workflow below. See [student workflows](student-work-api.md#assigned-fitch-proofs-022) and [verification](../verification/derivation-student-work-verification.md).

## Instructor grading and adjustment history (024)

These owner-only routes use the same session, exact-Origin mutation policy and no-store handling as assignment review. Demo equivalents use `/api/demo/resources/assignments/...` and the current visitor transaction.

| Method | Path                                                               | Result                                                    |
| ------ | ------------------------------------------------------------------ | --------------------------------------------------------- |
| GET    | `/api/assignments/:assignmentId/submissions/:submissionId/grading` | Current instructor decisions/revision and effective score |
| PATCH  | Same grading path                                                  | Save an explicit revisioned change set                    |
| GET    | Grading path plus `/history`                                       | Newest-first retained revisions with bounded pagination   |

Only final graded work can be adjusted. Owners may adjust any occurrence, including accepted proofs, truth tables and conceptual questions. Original answers, reports, automatic points and submission revision/timestamp are immutable. Owner review lists show effective points; detail includes the original report, separate `automaticScore` and current occurrence decisions after an adjustment. Reference answers/explanations are excluded from final review.

PATCH accepts exactly `{ revision, items: [{ itemId, earnedPoints, comment }] }`. Supply one or more distinct occurrence IDs; unmentioned decisions are retained. Awards are 0 through the frozen maximum in hundredth-point precision. `earnedPoints: null` restores the automatic award and can reopen an unverified proof for review. Zero resolves grading. `comment` is trimmed plain text up to 4,000 characters; null clears it. Clients cannot supply reviewer/time, maxima, evidence or reference fields.

GET/PATCH return `{ grading, score }`. Initial grading has revision zero and no decisions. Saved `gradingVersion: "instructor_grading_v1"` decisions include server reviewer IDs/timestamps. History returns `{ revisions, nextOffset }`, with each revision's change set, resulting decisions/effective score and reviewer/time. Use `limit=1..50` (default 20) and nonnegative offset; an empty following page is valid.

Writes serialize under assignment/attempt locks, compare the supplied revision and append one immutable grading-history row. Foreign/missing/nonfinal submissions return 404; unsupported work returns 409 `SUBMISSION_GRADING_UNAVAILABLE`; stale revisions return 409 `SUBMISSION_GRADING_REVISION_CONFLICT`; invalid/over-allocated decisions return 400 `SUBMISSION_GRADING_INVALID`. Archived history is readable, but writes return 409 `ASSIGNMENT_ARCHIVED`. Unknown operational failures are sanitized 503 responses. Grading PATCH allows 60 requests/minute per process/route/IP, independently of ordinary authoring limits. There is no shared multi-process rate limit.

Any unresolved occurrence keeps effective total/percentage null. Manual awards resolve grading without changing the original checker verdict. Saving follows the existing grade-release policy, including immediate visibility on the next student read if grades were already released. Revealing a reference does not release points/comments, and grading does not reveal a reference.

The review panel retains failed edits, validates awards, protects unsaved navigation/selection and supports explicit history loading/retry. A conflicting or unconfirmed save requires **Reload current grading** before another save; reload requests discard consent. Inspect current/history state before reapplying edits because an interrupted write may have committed. Browser cancellation is not transaction rollback. See [implementation/rollout](../planning/derivation-grading-review.md) and [verification](../verification/derivation-grading-review-verification.md).

## Dependency admission (025)

Dependency publications use the same owner create/replacement/duplication/publication paths and submission-time feedback restriction as Fitch. There is no format-unavailable staging exception. Picker/ordered rows identify the pinned format; only compatible policies offer proof versions. Duplicate assignments preserve versions, labels and weights while creating new occurrences and clearing release/submission state. Formats may be mixed with each other, truth tables and conceptual questions. Each reference must have been independently certified in its own format before publication; assignment inputs cannot replace it or grant additional rules.

Student and owner final review preserve submitted dependency identities, source sets, discharge pairs and frozen reports. Graded mistakes keep null points pending instructor review; completion reports errors/unavailable verification without a score or grade-release control. Existing owner adjustments, history and independent grade/answer release remain unchanged. Template 6 supplies representative mixed-format demos. No new endpoint or migration is required; deploy matching contracts/engine/database/API/frontend builds. See [dependency verification](../verification/dependency-proof-format-verification.md).

## Natural-deduction tree admission (026)

Published tree versions use the same owner create/replacement/duplication/publication operations as Fitch and dependency proofs, including per-occurrence weights, repeated versions, class coverage and published/archive locks. The picker identifies **Natural-deduction tree** publications. Mixed assignments can include any of the three formats alongside objective questions. Graded/completion proofs require submission-time feedback; private practice keeps explicit checking. There is no remaining tree-format admission guard.

Student/instructor projections retain the existing report/result/score versions. Automatic full credit requires complete verification; wrong, unfinished or unassessable graded work awaits instructor grading. Score-free completion retains verification flags for instructor inspection. Independent grade/answer release, adjustment history and frozen official evidence remain unchanged. No new migration is required; rebuild matching packages and review rollback compatibility before older applications read tree payloads. See [tree verification](../verification/natural-deduction-trees-verification.md).
