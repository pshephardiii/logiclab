# Derivation student work

Status: two slices of `022-feat-derivation-student-work` are implemented: staged proof contracts/evaluation plus practice-only draft persistence and redacted projections. Live assignment authoring/student HTTP contracts still reject derivations. Graded and completion-only proof saves/reads remain guarded. See [the agreed sequence](logical-derivations.md#022-student-work-and-finalization) and [private authoring](derivation-authoring.md) for the existing boundaries.

## Student work versus private authored content

The separate `@logiclab/contracts/derivation-work` entry contains:

- `DerivationAnswer`: `{ type: "derivation", proof }`, using the existing bounded, versioned Fitch serialization. Empty steps/blocks are an explicit empty response; no answer is distinct from a response with an empty proof. Missing references, unfinished blocks, bad formulas and logically incorrect steps remain saveable within transport limits.
- `SaveDerivationAnswers`: `{ revision, itemId, answers }`, using the existing nonnegative revision bounds. The request cannot choose a problem version, owner, workspace, permitted rule set or replacement statement.
- `CheckDerivationAnswers`: `{ itemId, answers }`, for future transient explicit checking, with no save/revision mutation implied.
- `DerivationEvaluationEvidence`: `{ evaluationVersion: "derivation_v1", type: "derivation", itemId, problemVersionId, report }`. Server-supplied occurrence/version provenance and the full versioned checker report are retained separately from the student's proof and awarded grading. This is an evidence component, not a new live submission-result format.

All shapes are strict. Student answers cannot inject a report, acceptance flag, reference proof, explanation or score. Shape validation is not proof acceptance, authorization or a signature on checker evidence. Future callers must generate evidence themselves, never trust a client-supplied report. The contracts are not re-exported through the active root student-work union, avoiding accidental route/frontend admission before compatible workflows exist.

## Pure application boundary

`validateDerivationAnswer` validates bounded transport and returns independently parsed data without running the checker. Saving incorrect/incomplete work must not grade it or reveal diagnostics. It rejects invalid transport with the existing `invalid_answer` application failure.

`evaluateDerivationAnswer` receives a trusted occurrence ID, pinned published-version ID, redacted `DerivationContent` and an untrusted student answer. The caller must first enforce enrollment, workspace/ownership, assignment policy and permission to see checking feedback; this helper performs none of that authorization and writes nothing. The authoritative statement/rules must come from the pinned server publication, never the check request. Full private owner definitions are rejected at this boundary. Content validation shares supported catalog/version checks with authoring without inspecting or comparing the private reference.

The checker retains distinct local/dependency validity, target state and accepted/review/unassessable outcomes. An unused error still requires review; locally valid work can retain invalid upstream support. Unassessable evidence remains explicit and contains no guessed zero or partial score. Mapping evidence to full credit, pending review and assignment totals belongs to later finalization/review slices. This foundation enables no grade release, reference reveal or completion-only policy.

## Staged persistence and projections

`@logiclab/contracts/saved-student-work` describes the combined saved-response/attempt/assignment projections for existing work and proof drafts. The database JSON response union matches these types exactly and shares a format-specific Fitch proof shape with private references. No database column, constraint, migration or snapshot changes are needed. Current root HTTP contracts remain narrower; they do not silently omit proof work or expose unsupported payloads to old consumers.

The existing student store's `read`/`save` methods support proof drafts only for `ungraded_practice`. They retain shared assignment/enrollment locks, occurrence membership checks, submitted-work denial, attempt-row locking and revision comparisons. Incomplete/incorrect work is shape-validated, saved under the occurrence ID and returned without checker feedback, results or points. Separate occurrences and students keep separate work. Proof configuration is validated against supported semantics, and reads project only pinned statement/rule content: no reference or explanation. Later owner draft edits cannot change the pinned statement.

Ordinary calls own their transaction; demo/request-scoped calls join the supplied workspace transaction. Failed validation/revisions and caller failures roll back writes. Saves waiting behind archive/enrollment removal recheck access before writing. Existing submitted-record retention is unchanged; proof finalization is not enabled. Instructor practice review remains private/unavailable. Objective finalization/review still validates its narrower answer union rather than dropping proof fields.

This is internal persistence support, not rollout authorization: live create/publication/save/read schemas and the frontend cannot yet accept assigned proofs. Do not seed these staged assignment fixtures into user-facing data. Checking/reference access, graded finalization and completion-only semantics remain separate work.

## Next delivery slices

1. Add assigned-practice explicit **Check proof** and separately authorized reference projections through the staged store; enforce feedback/answer policies without saving checks or releasing private reference content early.
2. Add staged finalization/evidence/score integration. Keep graded authoring/publication/student availability guarded through the complete 022–023 instructor-review milestone; internal fixtures may exercise staged paths. Settle completion-only semantics before enabling proofs in that mode.
3. Deliver student editing, explicit saves/navigation protection and read-only final work. Keep private reference/explanation access independent from student-specific feedback and grade release; never feed owner DTOs directly to student editors.

Before enabling completion-only derivations, settle what counts as completed proof work and the permitted feedback behavior while preserving score-free completion. Also settle mixed immediate-feedback assignments: the agreed proof interaction is explicit **Check proof**, rather than automatic proof-error display. Neither checkpoint blocks the current transport/evaluation foundation.

## Slice 1 verification — November 2, 2026

`npm run check` passed type checks, 1,350 tests (357 engine, 725 API, 268 web) and production builds. The 26 new cases cover bounded/incomplete work, strict request/provenance fields, injected diagnostics/keys/scores, fresh report generation, source/input preservation, occurrence identity, target/rule binding, invalid upstream support, unused errors, unassessable outcomes and continued live-workflow rejection. Existing authoring/scoring/release tests passed after sharing public-content configuration validation.

Built ESM/CommonJS package smoke, formatting, whitespace and local Markdown file targets passed. No migration, persistence/HTTP/browser change or new external dependency is introduced; PostgreSQL checks and browser walkthroughs were not repeated for this pure foundation slice. No user development database was migrated/reset. Existing Jest VM-module advisories remain. No actual enrolled proof save/finalization, live practice endpoint, graded submission or review workflow is claimed yet.

## Slice 2 verification — November 2, 2026

`npm run check` passed type checks, 1,352 tests (357 engine, 727 API, 268 web) and production builds. Two new contract/type cases verify database/transport symmetry, proof JSON round trips, strict redaction and continued live HTTP rejection. Existing objective work, release and instructor review checks passed with the wider saved model.

`npm run db:test` passed 226 PostgreSQL checks (159 database, 67 API/workflow). Five new integration cases verify incomplete draft persistence/reload, independent occurrences/students, pinned redaction, instructor practice privacy, unsupported modes, stale revisions/type mismatch rollback, concurrent-save serialization, caller/demo rollback, cross-visitor denial and observed database waits before assignment archive/enrollment removal. Schema comparison and existing immutable-submission regressions passed.

Formatting, whitespace, built public-entry smoke and local Markdown targets passed. No migration, user development-database reset or browser change is introduced. Internal fixtures deliberately bypass guarded assignment authoring to test staged practice persistence; they are not a supported rollout path. No live enrolled-proof HTTP workflow or proof finalization is claimed. Existing Jest VM-module advisories remain.
