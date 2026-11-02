# Derivation student work

Status: `022-feat-derivation-student-work` is ready for review after fourteen implementation slices and final verification. See [branch evidence and rollout](../verification/derivation-student-work-verification.md). Instructors can select and publish Fitch proofs in ungraded practice and completion-only assignments. Students explicitly save their work; practice checking is manual, while completion diagnostics appear only after submission. Completion acknowledges finished attempts independently of logical correctness, with retained verification flags and read-only instructor review. Answer reveal stays independently controlled. Graded finalization/disclosure remains internal groundwork, with graded assignment admission guarded until 024 instructor grading/review. See [the agreed sequence](logical-derivations.md#022-student-work-and-finalization) and [private authoring](derivation-authoring.md) for the existing boundaries.

## Student work versus private authored content

The separate `@logiclab/contracts/derivation-work` entry contains:

- `DerivationAnswer`: `{ type: "derivation", proof }`, using the existing bounded, versioned Fitch serialization. Empty steps/blocks are an explicit empty response; no answer is distinct from a response with an empty proof. Missing references, unfinished blocks, bad formulas and logically incorrect steps remain saveable within transport limits.
- `SaveDerivationAnswers`: `{ revision, itemId, answers }`, using the existing nonnegative revision bounds. The request cannot choose a problem version, owner, workspace, permitted rule set or replacement statement.
- `CheckDerivationAnswers`: `{ itemId, answers }`, for transient explicit checking, with no save/revision mutation implied.
- `DerivationCheckFeedback`: `{ type: "derivation", report }`, containing student-specific diagnostics without the private reference/explanation.
- `DerivationEvaluationEvidence`: `{ evaluationVersion: "derivation_v1", type: "derivation", itemId, problemVersionId, report }`. Server-supplied occurrence/version provenance and the full versioned checker report are retained separately from the student's proof and awarded grading. This is an evidence component, not a new live submission-result format.

All shapes are strict. Student answers cannot inject a report, acceptance flag, reference proof, explanation or score. Shape validation is not proof acceptance, authorization or a signature on checker evidence. Future callers must generate evidence themselves, never trust a client-supplied report. The contracts are not re-exported through the active root student-work union, avoiding accidental route/frontend admission before compatible workflows exist.

## Pure application boundary

`validateDerivationAnswer` validates bounded transport and returns independently parsed data without running the checker. Saving incorrect/incomplete work must not grade it or reveal diagnostics. It rejects invalid transport with the existing `invalid_answer` application failure.

`evaluateDerivationAnswer` receives a trusted occurrence ID, pinned published-version ID, redacted `DerivationContent` and an untrusted student answer. The caller must first enforce enrollment, workspace/ownership, assignment policy and permission to see checking feedback; this helper performs none of that authorization and writes nothing. The authoritative statement/rules must come from the pinned server publication, never the check request. Full private owner definitions are rejected at this boundary. Content validation shares supported catalog/version checks with authoring without inspecting or comparing the private reference.

The checker retains distinct local/dependency validity, target state and accepted/review/unassessable outcomes. An unused error still requires review; locally valid work can retain invalid upstream support. Unassessable evidence remains explicit and contains no guessed zero or partial score. The scoring/finalization stages below map evidence to full credit, pending review and assignment totals; instructor-awarded adjustments remain later review work. This foundation enables no grade release, reference reveal or completion-only policy.

## Staged persistence and projections

`@logiclab/contracts/saved-student-work` describes the combined saved-response/attempt/assignment projections for existing work and proof drafts. The database JSON response union matches these types exactly and shares a format-specific Fitch proof shape with private references. Proof drafts require no database column changes; retained graded proof results now require the migration described below. The original root-exported objective contracts remain narrower; student routes now explicitly choose the compatible proof-aware saved-work entry rather than silently omitting proof data.

The existing student store's `read`/`save` methods support proof drafts for practice, staged graded assignments and completion-only assignments with submission-time feedback. They retain shared assignment/enrollment locks, occurrence membership checks, submitted-work denial, attempt-row locking and revision comparisons. Incomplete/incorrect work is shape-validated, saved under the occurrence ID and returned without checker feedback, results or points. Separate occurrences and students keep separate work. Proof configuration is validated against supported semantics, and reads project only pinned statement/rule content: no reference or explanation. Later owner draft edits cannot change the pinned statement.

Ordinary calls own their transaction; demo/request-scoped calls join the supplied workspace transaction. Failed validation/revisions and caller failures roll back writes. Saves waiting behind archive/enrollment removal recheck access before writing. Existing submitted-record retention is unchanged; graded proof finalization is supported internally as described below. Instructor practice review remains private/unavailable. Objective finalization/review still validates its narrower answer union rather than dropping proof fields.

Assignment create/publication admits proofs for ungraded practice and completion-only work with `on_submission` feedback. Do not seed staged graded fixtures into user-facing data; internal graded finalization does not enable graded proof assignment publication.

## Practice checking and reference access

The existing store's `check` method now accepts proof responses for assigned practice. It enforces enrollment, published/nonarchived assignment access, check capability, attempt state and occurrence membership before evaluating current unsaved work. The statement, enabled rules and version ID come from the pinned server publication. Checks create no attempt, do not save the submitted proof and do not change revisions, results, scores or update timestamps. An incorrect saved proof and a different checked proof remain separate. A later owner draft edit cannot change the checked statement. The same workspace-bound methods deny cross-visitor calls.

`solution` separately enforces the existing answer-access policy and the current practice/completion proof policy guard before projecting the accepted pinned reference/explanation. `never` stays locked even when checking is allowed; `anytime` permits reference access independently of proof correctness or whether a draft exists. Revealing a reference does not save work or release feedback/grades. Neither response contains the other's private fields. These operations reuse existing assignment/enrollment locks and transaction binding.

The proof-aware saved-work entry includes strict check request/response and solution response schemas for all supported work variants. Student routes now opt into these proof-aware schemas; checks, responses and solutions cannot be passed as save requests. Graded proof checks remain locked. Completion proof diagnostics are submission-time only; independently authorized completion reference access is now supported. Older completion policies that permit pre-submission checks remain unsupported for proof-containing work. Proof editing performs no automatic checks.

## Staged graded-result and scoring foundation

`@logiclab/contracts/proof-submission` defines `proof_mixed_v1` for graded assignments containing at least one proof. Each proof retains its occurrence/version-bound checker evidence; objective items retain their existing correctness feedback. The summary separates objective response-unit counts from accepted/review/unassessable proof counts rather than treating a whole proof as one truth-table cell. Strict validation rejects duplicate occurrences, inconsistent totals and injected score fields. Objective-only assignments continue using the existing result formats.

`evaluateProofSubmission` takes caller-loaded authoritative occurrences and student responses, validates membership/identity/type boundaries, evaluates proofs against pinned redacted statements and reuses objective evaluation. Missing proof work is checked as an empty proof, not assigned an invented zero. It preserves occurrence order and source data, accepts alternate correct routes without comparing private references and keeps unused errors and resource-limit outcomes in the report.

`scoreProofSubmission` consumes freshly computed server evidence and authoritative allocations. Accepted proofs earn their full allocation. Incorrect, incomplete, unused-error or unassessable proofs have `needs_review` with null earned points; any such item keeps assignment earned points/percentage null. Objective items retain their normal weighted correctness and rounding, using the shared objective-outcome calculation. Proofs receive no numerical automatic partial credit. Checker evidence remains separate from later instructor-awarded grading. Pending review is also distinct from withheld grade release (`gradePending`).

The staged saved-attempt contract and database now support this result format, and transactional graded proof finalization is supported internally. Student HTTP result/attempt responses now opt into the compatible saved-work contracts; the original root exports remain narrower. Graded availability stays guarded through 024 review; no completion-only semantics are implied by this graded format. Callers must authorize and recompute under the assignment/attempt transaction rather than accepting a client result or cached check.

## Retained proof results and disclosure

The database JSON types now describe the exact versioned proof report, occurrence-bound evidence and mixed result. `Migration20261102120000` permits `proof_mixed_v1` point snapshots and requires a score for retained graded proof results. Existing final-answer/result/score immutability remains enforced. The migration does not rewrite objective results or awarded points; rollback locks the table and refuses while retained `proof_mixed_v1` results exist.

Apply this migration before running the new application, and rebuild matching contracts/database/API consumers. No user development database has been migrated or reset by this slice. Database constraints establish storage state and format tags; strict application contracts validate report shape and summary integrity.

The staged student projection validates retained proof-score arithmetic and pending-review state without rerunning the checker, replacing evidence or writing a new grade. It withholds both reports and points until the independent grade-release policy permits them, even if answers have already been revealed. Released review-needed work retains null earned totals/percentage; grade release and instructor review remain separate states. Missing/inconsistent snapshots or proof results in an unsupported assessment state fail closed.

Root objective-only student contracts remain narrower; active student routes explicitly use the proof-aware saved-work entry. Owner review now admits completion proof results and rejects graded proof results. Full graded proof review belongs to 024. Graded finalization remains internal groundwork, while practice and completion workflows are enabled.

## Transactional graded finalization

The internal student store now accepts revisioned graded proof drafts and reads their redacted pinned content. Its `submit` operation detects proof-containing graded assignments, evaluates saved responses using the authoritative occurrence/version definitions and freezes `proof_mixed_v1` evidence and point scores together with the submission timestamp and incremented revision. Objective-only graded/completion workflows retain their result formats. Completion-only proof submission now follows the separate score-free flow below; practice still has no final submission.

Shared assignment/enrollment locks prevent archive/removal races, and the existing attempt upsert/write lock serializes concurrent saves/submissions. A first finalization requires the current revision. Once finalized, retries return the retained attempt rather than checking/regrading again, including retries with an older revision. Authorizing the current enrollment/assignment still precedes retries. Later library draft edits cannot change pinned evaluation or retained results.

Accepted proofs receive full allocation. Missing/incomplete/incorrect proofs retain checker evidence and pending-review points rather than automatic zero or partial credit. Mixed objective items retain their own weighted results while unresolved proofs keep assignment earned totals/percentage null. The proof response itself is not overwritten with a reference or a synthesized empty answer. Grade release controls report/point disclosure independently from answer reveal, including on immutable retries. Pre-submission graded proof checking remains locked; graded reference access and the instructor review workflow remain guarded pending their dependent slices.

Database write failures and caller/demo transaction failures roll back answers, reports, points, timestamps, revisions and any newly inserted attempt. Demo calls use the existing workspace-bound manager and deny other visitors. Practice and completion-only proof admission and student HTTP/frontend flows are now supported; graded admission remains guarded. Do not introduce live graded proofs before 024 review can resolve flagged submissions. The current frozen automatic-score validator is not yet an instructor adjustment workflow.

## Shared Fitch editor and staged student panel

The Fitch editor, line/citation controls, pure edit operations and read-only summary now live in `apps/web/src/features/proof`. The authoring page retains small private wrappers, passing only premises/rules and the selected proof to shared controls. The shared editor accepts no private definition or explanation. Existing authoring interactions, stable citation identities, bounded insertion and explicit destructive confirmations are preserved.

`AssignedDerivation` is a controlled, staged student panel: redacted pinned content supplies premises, target and effective rule labels; the student answer supplies the editable proof. Starting copies premises once, while saved empty/incomplete proofs load without auto-filling or repair. Edits emit bounded proof responses through a callback, never save or check automatically. Clear requires confirmation and emits an explicit empty proof response. Busy controls are disabled; submitted work uses a read-only summary with no editing/check actions.

An optional explicit **Check proof** callback leaves request authorization/cancellation with the caller. Feedback includes the exact proof snapshot that was checked; the panel hides it when current work differs, including late reports for older edits. Diagnostics show local versus upstream validity and distinct verified/review-needed/unassessable outcomes without inventing a grade. A separate authorized solution prop renders the instructor reference/explanation without overwriting the student's proof or releasing feedback. The panel does not import the proof checker or a private authoring component.

The panel is now connected to `AssignedAttempt` and its answer/request state, as described below. Shared components alone still provide no authorization or persistence guarantee. The parent enforces check/result visibility and resets editor controls by occurrence; practice admission now uses the guarded authoring flow described below.

## Assigned-work browser integration

`useAssignedAnswers` retains proof drafts and saved baselines per occurrence, independently of table/choice answers. Missing proof work remains absent until explicitly started; an explicit empty response remains distinct. Exact structural reversion clears dirty state without checking or normalizing formulas. A successful save advances only the captured occurrence baseline; failed/conflicting saves retain all local edits. Existing dirty-work registration now protects proof edits during route navigation, reload and browser unload. Movement between problems retains drafts without a discard prompt; reload still requires Stay/Discard when dirty.

`useAssignedAttempt` uses the proof-aware saved-work types and the browser client validates those strict assignment/attempt/check/solution envelopes. The staged contract entry now also exports the attempt-response envelope and single-response type. The original root-exported objective schemas remain unchanged; the student routes now opt into the same proof-aware entry as the browser. Both normal and demo resource transports retain their existing scoped URLs and abort signals; ordinary assigned content rejects injected private references/explanations. Retained proof results require their point snapshot at the client boundary.

Proof edits never schedule automatic checks, including mixed immediate-feedback practice. **Check proof** captures the unsaved proof separately from the request result. Editing, selection, save, reload, assignment change and unmount cancel in-flight checks; aborted late reports cannot become current. The hook retains the captured proof with authorized feedback so the panel can also reject a stale snapshot. Check errors preserve input without retry loops, and replies for a different occurrence are rejected. Assignment changes also cancel pending writes so an old save response cannot clear a new draft's dirty state.

`AssignedAttempt` now renders the Fitch panel, preserves separate solution retrieval and uses explicit Save problem plus the existing final-submission confirmation. Submitted proof work is read-only. Authorized mixed results show proof verification/review state separately from objective response counts and points. Withheld results expose neither reports nor awarded points; released review-needed totals stay nonnumeric. Missing submitted proofs display explicit empty work with their retained review report. No transient report is used as a substitute for a withheld final result.

The frontend and student HTTP endpoints now participate in the supported instructor-to-student practice proof flow. Graded availability remains guarded until 024; do not seed unsupported graded assignments into user-facing data. Graded reference access remains guarded in persistence; completion reference access is supported under its independent release policy. No autosaving or browser-storage recovery is introduced.

## Proof-aware student HTTP routes

Read, explicit save/check, solution and final-submission handlers now use `@logiclab/contracts/saved-student-work` for the corresponding proof-aware requests/responses. Paths, instructor/student authentication, enrollment scoping, origin checks, no-store headers, rate limits and demo workspace transaction binding remain unchanged. Requests accept only responses and occurrence/revision data, never replacement statements, report claims, reference proofs or awarded points. The store still loads the authoritative pinned version and enforces the assignment policy before checking or revealing a solution.

Practice proof saves accept bounded incomplete work, retain revision conflicts and keep separate occurrences independent. Checks use current unsaved work without attempt creation or writes; private reference/explanation access is independently controlled. Later owner edits cannot alter the pinned reference. Practice has no final submission (the existing 403 response is preserved). Normal and demo routes deny outsiders/other visitors and archived work.

Graded HTTP projections are tested only with internal fixtures: a withheld final receipt carries neither report nor points, independent answer reveal does not release them, and later authorized grade release exposes retained review-needed reports with nonnumeric totals. Final retries return the retained evidence rather than regrading. Graded pre-submission checks and reference access retain their existing guards. This does not enable graded proof assignment creation or instructor review, and completion proof admission is now supported with submission-time feedback.

No new endpoint, migration, environment variable or demo template is introduced. Deploy matching API/frontend contracts when enabling these paths. Instructor practice selection/publication and a complete real-browser authoring-to-practice journey are now verified as described below.

## Practice and completion proof assignment admission

Owner assignment details now use the private library-version shape, including pinned reference definitions. This response is restricted to the owning instructor and is never reused for student content. The assignment contract permits proof-containing details in `ungraded_practice` or `completion_only` with `on_submission` feedback; objective definitions retain all existing assessment modes. Student reads use their separate redacted content/answer contracts.

The assignment store validates supported definitions against the effective assessment mode for creation, replacement, complete merged PATCH state, duplication, owner detail projection and publication. In particular, a policy-only PATCH cannot retain proofs while changing to graded mode or completion-only pre-submission feedback. Removing every proof and changing mode in the same PATCH is permitted when the resulting objective assignment is valid. Invalid transitions return `DERIVATION_ASSIGNMENT_MODE_UNAVAILABLE` and roll back metadata/items under the parent lock. Publication independently rechecks ownership, supported versions, nonempty content and class coverage; publication/edit races cannot produce a graded proof assignment. Existing published policy locks remain unchanged.

The picker includes published Fitch versions for practice and submission-feedback completion. Selected proofs disable graded mode until removed, with explanatory text. The ordered list shows their conclusion without automatically expanding the private reference. Failed saves retain selections and edits. Repeated publications get independent occurrence identities; duplication preserves pinned content in a fresh practice draft. Archived library publications remain usable, and later owner edits cannot change assigned rules, statements or reference proofs. Practice check timing remains explicit for proofs even when companion questions use immediate feedback. No seeded demo template is changed.

A real Chrome walkthrough now covers instructor UI authoring/publication, practice assignment selection/publication, role switching, student proof editing/manual checking, incomplete explicit save/reload, independently authorized reference reveal, Stay/Discard, separate repeated occurrences, hard reload and logout. Normal and demo HTTP tests create/publish through the owner API instead of bypassing assignment admission. Graded proof creation remains denied; completion proof creation requires feedback at submission.

## Completion-only policy and pure foundation

Confirmed on November 2, 2026: completion-only proofs require a **finished attempt**, even when logical mistakes remain. Proof diagnostics become visible only after submission, independently from reference/answer reveal. Completion acknowledges finished work without awarding correctness points; a checker report saying `needs_review` does not create a grading requirement for this score-free mode.

`isFinishedProofAttempt`, shared through `@logiclab/logic-engine/proof/completion`, implements the bounded Fitch filled-work rule separately from proof verification:

- Every line has nonblank formula text. Premise lines select an existing supplied premise; inference lines select a supported permitted rule and fill exactly its required number of line/subproof citations. Citation targets must exist.
- Step/block identities and nesting form an interpretable layout, every subproof has an explicit closing endpoint, and the actual last line is at root scope.
- That final formula parses and structurally matches the requested conclusion, allowing notation/grouping aliases but no implicit equivalence rewrites.
- It does not match inference patterns or establish valid support. Existing but wrong citations (including scope/order/repetition mistakes), wrong premise text and nonfinal syntax mistakes can remain for later diagnostics. Unused premises need not be copied into the proof. Empty work, blank fields, unavailable selections, missing targets, open/cyclic/malformed blocks and unsupported/resource-limited inputs are not finished attempts.

The helper returns only a boolean, with no correctness report, score or automatic proof check. The future frontend can use the same filled-work criterion to gate final submission without showing step-level diagnostics before submission. Existing draft saving still retains incomplete/incorrect work.

`proof_completion_v1` is a separate score-free result contract. Each completed proof contributes one response unit, independent of its step count, and retains occurrence/version-bound checker evidence for post-submission feedback. Objective companions retain their existing completion counts, without correctness feedback. Strict schemas require unique occurrences, at least one proof, completed item counts and consistent summary totals; keys, explanations, points and other injected fields are rejected.

The pure application `evaluateProofCompletion` validates trusted pinned occurrences and responses, requires every proof/objective answer to be finished, and only then creates fresh proof feedback. Incorrect but filled objective answers still complete their response units. It never compares work with the private reference, writes a submission or awards a grade. `validatedProofWork` now supplies the common identity/response stage to graded and completion evaluators without changing graded behavior.

Instructor inspection also retains actual verification independently from completion. Per-proof reports classify as **Completed — verified**, **Completed — errors found**, or **Completed — verification unavailable** through `proofCompletionVerification`. The compact `summary.proofVerification` counts verified/error/unavailable proofs for instructor list flags; schemas require these counts to match retained reports. A completed conclusion-only shortcut with an invalid rule/citation is therefore inspectable without losing completion status or receiving an automatic numerical grade. Flags do not infer effort or cheating, and unavailable verification must not be labeled an incorrect proof. Instructor list flags and detailed frozen diagnostics are available for final completion submissions. They do not expose unfinished drafts or private reference answers.

Exact database result types and validated retained-result projections support final score-free completion results. Student routes use the proof-aware saved-work entry, and owner review admits completion proof results while retaining the graded-proof guard. The shared finished-attempt helper supplies browser readiness without verifying inference correctness.

## Retained completion storage and projections

The database JSON union now includes the exact `ProofCompletionSubmissionResult` shape, with score-free counts, occurrence/version-bound reports and independent verification flags. No schema migration is needed: the existing submitted/result constraint requires a final timestamp, the score-state constraint already rejects point snapshots for completion tags, and the retained-submission trigger freezes answers, results, flags, revisions and deletion. Existing objective/graded result formats remain unchanged.

The proof-aware saved-attempt schema accepts `proof_completion_v1` only with a final timestamp and no awarded score. `retainedProofCompletion` validates stored report/count integrity and requires completion-only assessment state before any projection, without rerunning the checker. `attemptResponse` exposes this retained feedback after submission, without a score or pending-grade state, regardless of the independent answer-reveal state. Invalid assessment/final states, awarded points and inconsistent verification summaries fail closed; returned parsed data is detached from the retained record.

The `proofCompletionReviewResponse` supplies a compact instructor-list summary with verification flags plus saved student work and detailed retained diagnostics. Its caller must authorize the assignment owner and load the related student. It does not fetch or reveal the private reference/explanation, infer effort, award points or queue completion work for grading. Existing owner-scoped submission routes now use this projection for retained completion proof work. Lists include verification counts; detail uses redacted pinned content and frozen submitted proof/report data. Graded proof review remains guarded for 024.

Read-only result components can now display score-free completion counts and independent verification outcomes. The final-proof feedback selector recognizes completion reports while objective completion feedback remains absent. Completion readiness requires every occurrence to be finished and all edits saved before confirmation. The student editor offers no pre-submission Check proof for completion work. A finished but incorrect proof remains eligible; final diagnostics do not revoke completion.

Rebuild matching database-package/contracts/API/frontend outputs before consuming this format. Older applications cannot interpret the new JSON result; review application rollback compatibility without rewriting retained evidence. No user development database has been migrated or reset.

## Transactional completion proof work

The internal student store now reads and explicitly saves bounded incomplete completion proofs without checking them or returning diagnostics. `assertProofWorkPolicy` requires `on_submission` for completion proof work; legacy objective-only completion assistance remains unchanged, but proof-containing completion configurations with pre-submission checking fail closed. Student assignment content stays pinned and redacted.

Finalization uses the existing shared assignment/enrollment locks, attempt-row write lock and revision comparison. It requires every proof to satisfy the agreed finished-attempt rule and every objective response to be filled, then atomically stores fresh post-submission proof diagnostics, verification flags, score-free completion counts, timestamp and revision. Logical mistakes do not revoke completion, and no point score or pending-grade state is created. Repeated occurrences retain separate answers/reports. Missing/incomplete work leaves the saved draft untouched and rolls back any newly inserted attempt.

Retries return the frozen final even with an older revision, without rechecking or rewriting evidence. Late saves are denied. Caller/demo rollback and failed database final writes leave reports, answers, flags, timestamps and revisions unchanged. Concurrent save/submit operations serialize, and the retained result reflects whichever answer snapshot won the lock. Publication/archive and enrollment-removal waits recheck access before freezing work; archived or unenrolled requests cannot retrieve finals through a retry.

Reference reveal remains independent: `never` stays locked after submission; `after_submission` opens only after a final; `anytime` can reveal a reference without a draft or diagnostics; `instructor_release` opens only after the recorded answer release. Revealing or denying a reference does not alter completion or diagnostics. Later owner edits cannot change the pinned reference/statement. Graded reference access remains guarded.

Normal and demo HTTP tests create and publish completion proofs through the supported owner store, then exercise final/retry serialization and owner review with real stores. The owner list/detail boundary retains authorization, final-only selection, strict redaction and cross-visitor denial. No new endpoint, migration or demo template is introduced.

## Next branch after 022

Complete this student-work branch, then deliver `023-refactor-explicit-context-assembly` before resuming derivation features with `024-feat-derivation-grading-review`. The refactor will make named context properties map directly to focused stores, starting with `context.submissionReviews` rather than review methods hidden inside `context.assignments`. Preserve existing behavior, authorization and normal/demo transaction binding; see the [updated sequence](logical-derivations.md#023-explicit-context-assembly). This schedules work only and does not start another branch.

## Next delivery slices

1. Review and merge this branch after the normal review/CI process. Final documentation, verification evidence and the local PR draft are prepared; nothing has been published or merged by the agent.
2. Perform the agreed 023 context-assembly refactor, preserving behavior and normal/demo transaction binding, before resuming instructor grading/review in 024. Graded proof admission remains guarded.

Completion-only derivations now use the confirmed finished-attempt and post-submission diagnostic policy with score-free completion. Mixed practice assignments retain explicit **Check proof**, even when objective questions have immediate feedback; there is no automatic proof-error display.

## Slice 1 verification — November 2, 2026

`npm run check` passed type checks, 1,350 tests (357 engine, 725 API, 268 web) and production builds. The 26 new cases cover bounded/incomplete work, strict request/provenance fields, injected diagnostics/keys/scores, fresh report generation, source/input preservation, occurrence identity, target/rule binding, invalid upstream support, unused errors, unassessable outcomes and continued live-workflow rejection. Existing authoring/scoring/release tests passed after sharing public-content configuration validation.

Built ESM/CommonJS package smoke, formatting, whitespace and local Markdown file targets passed. No migration, persistence/HTTP/browser change or new external dependency is introduced; PostgreSQL checks and browser walkthroughs were not repeated for this pure foundation slice. No user development database was migrated/reset. Existing Jest VM-module advisories remain. No actual enrolled proof save/finalization, live practice endpoint, graded submission or review workflow is claimed yet.

## Slice 2 verification — November 2, 2026

`npm run check` passed type checks, 1,352 tests (357 engine, 727 API, 268 web) and production builds. Two new contract/type cases verify database/transport symmetry, proof JSON round trips, strict redaction and continued live HTTP rejection. Existing objective work, release and instructor review checks passed with the wider saved model.

`npm run db:test` passed 226 PostgreSQL checks (159 database, 67 API/workflow). Five new integration cases verify incomplete draft persistence/reload, independent occurrences/students, pinned redaction, instructor practice privacy, unsupported modes, stale revisions/type mismatch rollback, concurrent-save serialization, caller/demo rollback, cross-visitor denial and observed database waits before assignment archive/enrollment removal. Schema comparison and existing immutable-submission regressions passed.

Formatting, whitespace, built public-entry smoke and local Markdown targets passed. No migration, user development-database reset or browser change is introduced. Internal fixtures deliberately bypass guarded assignment authoring to test staged practice persistence; they are not a supported rollout path. No live enrolled-proof HTTP workflow or proof finalization is claimed. Existing Jest VM-module advisories remain.

## Slice 3 verification — November 2, 2026

`npm run check` passed type checks, 1,353 tests (357 engine, 728 API, 268 web) and production builds. One added contract case verifies distinct strict check/solution shapes, exclusion from active HTTP contracts and denial of check/solution payloads as saves.

`npm run db:test` passed 229 PostgreSQL checks (159 database, 70 API/workflow). Three added integration cases verify fresh unsaved checks without attempt creation/mutation, occurrence/version binding, reference policy independence, pinned proof/explanation retention after owner edits, outsider/foreign-item/archive denials and graded/completion guards. The existing demo case also verifies bound proof checking/reference access and cross-visitor denials alongside rollback. Existing objective work/release tests passed.

Built ESM/CommonJS public-entry smoke, formatting, whitespace and primary documentation file targets passed. No migration, browser change or user development-database reset is introduced. Internal staged fixtures remain distinct from a supported live proof workflow. No proof finalization, new release policy or instructor grading operation is enabled. Existing Jest VM-module advisories remain.

## Slice 4 verification — November 2, 2026

`npm run check` passed type checks, 1,371 tests (357 engine, 746 API, 268 web) and production builds. Eighteen new cases cover mixed weighted results, objective partial credit/rounding, full-credit proofs, missing/incorrect/unused-error/resource-limited proofs with pending totals, independent repeated occurrences, provenance and source preservation, response/identity mismatches, strict summary integrity and continued active result rejection.

`npm run db:test` passed 229 existing PostgreSQL checks (159 database, 70 API/workflow), including objective finalization/scoring regressions after the shared outcome extraction. No new database behavior is introduced in this pure slice. Built ESM/CommonJS public-entry smoke, formatting, whitespace and primary documentation file targets passed. No migration, browser change, new live submission format or user development-database reset is claimed. Existing Jest VM-module advisories remain.

## Slice 5 verification — November 2, 2026

`npm run check` passed type checks, 1,379 tests (357 engine, 754 API, 268 web) and production builds. Eight new projection/type cases cover exact database/transport symmetry, withheld reports/points despite answer reveal, accepted and pending-review release, submission-time release, malformed/missing score snapshots and unsupported final states. Active HTTP contracts still reject proof results; projection leaves retained evidence unchanged.

`npm run db:test` passed 237 PostgreSQL checks (167 database, 70 API/workflow). Eight new database cases cover accepted/review-needed JSON round trips, immutable submitted answers/results/points, required proof scores and score tags, rollback refusal over proof history, down/up preservation of objective snapshots and rejection under the older constraint. Schema comparison and existing objective/demo workflows passed.

Formatting and whitespace checks passed. No browser walkthrough was repeated for this storage-only slice. No user development database was migrated/reset; tests used the disposable test database. Proof finalization, live graded availability and instructor proof review remain guarded. Existing Jest VM-module advisories remain.

## Slice 6 verification — November 2, 2026

`npm run check` passed type checks, 1,379 tests (357 engine, 754 API, 268 web) and production builds. API type checking also passed after the final integration-test additions.

`npm run db:test` passed 244 PostgreSQL checks (167 database, 77 API/workflow). Seven new cases plus expanded demo coverage verify accepted and pending-review mixed finals, missing proofs without invented zero grades, pinned content after author edits, independent disclosure, immutable stale retries, submitted-save denial, revision/access/archive/completion guards, concurrent submit/save serialization, observed assignment/enrollment lock waits, failed database writes and caller rollback for both existing and newly created attempts. Demo coverage verifies full-credit finalization, retry, whole-request rollback and cross-visitor denial. Existing objective finalization and retention regressions passed.

Formatting and whitespace checks passed. No new migration or browser change is introduced in this slice; the previous proof-result migration remains required. Tests used the disposable test database, without migrating/resetting the user's development database. Live proof assignment admission, student HTTP/frontend rollout and instructor review remain guarded. No full product/browser QA is claimed; existing Jest VM-module advisories remain.

## Slice 7 verification — November 2, 2026

`npm run check` passed type checks, 1,387 tests (357 engine, 754 API, 276 web) and production builds. After the final unassessable-feedback case and small presentation cleanup, the full web suite passed 277 tests and its type-checked production build passed (1,388 tests across the unchanged engine/API suites and final web suite). Nine new student-panel cases cover explicit Fitch construction/checking, enabled labels, saved incomplete work and stable missing IDs, stale feedback hiding, dependency diagnostics, independent solutions, confirmed clearing, read-only/busy controls and unassessable feedback without a numerical grade. Existing private authoring/editor regression tests and relocated pure helper tests passed.

Formatting and whitespace checks passed. No backend, database, HTTP-contract or user-database changes were made, so PostgreSQL checks were not repeated. No browser/visual walkthrough was performed; jsdom component checks do not establish real focus behavior, mobile layout or an integrated save/navigation journey. The new panel remains staged and unconnected to the live assigned-work screen. Existing Jest VM-module advisories remain.

## Slice 8 verification — November 2, 2026

`npm run check` passed type checks, 1,408 tests (357 engine, 754 API, 297 web) and production builds. Twenty new cases cover proof baseline/reversion, independent occurrences, failed/successful saves, manual-only proof checks in mixed immediate work, late-response cancellation across edits/selection/save/reload/assignment/unmount, check failures without automatic retries and old-save denial after assignment changes. Screen tests cover Stay/Discard, conditional unload warnings, retained drafts across problem selection, explicit save/reload, separate solutions, protected finalization, read-only pending/released results and nonnumeric review totals. Normal/demo client cases validate scoped proof requests and strict redaction. The client tests passed a focused final rerun after extending their frozen-result and missing-score assertions.

Formatting and whitespace checks passed. No server runtime or database behavior changed, so PostgreSQL checks were not repeated. The browser tests use mocked transports/jsdom, not real HTTP proof routes or a real-browser walkthrough; native focus/unload behavior and mobile layout remain unverified for this integration. No development database was migrated/reset. Server proof HTTP admission, proof assignment publication, completion-only semantics and graded instructor review remain guarded. Existing Jest VM-module advisories remain.

## Slice 9 verification — November 2, 2026

`npm run check` passed type checks, 1,408 tests (357 engine, 754 API, 297 web) and production builds. API type checking also passed after the final HTTP integration assertions.

`npm run db:test` passed 246 PostgreSQL checks (167 database, 79 API/workflow). Two new real-API cases cover normal and demo scoped reads, saved incomplete proofs/reload, independent occurrences, fresh unsaved checks without writes, pinned content after owner edits, separate locked/allowed references, immutable revision behavior, no practice finalization, malformed/injected fields, origin/session checks, outsider/cross-visitor denial and archives. The cases also use internal graded fixtures to verify HTTP finalization, withheld grade receipts despite answer reveal, later nonnumeric review results and immutable retries. Existing retention, concurrency, transaction-failure and authoring-admission regressions passed.

Formatting and whitespace checks passed. Tests use Fastify injection with real stores and isolated disposable PostgreSQL schemas, not mocked student responses or a real-browser walkthrough. No user development database was migrated/reset, and no new schema change is introduced in this slice. Assignment authoring/publication, completion-only proof semantics and graded instructor review remain guarded. A full instructor-to-student proof journey is not claimed yet. Existing Jest VM-module advisories remain.

## Slice 10 verification — November 2, 2026

`npm run check` passed type checks, 1,415 tests (357 engine, 759 API, 299 web) and production builds. Seven new cases cover practice-only admission/contracts, actionable safe errors, mode-aware picker choices and failed-save retention/mode locks in the instructor form. API type checking passed again after removing the unused objective-only version projection; callers now validate admission separately and use the private owner projection.

`npm run db:test` passed 250 PostgreSQL checks (167 database, 83 API/workflow). Four new integration cases cover repeated/mixed practice versions, coverage, pinned private/redacted student projections, duplication/archive/restore, rejected creates and policy-only changes with full rollback, valid simultaneous proof removal/mode change, foreign ownership, independent publication guards and publication/edit races. Existing normal/demo HTTP cases now use actual owner assignment creation/publication before the student proof flow. Existing objective work and persistence regressions passed.

Focused headless Chrome against temporary local servers and an isolated disposable schema passed instructor UI proof authoring/check/save/publication, practice-only selection/mode controls and assignment publication; student manual-only checking, invalid/incomplete save/reload, separate reference reveal, Stay/Discard, repeated-occurrence identity, hard reload, no practice finalization, 390px overflow check, separate-visitor denial, logout, empty browser storage and no uncaught page errors. All application responses used real local APIs. Ignored evidence: `.codex-local/verification/derivation-student-work/slice10-browser.log` and `slice10-mobile.png`. Temporary processes/schema were cleaned up.

Formatting and whitespace checks passed. No migration, user development-database reset, new environment variable or demo template change is introduced. Match contracts/API/frontend builds for the broadened owner response shape. This is focused feature verification, not full product QA, a multi-browser/accessibility audit or hosted verification. Graded proof admission/instructor adjustment and completion-only proof semantics remain guarded; existing Jest VM-module advisories remain.

## Slice 11 verification — November 2, 2026

`npm run check` passed type checks, 1,445 tests (377 engine, 769 API, 299 web) and production builds. Thirty new cases cover finished-versus-verified work, retained logical/syntax/citation mistakes, missing fields and selections, block closure/layout, target aliases versus equivalence, raw version/resource/accessor guards, source preservation, mixed score-free completion/provenance, incomplete companion responses, independent occurrences, strict counts and rejected report/key/score injection. The active result/storage contracts continue rejecting the staged completion tag.

`npm run db:test` passed 250 existing PostgreSQL checks (167 database, 83 API/workflow), including graded finalization and practice admission after the shared validation extraction. Built ESM/CommonJS package-entry smoke passed. Formatting and whitespace checks passed.

No migration, database JSON union, endpoint, browser behavior or new external dependency was added; no user development database was migrated/reset. A browser walkthrough was not repeated for this pure slice. Completion-only proof admission remains guarded until storage/disclosure/UI integration; no completed proof submission can use this staged format yet. Existing Jest VM-module advisories remain.

### Completion verification follow-up

The user confirmed that actual proof verification should flag finished but incorrect work for instructor inspection while leaving completion credit independent. Added report-derived per-proof classification and validated aggregate verification counts to the staged completion result. Three additional cases cover a conclusion-only self-citation shortcut versus verified work, a real checker resource-limit outcome retaining completion, mixed occurrence flags and rejection of summaries that conceal errors.

After this follow-up, the contracts build, API type check and 31 focused completion/graded-proof tests passed; formatting and whitespace checks passed. The prior full-suite and PostgreSQL results above were not rerun for this pure result-summary change. Instructor UI/storage admission is still pending; no live instructor flag display or new database behavior is claimed yet.

## Slice 12 verification — November 2, 2026

`npm run check` passed type checks, 1,458 tests (377 engine, 781 API, 300 web) and production builds. Ten new projection/display cases cover exact database/transport type symmetry, retained verified/error/unavailable flags and diagnostics, independent answer reveal, no points or pending-grade state, invalid/premature assessment states, inconsistent flags, detached parsed data, final score-free schema requirements and read-only completion rendering without objective correctness or awarded points. The foundation test now accepts valid final completion snapshots through the proof-aware contract; objective root/instructor contracts remain guarded.

`npm run db:test` passed 257 PostgreSQL checks (174 database, 83 API/workflow). Seven new database cases cover lossless completion/report/flag round trips for all three verification outcomes, existing point-score and premature-result constraint rejection, immutable submitted answers/results/revisions/deletion and caller rollback. Schema comparison and existing graded/objective/demo regressions passed, with no migration or snapshot changes.

Formatting and whitespace checks passed. No browser walkthrough was repeated for staged retained-result display; jsdom checks do not establish a live completion submission or instructor-review journey. Tests used the disposable test database; no user development database was migrated/reset. Transactional completion proof submission, UI readiness, instructor route integration and assignment admission remain guarded. Existing Jest VM-module advisories remain.

## Slice 13 verification — November 2, 2026

`npm run check` passed type checks, 1,458 tests (377 engine, 781 API, 300 web) and production builds. Existing objective/graded behavior passed with the new completion finalization branch and the broader completion error message.

`npm run db:test` passed 264 PostgreSQL checks (174 database, 90 API/workflow). Seven new integration cases cover normal/demo HTTP read/save/finalization, hidden draft diagnostics, empty/incomplete proof and objective rejection without writes, score-free completed mistakes with independent verification flags, pinned content after author edits, every supported reference-release policy, denial of unsupported completion feedback policies, immutable stale retries and submitted-save denial. They also cover caller/database-write failure, demo transaction rollback, concurrent save/submit snapshot consistency and observed archive/enrollment lock waits with access rechecks. Existing practice, graded, retention and demo regressions passed.

Formatting and whitespace checks passed. Tests use real local stores/Fastify routes and isolated disposable PostgreSQL schemas, not a browser walkthrough or live Cognito flow. No new migration, user development-database reset, environment variable or demo template change was introduced. Completion-only assignment admission, frontend readiness and instructor routes/displays remain guarded pending integration; no public completion-proof journey is claimed. Existing Jest VM-module advisories remain.

## Slice 14 verification — November 2, 2026

Completion-only proof assignments are now enabled through owner authoring/publication, student readiness/finalization and owner review. The full effective policy is checked on create, replacement, policy-only PATCH, duplication and publication: proofs require practice or completion with `on_submission` feedback. Graded proof admission remains guarded. The form/picker allows completion and resets its feedback timing to submission; proof-containing drafts cannot switch to graded mode until proofs are removed.

The browser uses the shared bounded finished-attempt predicate, not inference verification, to gate completion. Every occurrence must be finished and all edits saved before final confirmation. Completion exposes no pre-submission Check proof, and submitted work is read-only. Owner lists show separate verified/error/unavailable counts; detail renders the frozen proof and diagnostics without points, private references or unfinished drafts. Strict owner review contracts admit final completion proofs while retaining the graded-proof guard.

`npm run check` passed type checks, 1,471 tests (377 engine, 790 API, 304 web) and production builds. New/expanded tests cover completion authoring and policy transitions, per-occurrence readiness with invalid-but-finished inference, missing targets/citations, explicit saves, hidden draft checks, post-submission diagnostics, owner read-only flags including verification unavailable, and rejected premature/score-bearing/private/mismatched review projections.

`npm run db:test` passed 266 PostgreSQL checks (174 database, 92 API/workflow). Normal/demo completion cases now create/publish through the supported assignment store. New real-HTTP owner review cases verify final-only lists, retained answers/reports, score/reference redaction, student/foreign-owner/cross-visitor denial and unchanged evidence after private draft edits. Existing finalization, rollback, concurrency, retention, practice and objective regressions passed.

Focused headless Chrome against temporary real local APIs and an isolated schema verified UI proof authoring/publication and completion assignment publication, two independent proof occurrences, finished incorrect work with no draft diagnostics, explicit saves/confirmation, score-free submission, post-submission feedback, owner flags/read-only review, independent instructor answer reveal, unchanged final evidence, 390px overflow, logout, empty browser storage and no uncaught page errors. All application responses used real APIs. The walkthrough caught a missing Vite development prebundle entry for `@logiclab/logic-engine/proof/completion`; adding it fixed the student-page import failure, and the complete walkthrough passed on rerun. Ignored evidence: `.codex-local/verification/derivation-student-work/slice14-browser.log` and `slice14-mobile.png`. Temporary processes/schema were cleaned up.

Formatting and whitespace checks passed. No migration, new environment variable, demo template change or user development-database reset was introduced. Rebuild matching contracts/API/frontend outputs and restart Vite to pick up its prebundle configuration. This is focused feature verification, not exhaustive product QA, a multi-browser/accessibility audit, hosted verification or a live Cognito journey. Graded proof authoring/review/adjustment remains deferred to 024; existing Jest VM-module advisories remain. Broad branch documentation and PR preparation remain for the finishing pass.

## Branch closeout — November 2, 2026

Final repeated checks passed: `npm run check` (1,471 tests, type checks/builds), `npm run db:test` (266 PostgreSQL checks), formatting, branch/working-tree whitespace and 326 local Markdown file targets. Existing real-API browser evidence from slices 10 and 14 was consolidated rather than repeated for documentation-only changes. API/data/architecture/setup/roadmap guidance, optional demo instructions and focused manual QA cases now describe the supported practice/completion boundary. The [verification record](../verification/derivation-student-work-verification.md) includes the mobile screenshot, rollout and material limits. The local PR draft is `.codex-local/pr/022-feat-derivation-student-work.md`; it is ignored by Git. Nothing was staged, committed, published, merged or provisioned by the agent. The agreed next branch remains 023 explicit context assembly, then 024 instructor grading/review.
