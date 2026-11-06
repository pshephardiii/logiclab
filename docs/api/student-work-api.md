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

Deadlines, late-work rules and multiple final submissions remain deferred. Immediate objective feedback and instructor point allocations are implemented as described below; proof feedback follows its separate mode restrictions. Official results retain their version; later engine/library changes do not recompute them. Completion uses the existing JSON result column, so older application versions need deliberate rollback handling once completion results exist.

## Grade disclosure and independent answers

Graded submission still evaluates and retains an immutable result, but student submit/retry/read/save projections withhold it until `gradeReleaseTiming` permits disclosure. While waiting, `submittedAt` and final answers confirm receipt, `result` is null and `gradePending` is true. No result items or correctness summary are returned. Current responses include `gradePending`; it is optional in the additive contract for compatibility. Release before a student's submission does not reveal a result; a late submission after release receives its result immediately. Instructor review independently retains the frozen result.

Completion-only submission returns its score-free completion result immediately, with `gradePending: false`; it has no grade-release gate. Practice has no final result. Checking remains unavailable for graded or submission-feedback work, preventing that endpoint from bypassing withheld grades.

Answers follow only `solutionAccess`: never, after_submission, anytime or explicit instructor reveal. A manual answer reveal may happen before or after grade release and is assignment-wide; it is not implicitly contingent on student submission. Without reveal, the solution endpoint returns 403 `SOLUTION_UNAVAILABLE`. Enrollment, publication/archive restrictions and normal/demo isolation still apply to every access path. Revealing answers does not release grades. The student UI confirms receipt while grades are pending and offers Refresh results and answer access. Instructor actions and student refresh reuse the normal/demo resource namespace.

## Conceptual response workflows (`017`, server integration)

The server supports mixed truth-table/true-false/multiple-choice work. Student and instructor-review components now render conceptual choices as labeled radio groups alongside existing tables. Student choices retain stable IDs and explicit null/false values, with per-occurrence dirty baselines, Save problem, manual/immediate checking, completion gating and policy-controlled solution display. Final review is read-only. Explanations appear only with a fetched authorized solution, never correctness feedback. Instructor editors and assignment selection now support conceptual published versions; template 4 includes mixed practice and graded examples. Server workflows are verified through database/HTTP checks and focused real-API browser journeys; see the [conceptual verification record](../verification/conceptual-questions-verification.md).

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

## Point score snapshots (`019`, backend slice)

For every graded assignment, assigned items include `maxPoints`. Finalization retains the existing correctness `result` and a separate `score` with `scoringVersion: "points_v1"`, per-item points and an assignment summary. Objective items earn their allocated points multiplied by their correct-unit fraction, rounded to hundredths per item. Totals sum rounded item scores; the percentage is rounded to two decimal places. Score-free work has no numeric point grade.

The student `score` is null before finalization and while grades are withheld. Grade release controls scores and correctness together; answer reveal remains independent. Finalization/retry/read retain automatic evidence without rechecking, while released reads/retries overlay current instructor grading. Submitted graded attempts must have a score; missing snapshots fail closed. Instructor final submission lists/detail include retained scores independently of student release; private drafts/practice stay excluded. Scoring and final result commit atomically with the revision change. See [point policy and rollout](../planning/assignment-scoring.md).

Student graded work displays problem allocations and total available points. Released final summaries show retained item points, earned/max totals and percentage; withheld results show no point score. Instructor lists/detail display the same frozen scores independently of student release. Completion/private work has no numeric grade. No client-provided earned-score or manual-override endpoint is accepted.

## Assigned Fitch proofs (022)

Graded, practice and completion-only assignments can contain pinned version-1 Fitch, dependency or tree derivations alongside tables and conceptual questions. Student routes use the proof-aware `@logiclab/contracts/saved-student-work` projections; the original objective-only student contracts are not a substitute for these responses.

A proof occurrence has ordinary item identity/text plus `content` with `type: "derivation"`, definition/checker/catalog version 1, `format: "fitch"`, `"dependency"` or `"tree"`, stable premise IDs/formulas, conclusion and effective permitted `{ id, label }` rules. It contains no `referenceProof` or explanation. The server loads the authoritative pinned version; requests cannot replace its statement, rules or labels.

Save a full bounded proof response for one occurrence using the existing revision protocol:

