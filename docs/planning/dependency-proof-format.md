# Dependency-style proof format

Branch: `025-feat-dependency-proof-format`, following completed Fitch checking/authoring/student work and instructor grading/review (020–024). See [the agreed sequence](logical-derivations.md#025-and-026-additional-formats). This document is the implementation-slice record; broader API/data/product documentation will be consolidated at branch closeout.

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

These are implementation requirements for the next slice, not guarantees already supplied by the transport contracts or set helpers.

## Slice boundaries

1. **This slice:** separate bounded draft/input contracts, shared proof field validators, pure dependency-set arithmetic/comparison and regression tests. Existing Fitch public exports and acceptance remain unchanged.
2. Add bounded structural/reference resolution and a dependency checker using shared formula parsing/equality, rule patterns and diagnostic/support semantics. Test valid proofs and invalid near-misses, including discharge/cross-context cases and resource failures.
3. Add immutable dependency-format instructor definitions, accepted-reference publication, rule/label controls and authoring editors. Keep student admission guarded until the remaining workflow is complete.
4. Extend saved student work, explicit checks, completion/graded finalization, independent references and read-only instructor grading/review. Verify normal/demo journeys and retained evidence, then finish docs/PR notes.

No database/migration, authoring/student UI, new report/result version, live format acceptance, reference conversion or demo template change is introduced by the first slice. No user development database is migrated/reset.

## Slice 1 verification — November 4, 2026

`npm run check` passed type checks, 1,617 tests (390 engine, 899 API, 328 web) and production builds. The 32 new cases cover draft round-tripping, canonical UUIDs, strict/private/format fields, transport bounds, unchanged live Fitch admission, dependency union/order/duplicates, discharge, cross-context assumption retention, vacuous/empty support and input preservation. Focused runs passed 32 engine cases and 48 API contract cases before the full check. Existing Fitch contract/checker and application regression suites passed after extracting the shared field validators.

Formatting, whitespace and this document's local Markdown target were checked. Logs: `/private/tmp/dependency-slice1-contracts.log`, `dependency-slice1-engine.log`, `dependency-slice1-api.log`, `dependency-slice1-check.log` and `dependency-slice1-format-check.log`. Existing Jest VM-module and Vitest test-environment advisories remain.

No database/entity/migration, HTTP handler, authoring/student UI or persisted proof/result type changed, so PostgreSQL checks and browser walkthroughs were not repeated. No user development database, environment setting, external provider or infrastructure was changed. The set helpers assume resolved trusted citations; structural validity, shared-rule application, support propagation and target checking remain for the next slice. The branch is not complete and no PR draft or next branch was created.
