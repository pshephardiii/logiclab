# Derivation student work

Status: ten slices of `022-feat-derivation-student-work` are implemented. Instructors can now select and publish Fitch proofs in ungraded practice assignments, and students can explicitly save/check them and reveal references only under the configured policy. Normal/demo HTTP and browser flows are verified. Graded finalization/disclosure remains internal groundwork, with graded assignment admission guarded until 024 instructor review; completion-only proof semantics remain unresolved. See [the agreed sequence](logical-derivations.md#022-student-work-and-finalization) and [private authoring](derivation-authoring.md) for the existing boundaries.

## Student work versus private authored content

The separate `@logiclab/contracts/derivation-work` entry contains:

- `DerivationAnswer`: `{ type: "derivation", proof }`, using the existing bounded, versioned Fitch serialization. Empty steps/blocks are an explicit empty response; no answer is distinct from a response with an empty proof. Missing references, unfinished blocks, bad formulas and logically incorrect steps remain saveable within transport limits.
- `SaveDerivationAnswers`: `{ revision, itemId, answers }`, using the existing nonnegative revision bounds. The request cannot choose a problem version, owner, workspace, permitted rule set or replacement statement.
- `CheckDerivationAnswers`: `{ itemId, answers }`, for future transient explicit checking, with no save/revision mutation implied.
- `DerivationCheckFeedback`: `{ type: "derivation", report }`, containing student-specific diagnostics without the private reference/explanation.
- `DerivationEvaluationEvidence`: `{ evaluationVersion: "derivation_v1", type: "derivation", itemId, problemVersionId, report }`. Server-supplied occurrence/version provenance and the full versioned checker report are retained separately from the student's proof and awarded grading. This is an evidence component, not a new live submission-result format.

All shapes are strict. Student answers cannot inject a report, acceptance flag, reference proof, explanation or score. Shape validation is not proof acceptance, authorization or a signature on checker evidence. Future callers must generate evidence themselves, never trust a client-supplied report. The contracts are not re-exported through the active root student-work union, avoiding accidental route/frontend admission before compatible workflows exist.

## Pure application boundary

`validateDerivationAnswer` validates bounded transport and returns independently parsed data without running the checker. Saving incorrect/incomplete work must not grade it or reveal diagnostics. It rejects invalid transport with the existing `invalid_answer` application failure.

`evaluateDerivationAnswer` receives a trusted occurrence ID, pinned published-version ID, redacted `DerivationContent` and an untrusted student answer. The caller must first enforce enrollment, workspace/ownership, assignment policy and permission to see checking feedback; this helper performs none of that authorization and writes nothing. The authoritative statement/rules must come from the pinned server publication, never the check request. Full private owner definitions are rejected at this boundary. Content validation shares supported catalog/version checks with authoring without inspecting or comparing the private reference.

The checker retains distinct local/dependency validity, target state and accepted/review/unassessable outcomes. An unused error still requires review; locally valid work can retain invalid upstream support. Unassessable evidence remains explicit and contains no guessed zero or partial score. The scoring/finalization stages below map evidence to full credit, pending review and assignment totals; instructor-awarded adjustments remain later review work. This foundation enables no grade release, reference reveal or completion-only policy.

## Staged persistence and projections

`@logiclab/contracts/saved-student-work` describes the combined saved-response/attempt/assignment projections for existing work and proof drafts. The database JSON response union matches these types exactly and shares a format-specific Fitch proof shape with private references. Proof drafts require no database column changes; retained graded proof results now require the migration described below. The original root-exported objective contracts remain narrower; student routes now explicitly choose the compatible proof-aware saved-work entry rather than silently omitting proof data.

The existing student store's `read`/`save` methods support proof drafts for practice and staged graded assignments. Completion-only proof work remains unsupported. They retain shared assignment/enrollment locks, occurrence membership checks, submitted-work denial, attempt-row locking and revision comparisons. Incomplete/incorrect work is shape-validated, saved under the occurrence ID and returned without checker feedback, results or points. Separate occurrences and students keep separate work. Proof configuration is validated against supported semantics, and reads project only pinned statement/rule content: no reference or explanation. Later owner draft edits cannot change the pinned statement.

Ordinary calls own their transaction; demo/request-scoped calls join the supplied workspace transaction. Failed validation/revisions and caller failures roll back writes. Saves waiting behind archive/enrollment removal recheck access before writing. Existing submitted-record retention is unchanged; graded proof finalization is supported internally as described below. Instructor practice review remains private/unavailable. Objective finalization/review still validates its narrower answer union rather than dropping proof fields.

Assignment create/publication now admits proofs only for ungraded practice. Do not seed staged graded fixtures into user-facing data. Completion-only semantics and instructor grading/review remain separate work; internal graded finalization does not enable graded proof assignment publication.

## Staged practice checking and reference access

The existing store's `check` method now accepts proof responses for assigned practice. It enforces enrollment, published/nonarchived assignment access, check capability, attempt state and occurrence membership before evaluating current unsaved work. The statement, enabled rules and version ID come from the pinned server publication. Checks create no attempt, do not save the submitted proof and do not change revisions, results, scores or update timestamps. An incorrect saved proof and a different checked proof remain separate. A later owner draft edit cannot change the checked statement. The same workspace-bound methods deny cross-visitor calls.

`solution` separately enforces the existing answer-access policy and practice-only rollout guard before projecting the accepted pinned reference/explanation. `never` stays locked even when checking is allowed; `anytime` permits reference access independently of proof correctness or whether a draft exists. Revealing a reference does not save work or release feedback/grades. Neither response contains the other's private fields. These operations reuse existing assignment/enrollment locks and transaction binding.

The staged saved-work entry now includes strict check request/response and solution response schemas for all supported work variants. Student routes now opt into these proof-aware schemas; checks, responses and solutions cannot be passed as save requests. Graded proof checks remain locked, and completion-only proof checking/reference access remain unsupported even where the older general policy allows them. This slice changes no policy, migration or frontend behavior and performs no automatic proof checks.

## Staged graded-result and scoring foundation

`@logiclab/contracts/proof-submission` defines `proof_mixed_v1` for graded assignments containing at least one proof. Each proof retains its occurrence/version-bound checker evidence; objective items retain their existing correctness feedback. The summary separates objective response-unit counts from accepted/review/unassessable proof counts rather than treating a whole proof as one truth-table cell. Strict validation rejects duplicate occurrences, inconsistent totals and injected score fields. Objective-only assignments continue using the existing result formats.

`evaluateProofSubmission` takes caller-loaded authoritative occurrences and student responses, validates membership/identity/type boundaries, evaluates proofs against pinned redacted statements and reuses objective evaluation. Missing proof work is checked as an empty proof, not assigned an invented zero. It preserves occurrence order and source data, accepts alternate correct routes without comparing private references and keeps unused errors and resource-limit outcomes in the report.

`scoreProofSubmission` consumes freshly computed server evidence and authoritative allocations. Accepted proofs earn their full allocation. Incorrect, incomplete, unused-error or unassessable proofs have `needs_review` with null earned points; any such item keeps assignment earned points/percentage null. Objective items retain their normal weighted correctness and rounding, using the shared objective-outcome calculation. Proofs receive no numerical automatic partial credit. Checker evidence remains separate from later instructor-awarded grading. Pending review is also distinct from withheld grade release (`gradePending`).

The staged saved-attempt contract and database now support this result format, and transactional graded proof finalization is supported internally. Student HTTP result/attempt responses now opt into the compatible saved-work contracts; the original root exports remain narrower. Graded availability stays guarded through 024 review; no completion-only semantics are implied by this graded format. Callers must authorize and recompute under the assignment/attempt transaction rather than accepting a client result or cached check.

## Retained proof results and disclosure

The database JSON types now describe the exact versioned proof report, occurrence-bound evidence and mixed result. `Migration20261102120000` permits `proof_mixed_v1` point snapshots and requires a score for retained proof results. Existing final-answer/result/score immutability remains enforced. The migration does not rewrite objective results or awarded points; rollback locks the table and refuses while any retained proof results exist.

Apply this migration before future code writes proof finals, and rebuild matching contracts/database/API consumers. No user development database has been migrated or reset by this slice. Database constraints establish storage state and format tags; strict application contracts validate report shape and summary integrity.

The staged student projection validates retained proof-score arithmetic and pending-review state without rerunning the checker, replacing evidence or writing a new grade. It withholds both reports and points until the independent grade-release policy permits them, even if answers have already been revealed. Released review-needed work retains null earned totals/percentage; grade release and instructor review remain separate states. Missing/inconsistent snapshots or proof results in an unsupported assessment state fail closed.

Active root student and instructor-review contracts remain narrower. Instructor review explicitly validates its supported result/summary shapes rather than leaking staged proof results through an older response. Full instructor proof review belongs to 024. These changes provide compatible storage for staged finalization, not a user-facing proof submission workflow.

## Transactional graded finalization

The internal student store now accepts revisioned graded proof drafts and reads their redacted pinned content. Its `submit` operation detects proof-containing graded assignments, evaluates saved responses using the authoritative occurrence/version definitions and freezes `proof_mixed_v1` evidence and point scores together with the submission timestamp and incremented revision. Objective-only graded/completion workflows retain their result formats. Completion-only proof submission remains unsupported; practice still has no final submission.

Shared assignment/enrollment locks prevent archive/removal races, and the existing attempt upsert/write lock serializes concurrent saves/submissions. A first finalization requires the current revision. Once finalized, retries return the retained attempt rather than checking/regrading again, including retries with an older revision. Authorizing the current enrollment/assignment still precedes retries. Later library draft edits cannot change pinned evaluation or retained results.

Accepted proofs receive full allocation. Missing/incomplete/incorrect proofs retain checker evidence and pending-review points rather than automatic zero or partial credit. Mixed objective items retain their own weighted results while unresolved proofs keep assignment earned totals/percentage null. The proof response itself is not overwritten with a reference or a synthesized empty answer. Grade release controls report/point disclosure independently from answer reveal, including on immutable retries. Pre-submission graded proof checking remains locked; graded reference access and the instructor review workflow remain guarded pending their dependent slices.

Database write failures and caller/demo transaction failures roll back answers, reports, points, timestamps, revisions and any newly inserted attempt. Demo calls use the existing workspace-bound manager and deny other visitors. Practice proof assignment admission and student HTTP/frontend flows are now supported; graded and completion-only admission remains guarded. Do not introduce live graded proofs before 024 review can resolve flagged submissions. The current frozen automatic-score validator is not yet an instructor adjustment workflow.

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

The frontend and student HTTP endpoints now participate in the supported instructor-to-student practice proof flow. Graded availability remains guarded until 024 and completion-only proof semantics remain unresolved; do not seed unsupported graded assignments into user-facing data. Graded reference access also remains guarded in persistence. No autosaving or browser-storage recovery is introduced.

## Proof-aware student HTTP routes

Read, explicit save/check, solution and final-submission handlers now use `@logiclab/contracts/saved-student-work` for the corresponding proof-aware requests/responses. Paths, instructor/student authentication, enrollment scoping, origin checks, no-store headers, rate limits and demo workspace transaction binding remain unchanged. Requests accept only responses and occurrence/revision data, never replacement statements, report claims, reference proofs or awarded points. The store still loads the authoritative pinned version and enforces the assignment policy before checking or revealing a solution.

Practice proof saves accept bounded incomplete work, retain revision conflicts and keep separate occurrences independent. Checks use current unsaved work without attempt creation or writes; private reference/explanation access is independently controlled. Later owner edits cannot alter the pinned reference. Practice has no final submission (the existing 403 response is preserved). Normal and demo routes deny outsiders/other visitors and archived work.

Graded HTTP projections are tested only with internal fixtures: a withheld final receipt carries neither report nor points, independent answer reveal does not release them, and later authorized grade release exposes retained review-needed reports with nonnumeric totals. Final retries return the retained evidence rather than regrading. Graded pre-submission checks and reference access retain their existing guards. This does not enable graded proof assignment creation or instructor review, and completion-only proofs remain unsupported.

No new endpoint, migration, environment variable or demo template is introduced. Deploy matching API/frontend contracts when enabling these paths. Instructor practice selection/publication and a complete real-browser authoring-to-practice journey are now verified as described below.

## Practice-proof assignment admission

Owner assignment details now use the private library-version shape, including pinned reference definitions. This response is restricted to the owning instructor and is never reused for student content. The assignment contract permits proof-containing details only in `ungraded_practice`; objective definitions retain all existing assessment modes. Student reads use their separate redacted content/answer contracts.

The assignment store validates supported definitions against the effective assessment mode for creation, replacement, complete merged PATCH state, duplication, owner detail projection and publication. In particular, a policy-only PATCH cannot retain proofs while changing to graded/completion-only mode. Removing every proof and changing mode in the same PATCH is permitted when the resulting objective assignment is valid. Invalid transitions return `DERIVATION_ASSIGNMENT_MODE_UNAVAILABLE` and roll back metadata/items under the parent lock. Publication independently rechecks ownership, supported versions, nonempty content and class coverage; publication/edit races cannot produce a graded proof assignment. Existing published policy locks remain unchanged.

The picker includes published Fitch versions only in practice mode. Selected proofs keep other assessment-mode options disabled until removed, with explanatory text. The ordered list shows their conclusion without automatically expanding the private reference. Failed saves retain selections and edits. Repeated publications get independent occurrence identities; duplication preserves pinned content in a fresh practice draft. Archived library publications remain usable, and later owner edits cannot change assigned rules, statements or reference proofs. Practice check timing remains explicit for proofs even when companion questions use immediate feedback. No seeded demo template is changed.

A real Chrome walkthrough now covers instructor UI authoring/publication, practice assignment selection/publication, role switching, student proof editing/manual checking, incomplete explicit save/reload, independently authorized reference reveal, Stay/Discard, separate repeated occurrences, hard reload and logout. Normal and demo HTTP tests create/publish through the owner API instead of bypassing assignment admission. Graded and completion-only proof creation remain denied.

## Next branch after 022

Complete this student-work branch, then deliver `023-refactor-explicit-context-assembly` before resuming derivation features with `024-feat-derivation-grading-review`. The refactor will make named context properties map directly to focused stores, starting with `context.submissionReviews` rather than review methods hidden inside `context.assignments`. Preserve existing behavior, authorization and normal/demo transaction binding; see the [updated sequence](logical-derivations.md#023-explicit-context-assembly). This schedules work only and does not start another branch.

## Next delivery slices

1. Settle completion-only proof semantics and feedback behavior before enabling that mode; preserve score-free completion. Keep graded authoring/publication/student availability guarded through the complete 022–024 instructor-review milestone. Consolidate remaining branch documentation and verification before completion, then perform the agreed 023 context-assembly refactor before resuming instructor review in 024.

Before enabling completion-only derivations, settle what counts as completed proof work and the permitted feedback behavior while preserving score-free completion. Also settle mixed immediate-feedback assignments: the agreed proof interaction is explicit **Check proof**, rather than automatic proof-error display. Neither checkpoint blocks the current transport/evaluation foundation.

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
