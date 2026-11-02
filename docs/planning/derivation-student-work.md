# Derivation student work

Status: first foundation slice of `022-feat-derivation-student-work`. Staged proof-response/request/evidence contracts and pure save-validation/evaluation helpers are implemented. Live assignment/student contracts, persistence and HTTP routes still reject derivations. See [the agreed sequence](logical-derivations.md#022-student-work-and-finalization) and [private authoring](derivation-authoring.md) for the existing boundaries.

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

## Next delivery slices

1. Add compatible saved-work/database JSON and result projections, then transaction-bound store operations under existing enrollment/workspace checks, assignment locks, revisions, submitted-work immutability and rollback. Bind reports to authoritative pinned occurrences/versions; do not widen active admission before all consumers can safely project the new variant.
2. Add assigned-practice explicit Check proof and staged finalization/evidence/score integration. Keep graded authoring/publication/student availability guarded through the complete 022–023 instructor-review milestone; internal fixtures may exercise staged paths.
3. Deliver student editing, explicit saves/navigation protection and read-only final work. Keep private reference/explanation access independent from student-specific feedback and grade release; never feed owner DTOs directly to student editors.

Before enabling completion-only derivations, settle what counts as completed proof work and the permitted feedback behavior while preserving score-free completion. Also settle mixed immediate-feedback assignments: the agreed proof interaction is explicit **Check proof**, rather than automatic proof-error display. Neither checkpoint blocks the current transport/evaluation foundation.

## Slice 1 verification — November 2, 2026

`npm run check` passed type checks, 1,350 tests (357 engine, 725 API, 268 web) and production builds. The 26 new cases cover bounded/incomplete work, strict request/provenance fields, injected diagnostics/keys/scores, fresh report generation, source/input preservation, occurrence identity, target/rule binding, invalid upstream support, unused errors, unassessable outcomes and continued live-workflow rejection. Existing authoring/scoring/release tests passed after sharing public-content configuration validation.

Built ESM/CommonJS package smoke, formatting, whitespace and local Markdown file targets passed. No migration, persistence/HTTP/browser change or new external dependency is introduced; PostgreSQL checks and browser walkthroughs were not repeated for this pure foundation slice. No user development database was migrated/reset. Existing Jest VM-module advisories remain. No actual enrolled proof save/finalization, live practice endpoint, graded submission or review workflow is claimed yet.
