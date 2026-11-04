# Dependency-style proof format

Branch: `025-feat-dependency-proof-format`, following completed Fitch checking/authoring/student work and instructor grading/review (020–024). See [the agreed sequence](logical-derivations.md#025-and-026-additional-formats). This document is the implementation-slice record; broader API/data/product documentation will be consolidated at branch closeout.

Current status: slices 1–3 provide staged proof/authoring contracts, dependency-set arithmetic, a standalone bounded checker and private-reference certification helpers. Live library definitions, saved assigned work and UI still admit only Fitch. The remaining branch work will connect dependency authoring/reference certification and student/review workflows before application admission.

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

## Slice 3: staged private definitions and reference certification

`@logiclab/contracts/dependency-derivation` now exposes separate version-1 dependency content, private definition and privileged solution schemas. The statement and its reference must both use `format: "dependency"`; an accepted Fitch reference cannot be reused or relabeled as certification. Null references, blank formulas and unfinished proof fields remain draft data, while unsupported versions, extra/cached checker fields, duplicate premise/rule identities and normalized rule-label collisions are rejected.

Shared `derivation-statement.ts` owns statement limits, premise/rule identity validation, label normalization and explanation bounds. Each public format schema narrows its own format explicitly. Existing Fitch exports and field ordering are preserved. Separate exact database JSON types describe dependency steps/proofs/definitions independently of transport contracts; they are staged exports, not additions to the entity problem-definition or saved-answer unions yet.

`dependency-authoring.ts` validates supported configuration, checks references with `checkDependencyProof`, requires an accepted reference for publication certification, and supplies explicit ordinary-content/private-solution projections. Missing, erroneous or unassessable reference work cannot publish; solution projection also requires acceptance, while its caller still owns authorization. Content never contains the private reference/explanation. Display labels cannot define inference behavior.

Fitch and dependency authoring share engine-version/rule-ID validation through `derivation-configuration.ts` and the existing safe error categories in `derivation-errors.ts`. Internal imports were updated to those owners; API error behavior is unchanged. Format-specific reference checking remains explicit so neither format can accidentally use the other's checker or treat schema parsing as proof acceptance.

The existing live library union, problem store/publication dispatcher, assignment admission and student responses remain Fitch-only. No dependency HTTP authoring/editor is introduced by this slice. The next persistence/library slice will connect the new definition and certification helper under the saved problem lock, with owner/draft/version/rollback tests and appropriate client compatibility guards. The subsequent editor/student/review slices must pass before dependency assignment admission is enabled.

### Slice 3 verification — November 4, 2026

`npm run check` passed type checks, 1,698 tests (448 engine, 922 API, 328 web) and production builds. The 23 new cases cover exact stored/transported JSON compatibility, draft retention, matching format versions, accepted/rejected/missing/unassessable references, current-rule/statement checks, input preservation, ordinary/private projections, Unicode label collisions, unsupported/custom rules, strict fields/bounds and continued rejection by current library/assignment/student admission. Earlier focused authoring/Fitch/configuration regressions passed before the final full check; existing error-mapping tests cover the relocated shared classes.

Built ESM/CommonJS subpath imports and compiled application helpers passed accepted-reference publication, rejected-target checks, ordinary-content redaction, privileged solution projection, input preservation and the live-library guard. Formatting, whitespace and this document's local Markdown target were checked. Logs: `/private/tmp/dependency-slice3-contracts.log`, `dependency-slice3-db-build.log`, `dependency-slice3-types.log`, `dependency-slice3-focused.log`, `dependency-slice3-check.log` and `dependency-slice3-format-check.log`.

The production entry is 500.08 kB minified (152.24 kB gzip), just above Vite's unchanged 500 kB warning threshold; the build passes. Record this for the branch's frontend/bundle closeout rather than increasing the threshold. Existing Jest VM-module and Vitest performance advisories remain.

No entity/migration, live persisted union, HTTP handler, UI or demo template changed; PostgreSQL/browser checks were not repeated. No user database, environment, provider or infrastructure was modified. Publication certification here is a pure helper, not proof that a live owner request has loaded/locked the correct saved record. That transaction-bound integration is next. No PR draft or new branch was created.

## Organization slice: shared and format-specific ownership

Derivation authoring now lives under `services/api/src/application/problem/derivation/`:

```text
derivation/
  configuration.ts
  errors.ts
  reference-check.ts
  fitch/
    authoring.ts
    authoring.test.ts
  dependency/
    authoring.ts
    authoring.test.ts
```

Configuration validation, error categories and reference-check result types belong to both formats. Each format owns its definition validation, checker invocation and content/solution projections. Internal Fitch functions now explicitly say `Fitch`/`fitch` rather than implying that they handle every derivation format. The library dispatcher and existing consumers import the appropriate owner directly.

The engine follows the same organization under `tools/logic-engine/src/proof/fitch/` and `dependency/`. Each owns input, structure and step evaluation; Fitch also owns layout, block references and attempt completeness, while dependency owns dependency-set arithmetic. Formula parsing, local rule patterns, budgets, diagnostics and report construction/versioning remain shared in the proof directory. Engine tests are grouped under `test/proof/`, with format-specific subdirectories and shared foundation/parser/rule tests alongside them.

Public contracts and engine imports remain unchanged, including `@logiclab/logic-engine/proof`, `/proof/rules` and `/proof/completion`. The completion subpath now resolves directly to the relocated Fitch implementation. This slice changes organization and internal names, without enabling dependency library/student admission or changing proof rules, disclosure, persistence or grading behavior.

### Organization verification — November 4, 2026

`npm run check` passed type checks, the unchanged 1,698 tests (448 engine, 922 API, 328 web) and production builds. Existing test assertions were preserved while relocating format-specific suites and updating imports/internal function names. Built ESM/CommonJS smoke checks passed both checkers, shared version exports, Fitch-only admission and completion detection; the completion export resolved to the new Fitch path rather than a stale build artifact. Log: `/private/tmp/dependency-org-check.log`.

Formatting and whitespace checks passed. Existing Jest VM-module/Vitest advisories and Vite's just-over-threshold entry warning remain (500.07 kB minified, 152.23 kB gzip). No database/migration or UI behavior changed, so PostgreSQL and browser walkthroughs were not repeated. The next feature slice remains transaction-bound library/persistence integration; this organization slice does not finish the branch.

## Slice 4: owner library persistence and checked publication

Owner library contracts now discriminate derivations by `format`, accepting Fitch and dependency definitions without widening student definitions or responses. The database problem JSON union includes the dependency definition; no schema migration is needed. Normal/demo create, read, update, history and saved-reference routes retain their existing authorization, request policies and private response boundaries.

`libraryProblemDefinition` validates each format explicitly. `libraryReferenceCheck` selects its checker, and `publicationDefinition` recomputes acceptance from the saved definition while the problem store holds the parent lock. A missing, incorrect or unassessable dependency reference cannot publish. Existing numbering, archive checks, transaction rollback and immutable version snapshots remain shared. A prior preview or a Fitch reference cannot certify a later dependency publication.

Dependency publications remain unavailable to assignments in every assessment mode, with an explicit `DERIVATION_ASSIGNMENT_FORMAT_UNAVAILABLE` conflict. Student work contracts/checking/finalization are unchanged. The frontend accepts mixed library/history responses, identifies dependency statements, protects dependency drafts from the Fitch editor and excludes their versions from assignment choices while retaining pagination. Dependency editing and reference rendering remain for the next UI slice; existing Fitch editing and assignment availability continue working.

Regression coverage extends the existing persistence journeys to both formats: incomplete drafts, failed edits, reference rejection, retained versions, archive/restore, foreign owners, concurrent publication/edit races and demo workspace rollback/isolation. HTTP tests cover dependency create/update/list/publication/version reads, saved checks and mismatched-reference rejection. Frontend tests cover the temporary editor and assignment-picker safeguards.

### Slice 4 verification — November 4, 2026

`npm run check` passed type checks, 1,704 tests (448 engine, 926 API, 330 web) and production builds. `npm run db:test` passed 295 PostgreSQL checks (184 database, 111 API/workflow). The eight Fitch/dependency authoring integration journeys passed a focused rerun after introducing the explicit assignment-format rejection. Formatting and whitespace checks passed. Logs: `/private/tmp/dependency-library-final-check.log`, `dependency-library-db.log`, `dependency-library-db-focused.log` and `dependency-library-format.log`.

Existing Jest VM-module/Vitest advisories and the Vite entry warning remain (500.39 kB minified, 152.28 kB gzip); the warning threshold is unchanged. No browser walkthrough, clean install, hosted/provider verification or load run was performed for this API/persistence slice. Database checks used the configured disposable test database and temporary schemas; the user development database was not migrated or reset. Matching contracts/database-package/API/frontend builds are required for the expanded private library response union. No new environment variable, demo seed upgrade, PR draft or branch was introduced. Next: dependency authoring controls/reference editor, followed by student/review integration before assignment admission opens.

## Slice 5: dependency authoring and private reference editor

The instructor library now offers Fitch and dependency formats before starting a reference. Changing format with an existing reference requires explicit confirmation: discard the entire reference or keep the current format. Statement premises/identities, conclusion, permitted rules/labels and explanation remain; the proof is never converted. The new format remains local until an explicit save. Archived/busy editors disable format and proof controls.

Dependency controls support premise/assumption/inference insertion, reordering, confirmed deletion, explicit source-set selection, ordinary line citations and assumption/conclusion discharge pairs. Starting copies current premises once and assigns self-dependencies to premise/assumption lines. Inference support is entered explicitly, not silently inferred or repaired. Stable IDs survive moves; removed/forward/unavailable citations and annotations remain visible for manual repair. Duplicate line identities disable structural editing while retaining a read-only summary and explicit proof removal. Line and annotation limits follow shared contracts.

The existing statement, rule-label and explanation controls are shared. Rule guidance describes dependency discharge pairs rather than Fitch subproofs. Local checking chooses the format's exact schema/checker, runs only on request, does not save, and hides a report after its checked snapshot changes. Saved checks/publication retain the server-side validation introduced in slice 4. Private draft/version previews render dependency source sets and discharge lines alongside the instructor explanation; they are owner views, not student projections.

Assignment pickers and server admission remain guarded for dependency publications. No saved student answer, grading/release policy, database schema or demo seed was changed. Dependency student editing/checking/finalization and instructor review are the next integration work, before assignment admission opens.

### Slice 5 verification — November 4, 2026

`npm run check` passed type checks, 1,714 tests (448 engine, 926 API, 340 web) and production builds. Focused editor/authoring regressions also passed before the full suite. Coverage includes explicit save and failure retention, dependency annotations and discharge, invalidation of stale local reports, insertion/reordering/deletion identities, unavailable-source repair, duplicate-ID guards, format confirmation/reset, private summaries, transport limits and disabled archive/busy controls. Formatting and whitespace checks passed. Logs: `/private/tmp/dependency-ui-focused.log`, `dependency-ui-check.log` and `dependency-ui-format.log`.

Focused headless Chrome using real local APIs and an isolated temporary schema passed UI dependency authoring with explicit source sets/discharge, local and saved checks, save/publication, reload, private reference preview, Stay retention, 390px layout without horizontal overflow, confirmed format reset and preservation of published history. No uncaught page errors or browser-storage entries were found. Temporary servers/schema were cleaned up. The ignored smoke script and mobile screenshot are in `.codex-local/verification/dependency-proof/`; the run log is `/private/tmp/dependency-ui-browser.log`. Earlier smoke attempts stopped on incorrect expected UI text in the local script; the corrected run passed.

No API/persistence/migration behavior changed in this slice, so the full PostgreSQL suite was not repeated; slice 4's 295 database/workflow checks remain the preceding backend evidence. Existing Jest VM-module/Vitest advisories and Vite's entry-size warning remain (500.41 kB minified, 152.29 kB gzip), with no threshold increase. This is focused authoring verification rather than full product/browser/accessibility QA. No user development database, infrastructure or external provider was modified. No PR draft or next branch was created; student/review integration remains pending.

## Slice 6: staged student answer and evaluation boundary

`@logiclab/contracts/dependency-derivation-work` defines strict dependency student-answer, explicit-check and revisioned-save request shapes. They contain only entered proof work plus the request's occurrence/revision metadata. Student data cannot provide a replacement statement, permitted rules, private reference, explanation, acceptance flag, report or score. The separate exact database `DependencyDerivationAnswer` type matches transported JSON without adding it to the live attempt-answer union yet.

`application/student-work/dependency-response.ts` separates transport validation from explicit checking. Validation retains unfinished formulas, wrong/missing dependency annotations and incomplete citations/discharge fields within transport bounds. Checking validates pinned public dependency content and invokes the dependency checker with authoritative premises, conclusion and permissions. It returns the existing version-1 derivation evidence/report with occurrence and published-version IDs; it does not write data, award points, reveal the private reference or perform authorization. Incorrect work needs review, and unassessable problem/checker failures stay distinct from incorrect proofs.

The existing Fitch answer and saved-work request/response contracts remain unchanged. Assignment admission is still guarded. This slice supplies the dependency validation/checking functions for the upcoming store integration; it does not yet enable dependency saves/checks through live student endpoints. That integration must update saved-response consumers and format-specific student rendering together rather than return dependency data to a Fitch-only editor. Completion/finalization/review compatibility must also pass before assignment admission opens.

### Slice 6 verification — November 4, 2026

`npm run check` passed type checks, 1,743 tests (448 engine, 955 API, 340 web) and production builds. The 29 new cases cover exact stored/transported JSON, nonmutating incomplete-draft validation, field injection and bounds, revision/request metadata, authoritative permissions/premises, wrong support, unavailable assessment, private-content rejection, format separation and unchanged live saved-work admission. Earlier focused Fitch/dependency response tests passed. Built Node ESM/CommonJS and bundled browser-subpath smoke checks passed the new schemas and unchanged Fitch rejection. Logs: `/private/tmp/dependency-answer-focused.log`, `dependency-answer-check.log`, `dependency-answer-exports.log` and `dependency-answer-format.log`.

Formatting and whitespace checks passed. Existing Jest VM-module/Vitest advisories and the unchanged Vite entry warning remain (500.41 kB minified, 152.29 kB gzip). No HTTP/store/entity/migration/UI behavior changed, so PostgreSQL and browser journeys were not repeated for this pure contract/evaluation slice. There are no live dependency student saves or checks yet, and the new save schema does not itself implement revision locking or authorization. No user database, provider, infrastructure, PR draft or next branch was changed/created. Next: wire dependency saved work into persistence/response projection and the student editor, preserving the guard until finalization and review are ready.