```json
{
  "revision": 0,
  "itemId": "<occurrence UUID>",
  "answers": {
    "type": "derivation",
    "proof": { "proofVersion": 1, "format": "fitch", "steps": [], "blocks": [] }
  }
}
```

This empty proof is saveable unfinished work, not a finished completion attempt. Steps and blocks retain UUID identities across insertion/reordering; line numbers are presentation positions. Bounded unfinished formulas, missing citations, open blocks and incorrect reasoning remain saveable. Saves perform transport/configuration validation without returning checker diagnostics, persisting check reports or awarding points. Duplicate/foreign occurrence IDs, wrong response types, unsupported versions and injected reports/keys/scores are rejected. Existing locks, revision conflicts, submitted-work protection and demo transaction fencing apply.

### Practice checks and references

The existing check endpoint accepts `{ itemId, answers: { type: "derivation", proof } }` and returns `{ itemId, feedback: { type: "derivation", report } }`. Reports distinguish local validity, upstream dependencies, target state and `accepted`, `needs_review` or `unassessable` outcomes. They do not include a private reference, explanation or numerical grade. Checks evaluate the current transient proof, create no attempt and change no revision. The browser offers explicit **Check proof** even if companion questions use immediate feedback; editing never schedules a proof check. Edits/lifecycle changes invalidate old feedback and cancel stale requests. Practice has no final submission or instructor draft review.

The solution endpoint returns `{ itemId, solution }`, where the authorized proof solution includes the pinned reference proof and optional explanation. Practice supports `never`/`anytime`; completion supports the existing independent answer policies. Revealing the reference never overwrites the student's proof or releases diagnostics early. Graded references follow the same independent solution policy; neither grade release nor a manual award grants reference access.

### Completion finalization and review

Proof-containing completion assignments require `feedbackTiming: "on_submission"`; legacy objective-only pre-submission completion assistance does not enable proof checking. The browser and server share format-specific bounded finished-attempt predicates: nonblank formulas, selected premises/known permitted rules, required numbers of existing citations and an actual final target. Fitch requires closed valid block layout and a root target. Dependency requires filled assumption/conclusion discharge pairs and identifiable source annotations, ending at the target on a premise or inference line. Notation aliases are accepted, not arbitrary logical-equivalence rewrites. Wrong premise formulas, nonfinal syntax errors and invalid inference/scope/order citations can still be finished work; full proof verification is separate.

Every objective companion must also be filled. Students save all edits and confirm before submitting. Incomplete work returns `409 ATTEMPT_INCOMPLETE` without partial writes. Once all work is finished, the server checks the saved proof against the pinned statement/rules and atomically freezes `proof_completion_v1`, final answers, report evidence, timestamp and revision. Each proof contributes one completed response; objective companions retain their completion units. No point score or pending-grade state is created. Logical mistakes or unavailable verification do not revoke completion.

The result's `summary` contains `completedResponses`, `totalResponses` and `proofVerification: { verified, errorsFound, unavailable, total }`. Derivation items retain `itemId`, `problemVersionId`, `evaluationVersion: "derivation_v1"`, full `report` and completed/total counts of 1. Verification flags are derived from reports, not claims about effort or misconduct. Students receive these diagnostics only after submission; instructors can inspect frozen finals and verification counts through the owner submission routes. Private practice drafts and reference answers do not enter those review responses. Final retries return the same evidence without rechecking; answer reveal does not modify it.

### Graded proofs, instructor decisions and compatibility

Public graded proof assignments freeze `proof_mixed_v1` evidence and a separate `points_v1` automatic score. Wholly accepted proofs earn full credit; incorrect/incomplete/unassessable proofs retain null points until the instructor awards them. Any unresolved item keeps the assignment total/percentage null, including after grade release. No numerical proof partial credit is invented automatically.

After grade release, `score` is the latest effective score. When instructor grading exists, `automaticScore` separately retains the original point snapshot and `instructorGrading: { gradingVersion: "instructor_grading_v1", revision, items: [{ itemId, earnedPoints, comment }] }` contains current released decisions. Student views exclude reviewer IDs/timestamps and revision history. Reports and submitted answers remain original evidence, even if the instructor corrects an award or clears a comment. Zero is resolved; null restores automatic grading and can reopen pending review. Untouched work retains its prior response shape.

