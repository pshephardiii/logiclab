# Derivation student work

Status: six slices of `022-feat-derivation-student-work` are implemented: staged proof contracts/evaluation, practice-only draft persistence/redaction and transient proof checking with independently authorized reference access, plus graded-result/scoring foundations and compatible retained-result storage/projections and transactional graded finalization. Live assignment authoring/student HTTP contracts still reject derivations. Internal graded saves/reads/finalization are now supported; live graded availability and completion-only proof work remain guarded. See [the agreed sequence](logical-derivations.md#022-student-work-and-finalization) and [private authoring](derivation-authoring.md) for the existing boundaries.

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

`@logiclab/contracts/saved-student-work` describes the combined saved-response/attempt/assignment projections for existing work and proof drafts. The database JSON response union matches these types exactly and shares a format-specific Fitch proof shape with private references. Proof drafts require no database column changes; retained graded proof results now require the migration described below. Current root HTTP contracts remain narrower; they do not silently omit proof work or expose unsupported payloads to old consumers.

The existing student store's `read`/`save` methods support proof drafts for practice and staged graded assignments. Completion-only proof work remains unsupported. They retain shared assignment/enrollment locks, occurrence membership checks, submitted-work denial, attempt-row locking and revision comparisons. Incomplete/incorrect work is shape-validated, saved under the occurrence ID and returned without checker feedback, results or points. Separate occurrences and students keep separate work. Proof configuration is validated against supported semantics, and reads project only pinned statement/rule content: no reference or explanation. Later owner draft edits cannot change the pinned statement.

Ordinary calls own their transaction; demo/request-scoped calls join the supplied workspace transaction. Failed validation/revisions and caller failures roll back writes. Saves waiting behind archive/enrollment removal recheck access before writing. Existing submitted-record retention is unchanged; graded proof finalization is supported internally as described below. Instructor practice review remains private/unavailable. Objective finalization/review still validates its narrower answer union rather than dropping proof fields.

This is internal persistence support, not rollout authorization: live create/publication/save/read schemas and the frontend cannot yet accept assigned proofs. Do not seed these staged assignment fixtures into user-facing data. Completion-only semantics and live HTTP/frontend admission remain separate work; internal graded finalization does not enable user-facing proof assignment publication.

## Staged practice checking and reference access

The existing store's `check` method now accepts proof responses for assigned practice. It enforces enrollment, published/nonarchived assignment access, check capability, attempt state and occurrence membership before evaluating current unsaved work. The statement, enabled rules and version ID come from the pinned server publication. Checks create no attempt, do not save the submitted proof and do not change revisions, results, scores or update timestamps. An incorrect saved proof and a different checked proof remain separate. A later owner draft edit cannot change the checked statement. The same workspace-bound methods deny cross-visitor calls.

`solution` separately enforces the existing answer-access policy and practice-only rollout guard before projecting the accepted pinned reference/explanation. `never` stays locked even when checking is allowed; `anytime` permits reference access independently of proof correctness or whether a draft exists. Revealing a reference does not save work or release feedback/grades. Neither response contains the other's private fields. These operations reuse existing assignment/enrollment locks and transaction binding.

The staged saved-work entry now includes strict check request/response and solution response schemas for all supported work variants. Active HTTP schemas remain narrower; checks, responses and solutions cannot be passed as save requests. Graded proof checks remain locked, and completion-only proof checking/reference access remain unsupported even where the older general policy allows them. This slice changes no policy, migration or frontend behavior and performs no automatic proof checks.

## Staged graded-result and scoring foundation

`@logiclab/contracts/proof-submission` defines `proof_mixed_v1` for graded assignments containing at least one proof. Each proof retains its occurrence/version-bound checker evidence; objective items retain their existing correctness feedback. The summary separates objective response-unit counts from accepted/review/unassessable proof counts rather than treating a whole proof as one truth-table cell. Strict validation rejects duplicate occurrences, inconsistent totals and injected score fields. Objective-only assignments continue using the existing result formats.

`evaluateProofSubmission` takes caller-loaded authoritative occurrences and student responses, validates membership/identity/type boundaries, evaluates proofs against pinned redacted statements and reuses objective evaluation. Missing proof work is checked as an empty proof, not assigned an invented zero. It preserves occurrence order and source data, accepts alternate correct routes without comparing private references and keeps unused errors and resource-limit outcomes in the report.

`scoreProofSubmission` consumes freshly computed server evidence and authoritative allocations. Accepted proofs earn their full allocation. Incorrect, incomplete, unused-error or unassessable proofs have `needs_review` with null earned points; any such item keeps assignment earned points/percentage null. Objective items retain their normal weighted correctness and rounding, using the shared objective-outcome calculation. Proofs receive no numerical automatic partial credit. Checker evidence remains separate from later instructor-awarded grading. Pending review is also distinct from withheld grade release (`gradePending`).

The staged saved-attempt contract and database now support this result format, and transactional graded proof finalization is supported internally. Active HTTP result/attempt contracts remain narrower. Graded availability stays guarded through 024 review; no completion-only semantics are implied by this graded format. Callers must authorize and recompute under the assignment/attempt transaction rather than accepting a client result or cached check.

## Retained proof results and disclosure

The database JSON types now describe the exact versioned proof report, occurrence-bound evidence and mixed result. `Migration20261102120000` permits `proof_mixed_v1` point snapshots and requires a score for retained proof results. Existing final-answer/result/score immutability remains enforced. The migration does not rewrite objective results or awarded points; rollback locks the table and refuses while any retained proof results exist.

Apply this migration before future code writes proof finals, and rebuild matching contracts/database/API consumers. No user development database has been migrated or reset by this slice. Database constraints establish storage state and format tags; strict application contracts validate report shape and summary integrity.

The staged student projection validates retained proof-score arithmetic and pending-review state without rerunning the checker, replacing evidence or writing a new grade. It withholds both reports and points until the independent grade-release policy permits them, even if answers have already been revealed. Released review-needed work retains null earned totals/percentage; grade release and instructor review remain separate states. Missing/inconsistent snapshots or proof results in an unsupported assessment state fail closed.

Active root student and instructor-review contracts remain narrower. Instructor review explicitly validates its supported result/summary shapes rather than leaking staged proof results through an older response. Full instructor proof review belongs to 024. These changes provide compatible storage for staged finalization, not a user-facing proof submission workflow.

## Transactional graded finalization

The internal student store now accepts revisioned graded proof drafts and reads their redacted pinned content. Its `submit` operation detects proof-containing graded assignments, evaluates saved responses using the authoritative occurrence/version definitions and freezes `proof_mixed_v1` evidence and point scores together with the submission timestamp and incremented revision. Objective-only graded/completion workflows retain their result formats. Completion-only proof submission remains unsupported; practice still has no final submission.

Shared assignment/enrollment locks prevent archive/removal races, and the existing attempt upsert/write lock serializes concurrent saves/submissions. A first finalization requires the current revision. Once finalized, retries return the retained attempt rather than checking/regrading again, including retries with an older revision. Authorizing the current enrollment/assignment still precedes retries. Later library draft edits cannot change pinned evaluation or retained results.

Accepted proofs receive full allocation. Missing/incomplete/incorrect proofs retain checker evidence and pending-review points rather than automatic zero or partial credit. Mixed objective items retain their own weighted results while unresolved proofs keep assignment earned totals/percentage null. The proof response itself is not overwritten with a reference or a synthesized empty answer. Grade release controls report/point disclosure independently from answer reveal, including on immutable retries. Pre-submission graded proof checking remains locked; graded reference access and the instructor review workflow remain guarded pending their dependent slices.

Database write failures and caller/demo transaction failures roll back answers, reports, points, timestamps, revisions and any newly inserted attempt. Demo calls use the existing workspace-bound manager and deny other visitors. This enables only internal staged fixtures: live assignment admission, student HTTP contracts and frontend consumers still exclude derivations. Do not introduce live graded proofs before 024 review can resolve flagged submissions. The current frozen automatic-score validator is not yet an instructor adjustment workflow.

## Next branch after 022

Complete this student-work branch, then deliver `023-refactor-explicit-context-assembly` before resuming derivation features with `024-feat-derivation-grading-review`. The refactor will make named context properties map directly to focused stores, starting with `context.submissionReviews` rather than review methods hidden inside `context.assignments`. Preserve existing behavior, authorization and normal/demo transaction binding; see the [updated sequence](logical-derivations.md#023-explicit-context-assembly). This schedules work only and does not start another branch.

## Next delivery slices

1. Deliver student editing, explicit saves/navigation protection and read-only final work. Keep graded authoring/publication/student availability guarded through the complete 022–024 instructor-review milestone; internal fixtures may exercise staged paths. Settle completion-only semantics before enabling proofs in that mode. Keep private reference/explanation access independent from student-specific feedback and grade release; never feed owner DTOs directly to student editors.

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
