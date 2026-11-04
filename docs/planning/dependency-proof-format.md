# Dependency-style proof format

Branch: `025-feat-dependency-proof-format`, following completed Fitch checking/authoring/student work and instructor grading/review (020–024). See [the agreed sequence](logical-derivations.md#025-and-026-additional-formats). This document is the implementation-slice record; broader API/data/product documentation will be consolidated at branch closeout.

Current status: slices 1–2 provide staged contracts, dependency-set arithmetic and a standalone bounded checker. Instructor definitions, saved assigned work and UI still admit only Fitch. The remaining branch work will connect dependency authoring/reference certification and student/review workflows before application admission.

## Confirmed direction — November 4, 2026

The user approved explicit textbook-style dependency annotations: students list the premise/assumption line IDs supporting each line, the checker validates those sets, and discharge cites a temporary assumption plus a concluding line. An accepted final proof may depend only on the stated premises. This is a separate proof representation, not a renderer over nested Fitch boxes or automatic conversion of existing work.

The instructor chooses the required format in a published problem. Rule IDs/catalog versions, effective labels, authoritative statements, reference certification, independent grade/reference release, original evidence and instructor grading/history keep their existing responsibilities. A Fitch reference is not certification of a dependency-format reference. No additional inference behavior or arbitrary instructor rule is introduced.

## First-slice serialized model

`DependencyProof` has `proofVersion: 1`, `format: "dependency"` and a flat ordered `steps` array. Every step has a stable UUID, formula text and explicit `dependencies` containing source-line UUIDs. Display numbers are derived from order and never stored as references.

- Premise: `kind: "premise"` and nullable `premiseId` matching an authoritative premise when complete. Its expected dependency set is its own line ID.
- Temporary assumption: `kind: "assumption"`. Its expected dependency set is its own line ID. The assumption's stable line identity also identifies it for discharge.
- Inference: `kind: "inference"`, nullable `ruleId`, ordinary `lineReferences` and `discharges: [{ assumptionId, conclusionId }]`. Each pair identifies a temporary assumption and a concluding line. Nullable pair fields preserve unfinished editing. There are no Fitch block IDs, box boundaries or implicit global close operation.

Transport reuses the existing 200-step/256-character formula budgets, bounded rule IDs and normalized UUIDs. Each dependency array has at most 200 IDs; ordinary citations and discharge pairs each allow at most two, matching the current catalog's maximum arities. These are upper bounds, not permission to cite two lines for every rule. Exact arity/permissions remain the shared rule checker's responsibility. Aggregate input/work budgets and endpoint body limits must be checked before live admission.

Empty formulas, null choices, duplicate/wrong/forward references and incorrect dependency annotations remain representable draft errors. Schema parsing does not certify syntax, chronology, derivability or a valid dependency set. Strict objects reject private checker flags, displayed line numbers, unknown format/version and Fitch-only fields. `DependencyProofCheckInput` is staged separately; current authored definitions, assigned responses and the live checker input remain Fitch-only.

## Dependency arithmetic and checker obligations

`inferenceDependencyIds` accepts trusted resolved citation contexts. It unions ordinary cited dependency sets and each branch's concluding dependencies after removing only that branch's discharged assumption. Results are detached, unique and canonically ordered by ID. `dependencySetsMatch` compares exact sets independently of display order and rejects duplicates, extra sources and missing sources. These helpers do not parse formulas, authorize a request or validate rules/references.

The structural/checker slice must enforce:

1. Resolve unique stable source identities and authoritative premise correspondence. Only premise/assumption lines may appear in dependency annotations. Ordinary inference references and discharge endpoints must precede the inference; an assumption cannot follow its cited concluding line. The assumption itself may be the conclusion, supporting `P -> P`.
2. Derive expected dependencies from computed support, never trust an earlier student annotation as authoritative. Reject invented/omitted/duplicate annotations and propagate invalid/unavailable support independently of local inference correctness.
3. Match the existing catalog's formula obligations and exact citation/discharge arities. Proof by cases cites two distinct temporary assumptions. Do not subtract a discharged assumption globally: another ordinary citation or another branch may still depend on it.
4. Allow vacuous discharge when the chosen rule's existing formula obligations hold and the concluding line does not use that assumption. For example, reiterating premise P after assuming Q can justify Q → P with dependence only on P. A claimed discharge still needs the actual earlier assumption and concluding line; it cannot erase a premise.
5. Treat discharge as local to that inference. Other lines can reuse the earlier assumption only while retaining it in their own computed dependency sets. There is no global marking that makes a source disappear from unrelated derivations.
6. Require the actual final line to match the target with no remaining temporary-assumption dependencies. Unused mistakes still prevent automatic acceptance, as in Fitch. An incomplete proof is review-needed; unsupported/resource/configuration failures remain unassessable, not invented zero grades. Preserve deterministic budgets and the existing report/grading distinctions.

The standalone checker delivered in slice 2 enforces these requirements. The transport contracts and set helpers alone do not certify a proof.

## Slice boundaries

1. **This slice:** separate bounded draft/input contracts, shared proof field validators, pure dependency-set arithmetic/comparison and regression tests. Existing Fitch public exports and acceptance remain unchanged.
2. **Completed:** bounded structural/reference resolution and a standalone dependency checker using shared formula parsing/equality, rule patterns and diagnostic/support semantics. Valid/invalid proofs, discharge/cross-context cases and resource failures have regression coverage.
3. Add immutable dependency-format instructor definitions, accepted-reference publication, rule/label controls and authoring editors. Keep student admission guarded until the remaining workflow is complete.
4. Extend saved student work, explicit checks, completion/graded finalization, independent references and read-only instructor grading/review. Verify normal/demo journeys and retained evidence, then finish docs/PR notes.

No database/migration, authoring/student UI, new report/result version, live format acceptance, reference conversion or demo template change is introduced by the first slice. No user development database is migrated/reset.

## Slice 1 verification — November 4, 2026

`npm run check` passed type checks, 1,617 tests (390 engine, 899 API, 328 web) and production builds. The 32 new cases cover draft round-tripping, canonical UUIDs, strict/private/format fields, transport bounds, unchanged live Fitch admission, dependency union/order/duplicates, discharge, cross-context assumption retention, vacuous/empty support and input preservation. Focused runs passed 32 engine cases and 48 API contract cases before the full check. Existing Fitch contract/checker and application regression suites passed after extracting the shared field validators.

Formatting, whitespace and this document's local Markdown target were checked. Logs: `/private/tmp/dependency-slice1-contracts.log`, `dependency-slice1-engine.log`, `dependency-slice1-api.log`, `dependency-slice1-check.log` and `dependency-slice1-format-check.log`. Existing Jest VM-module and Vitest test-environment advisories remain.

No database/entity/migration, HTTP handler, authoring/student UI or persisted proof/result type changed, so PostgreSQL checks and browser walkthroughs were not repeated. No user development database, environment setting, external provider or infrastructure was changed. The set helpers assume resolved trusted citations; structural validity, shared-rule application, support propagation and target checking remain for the next slice. The branch is not complete and no PR draft or next branch was created.

## Slice 2: dependency structure, checking and reports

`checkDependencyProof` is available through the existing `@logiclab/logic-engine/proof` public entry. It accepts bounded plain data and returns the existing version-1 `ProofCheckReport`; it does not award points, authorize a request or reveal private references. Callers must supply the authoritative problem. The existing `checkProof` entry remains Fitch-only, and no authoring/student contract or endpoint admits dependency work yet.

The implementation separates these responsibilities:

- `dependency-input.ts`: format/version, strict field and bounded-list/text preflight before schema parsing. Shared `proof-input-fields.ts` rejects object accessors, non-enumerable accessor fields, list holes/accessors and custom list properties/iterators without invoking them. These guards also harden the existing Fitch input boundary while retaining valid JSON behavior.
- `dependency-structure.ts`: unique source identities, available source annotations, earlier ordinary citations, assumption/conclusion chronology and distinct discharge assumptions. Null discharge fields remain incomplete work; invalid references are not exposed as partially resolved citations.
- `dependency-steps.ts`: computed source sets independent of written annotations, exact annotation validation, authoritative premise formulas, local rule checking and upstream invalid/unknown support propagation. Missing computed support stays unknown rather than becoming an invented empty set. Ordinary repeated line citations remain legal when the rule permits them; dependency annotations must still be sets.
- `parsed-rule.ts`: shared formula obligations, permissions, arity, diagnostics and conservative comparison charging over the existing 19 catalog variants. Fitch and dependency adapters resolve their own structure and invoke the same rule library. The shared formula/problem reader accepts either input's common problem shape without changing parsing semantics.
- `check-dependency-proof.ts`: composes preflight, authoritative configuration, structure, formula parsing, step/support checking and the actual last-line target. Final computed dependencies must contain no temporary assumption. An independently established target still requires review if any unused line is wrong. The shared deterministic work/diagnostic budgets return explicit unassessable reports on exhaustion, never successful partial checking.

No global box closure is inferred. An earlier assumption can be reused by a later inference if that inference retains the assumption in its computed support. An unused valid assumption does not itself impose a global scope on an otherwise independent final theorem. Discharge still requires actual earlier assumption/conclusion endpoints and cannot erase support from another citation or branch.

### Slice 2 verification — November 4, 2026

`npm run check` passed type checks, 1,675 tests (448 engine, 899 API, 328 web) and production builds. The 58 new checker/boundary cases cover all 19 rules, direct-rule parity with Fitch, conditional/negative/classical/case discharge, nested/vacuous and locally reused assumptions, cross-context support retention, wrong/duplicate/missing/forward annotations, authoritative premise failures, invalid/unfinished citations, actual final-line targets, unused errors, disabled/unknown/arity failures, malformed configurations, resource/diagnostic exhaustion, input preservation and safe raw-object/list rejection in both checkers. Focused proof runs passed before full checks; the final full run also includes two regression cases for downstream unknown/invalid support.

Built public ESM/CommonJS imports passed six accepted/review/unassessable smoke cases, report-schema validation, input preservation and continued rejection by the Fitch-only entry. Formatting, whitespace and this document's local Markdown target were checked. Logs: `/private/tmp/dependency-slice2-focused.log`, `dependency-slice2-check.log`, `dependency-slice2-final-check.log` and `dependency-slice2-format-check.log`. Existing Jest VM-module and Vitest performance advisories remain.

No database, migration, API route, authored definition, saved-result type, UI or template changed. PostgreSQL checks and browser walks were not repeated for this standalone engine slice; existing Fitch engine/API/UI regressions passed in the full check. No user development database, environment, provider or infrastructure was changed. Next: versioned dependency-format owner definitions/private references and checked publication, followed by editors/student/review integration. Live format admission stays guarded until the complete workflow passes.