Held final attempts expose `result: null`, `score: null`, `gradePending: true`, without `automaticScore` or `instructorGrading`, even after reference reveal. Student refresh and final-submission retries retrieve current authorized points/comments without rechecking or resubmitting work. There is no polling or automatic notification. Released comments render as plain text. Graded transient proof checks remain unavailable (403); explicit reference reads follow solution policy independently.

Apply `Migration20261103120000` before using instructor decisions and rebuild matching packages. Older applications ignore adjusted scores/comments and cannot safely manage their retained demo history; coordinate rollback. See [owner grading operations](assignment-api.md#instructor-grading-and-adjustment-history-024) and [verification](../verification/derivation-grading-review-verification.md).

Apply `Migration20261102120000` and rebuild matching contracts/engine/database/API/frontend outputs. Existing objective result formats are unchanged. Older readers cannot interpret proof responses or new result tags; coordinate application rollback. See [verification and limits](../verification/derivation-student-work-verification.md).

## Dependency-format extension (025)

The proof-aware saved-work schemas carry Fitch, dependency and tree formats; `SavedDerivationAnswer`, `SavedDerivationContent` and `SavedDerivationSolution` describe those unions. `@logiclab/contracts/dependency-derivation-work` supplies the separate dependency answer/save/check shapes. Existing Fitch-only schemas continue rejecting dependency input; they are not substitutes for shared route schemas.

The existing save/check/solution/submission URLs and revision envelope are unchanged. A dependency answer is `{ type: "derivation", proof: { proofVersion: 1, format: "dependency", steps: [...] } }`. Every step has stable `id`, `formula` and `dependencies` source-line IDs. Premises also have nullable `premiseId`; inferences have nullable `ruleId`, up to two `lineReferences` and up to two nullable assumption/conclusion discharge pairs. Drafts may be unfinished or wrong within shape/text/list limits. Statements, permissions, private references, reports and scores cannot be supplied as student work. The pinned definition chooses validation/checking; cross-format answers fail without partial writes.

Student format is fixed by the publication, with separate occurrence drafts and explicit saving/checking. Reference reveal never replaces entries. Graded/completion proofs have no pre-submission check. Dependency completion allows filled logical errors, wrong source sets and forward/self citations for later feedback, but rejects missing targets, blank fields, unlinked/unknown identities, unfilled discharge fields or a final assumption alone. Completion is not verification of effort or logical correctness.

Graded finalization retains the existing `proof_mixed_v1`/`points_v1`; completion retains `proof_completion_v1` without a score. Current result/grade/reveal rules, immutable retries and instructor award/history behavior apply to mixed-format assignments. No new migration or result version is introduced. Rebuild matching consumers; older applications cannot read dependency drafts/definitions and must not be rolled back onto them without compatibility review. See [verification and rollout](../verification/dependency-proof-format-verification.md).

## Assigned natural-deduction trees (026)

The existing proof-aware read/save/check/solution/submission URLs also handle `format: "tree"`. Separate shapes live in `@logiclab/contracts/tree-derivation-work`; shared `saved-student-work` unions include all three formats. Save accepts the usual revision/item envelope with `answers: { type: "derivation", proof: { proofVersion: 1, format: "tree", rootId, nodes } }`. The server chooses validation from the pinned definition, so a Fitch/dependency answer cannot substitute for a tree. Transport and reference shape are described in [the library API](problem-library-api.md#natural-deduction-tree-format-026).

Saves preserve incomplete or incorrect entries and stable identities without grading. Practice checks remain explicit even under immediate timing; they do not write attempts or disclose instructor references. Displayed node numbers and report `stepIndex` refer to submitted array positions; UUIDs carry identity. The selected root, not the last array entry, determines the target. Drawing the proof does not verify it.

Graded finalization freezes `proof_mixed_v1` evidence and `points_v1`: accepted proofs receive full allocated points; all other outcomes retain pending review rather than zero. Completion requires one connected filled tree, a selected premise/inference root matching the target, known selected premises/rules and the required existing operands/branch fields. A filled but logically incorrect tree can complete and receives retained error/unavailable verification flags without points. Grade/report/comment release and reference/explanation reveal remain independent. The shared immutable retry, instructor adjustment/history and ownership policies apply unchanged. No new migration, result version or endpoint is introduced. See [final evidence and limitations](../verification/natural-deduction-trees-verification.md).
