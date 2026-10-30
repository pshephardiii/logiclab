# Derivation authoring

Status: first three slices of `021-feat-derivation-authoring`. Private contracts, JSON compatibility, owner-store authoring/preview and checked immutable publication now have matching HTTP routes and frontend consumers. The frontend displays saved derivations read-only; editable Fitch controls follow next. Assignment/student admission stays guarded and no demo derivations are seeded.

See the [derivation sequence](logical-derivations.md) and [proof-checker specification](propositional-proof-checker.md) for the agreed product direction and checker semantics.

## Versioned authored data

Derivation-specific definitions, private reference solutions and reference-check responses live in `@logiclab/contracts/derivation`. Combined owner-library definitions and request/response schemas for truth tables, conceptual questions and derivations live in `@logiclab/contracts/problem-library`. Separate package entries keep the private library union distinct from assignment-supported definitions and let browser consumers load the schemas they use. Root/browser package resolution remains supported through explicit package exports.

`DerivationDefinition` includes:

- `type: "derivation"`, `definitionVersion: 1` and instructor-required `format: "fitch"`.
- `ruleCatalogVersion: 1` and `checkerVersion: 1`, pinned to supported engine semantics. These are compatibility requirements, not a cached validation claim.
- Ordered `premises: [{ id, formula }]` with stable normalized UUIDs, and the target `conclusion`.
- Explicit enabled `rules: [{ id, label }]`. Store effective labels with the problem rather than looking up mutable profile defaults on later reads. Rule IDs determine logic; labels determine presentation. No default permission is inferred.
- A nullable `referenceProof`, using the existing flat, versioned Fitch proof shape. Missing or unfinished references are valid draft data.
- Optional private `explanation`, up to 5,000 characters, reserved for reference-answer reveal.

The statement is bounded by the existing proof budgets (50 premises, 256 characters per formula, at most 64 configured rule entries), and the reference uses the existing proof transport bounds. Blank/malformed formulas and incomplete reference steps can be retained in a draft; syntax, scope, permitted inference and target establishment are checked by the engine before a reference can qualify for publication. Premise IDs and enabled rule IDs must be unique. The application helper checks actual rule-catalog membership and version compatibility; a syntactically valid custom slug is not a supported rule.

There is no client-provided accepted flag or stored checker report in this definition. Extra fields such as `referenceAccepted`, an injected report or custom rule behavior are rejected. Changing premises, target or permissions requires a fresh reference check. The initial format is fixed by the instructor; other formats remain guarded until their own complete adapters/workflows exist.

## Effective labels

The user confirmed rejection of duplicate enabled labels after normalization. Labels are trimmed, nonempty plain text of at most 80 characters; control and invisible formatting characters are rejected. Collision comparison applies Unicode NFKC normalization, collapsed whitespace and JavaScript lowercase matching. For example, `MP`/`mp` and `Modus ponens`/`MODUS  PONENS` collide. Display spelling is otherwise preserved. This is a deterministic comparison policy, not a promise to identify every visual homoglyph in every font/language.

Only effective labels of enabled rules participate. Built-in aliases are suggestions, not alternate accepted rule identities or automatically active shortcuts. Custom labels cannot add behavior or enable rules. Editing a label alone leaves the checker result unchanged because proof steps cite stable IDs. Reusable instructor profile storage and editor interactions are not implemented by this data shape.

## Private references and projections

`validateDerivationDefinition` validates the standalone configuration and supported IDs without demanding a complete proof. `checkDerivationReference` returns either `missing` or a fresh versioned checker report computed from the saved statement, enabled IDs and reference. A checked reference is not necessarily accepted. Publication requires `report.status === "accepted"` inside the owning transaction; an old report or a trusted-looking client field cannot substitute for that check.

`derivationContent` explicitly whitelists the statement, format/version requirements and effective rules. It excludes the reference proof and explanation and returns independent parsed values. Its strict content schema rejects private fields rather than accepting a full instructor definition as ordinary content.

`derivationReferenceSolution` is a privileged helper for a caller that has already authorized answer access. It requires a freshly accepted reference and returns its proof/explanation in a separate strict solution schema. It does not authorize the caller, release grades or expose student-specific diagnostics. Owner-store draft editing retains/views raw unfinished reference work; the solution projection is for accepted reference reveal.

These projections are staged helpers, not live student endpoints. Answer access will remain independent of student-proof feedback and grade release, as agreed. Instructor comments/review grades are not part of a reference definition.

## Persistence and current guards

The database's `ProblemDefinition` JSON union now includes an exact `DerivationDefinition` type and matching reference-step/block fields. Transport/database types are checked for mutual assignability. Existing `problems.definition` and `problem_versions.definition` JSONB columns already support the shape, so there is no migration, new column, trigger change or snapshot regeneration.

Private owner DTOs (`LibraryProblemDefinition`, `LibraryProblemDraft`, `LibraryProblemVersion` and create/update schemas) extend the supported library types through the separate `@logiclab/contracts/problem-library` entry. They include the reference and explanation and must never replace ordinary assignment content projections. The existing problem store now creates/reads/edits these drafts, lists private version history and archives/restores them with owner-scoped queries. Drafts retain incomplete statements/references; unsupported rule IDs and invalid configuration fail before commit.

`previewReference(ownerId, problemId)` checks the saved definition and returns its problem ID, source `updatedAt` and a missing-reference state or fresh checker report. Preview writes nothing and remains available for archived drafts. The timestamp identifies the checked snapshot; it is not a publication token. The saved-reference UI discards mismatched source timestamps and cancels requests when its saved snapshot/selection changes. The eventual editable proof form must preserve this behavior for unsaved changes.

Publication locks the parent problem, rejects archived/foreign access and rechecks the exact saved reference before allocating the next immutable version number. Missing, rejected or unassessable references cannot publish. Concurrent edits, archive changes and publication use the same parent lock. Later edits to the statement, labels, rules, reference or explanation cannot change an existing snapshot; database triggers protect the entire version JSON. Failed checks roll back without consuming a number. Safe error mappings provide actionable categories without returning private diagnostics in generic errors.

The demo-scoped store uses the existing workspace transaction and owner binding: successful writes commit with the request; failed publication rolls back earlier writes in that transaction. Direct-store and HTTP tests exercise this behavior; no demo derivation content is seeded.

The active owner HTTP routes use private library request/response schemas from the problem-library entry; root `problemDefinitionSchema`, assignment admission (`supportedProblemDefinition`) and student evaluation remain guarded. Assignment version serialization stays separate from the wider private owner serializer. The frontend lists/inspects saved derivations and history, previews private references, checks the saved reference explicitly and retains publication/archive controls. Its ordinary editors are never given derivation data. Creating/editing a derivation currently requires the private HTTP API; the Fitch editor is next. Matching frontend/API/contracts builds are required because older library clients cannot parse derivation rows.

The assignment picker filters derivation versions after parsing private pages, preserves pagination and retains supported historical versions regardless of the current draft type. See the [HTTP contract](../api/problem-library-api.md#derivation-authoring-branch-021-http-slice) for saved-reference response/error semantics and policies. Normal truth-table/conceptual workflows and historical results remain unchanged.

## Next slices

1. Add the instructor Fitch/reference editor and effective rule/label controls, with incomplete draft saves, recoverable errors, archived locks and unsaved-work protection. Settle editor interactions before implementing them.
2. Verify owner/workspace isolation, reference privacy, concurrent edit/publication, and unchanged published format/rules/labels/solutions after draft edits. Finish branch verification/PR notes afterward.

Student proof workflows and graded assignment availability remain guarded through the planned 022–023 student/review milestone. This branch does not add instructor grade adjustments, numerical proof partial credit, alternative formats or general proof search.

## Slice 1 verification — October 30, 2026

`npm run check` passed type checks, 1,283 tests (357 engine, 687 API, 239 web) and production builds. The 26 new authoring cases cover storage/transport compatibility, incomplete drafts, fresh reference checks, label normalization/collisions, strict version/field bounds, custom-rule rejection, independent private/content/solution projections and unchanged active workflow guards. `npm run db:test` passed 216 PostgreSQL checks (159 database, 57 API/workflow), including four new derivation JSON/snapshot retention cases. Existing schema/snapshot, normal/demo and grading regressions passed.

Built Node ESM/CommonJS public-module smoke and standalone browser-contract bundling passed. Formatting, whitespace and local Markdown file-link checks passed. The frontend entry remains 499.24 kB, with no warning-threshold change. No migration, environment change, user development-database reset, browser walkthrough, new live authoring endpoint or derivation assignment acceptance is claimed. Existing Jest VM-module advisories remain.

## Slice 2 verification — October 30, 2026

`npm run check` passed type checks, 1,291 tests (357 engine, 695 API, 239 web) and production builds. Eight added cases cover private contracts, assignment guards, fresh publication validation and safe error mappings. A focused rerun also passed after adding a malformed-statement publication assertion; API type checking passed after the final type-name cleanup.

`npm run db:test` passed 220 PostgreSQL checks (159 database, 61 API/workflow), including four new owner lifecycle, invalid-edit rollback/assignment admission, edit/publication concurrency and demo transaction/isolation cases. An initial run overlapped shared-package builds with `npm run check` and one demo process failed contract initialization. Its isolated rerun passed; the full sequential database rerun passed. No package initialization defect was reproduced without the overlapping builds.

Built ESM/CommonJS contract smoke confirmed that private incomplete drafts are accepted while active HTTP requests still reject derivations. Formatting and whitespace checks passed. No migration, browser walkthrough, UI change, HTTP derivation admission, user development-database migration/reset or student derivation acceptance is claimed. Existing Jest VM-module advisories remain. Logs are local ignored evidence under `.codex-local/verification/derivation-authoring/`.

## Slice 3 verification — October 30, 2026

`npm run check` passed type checks, 1,305 tests (357 engine, 699 API, 249 web) and production builds. Four new HTTP cases cover saved-reference ownership, authorization before validation, exact origin/empty-body requirements, no-store responses, safe errors and rate limits. Ten new frontend cases cover normal/demo transports, read-only derivation/history rendering, explicit check/retry/error states, report outcomes, stale-snapshot cancellation and mixed-history assignment filtering.

`npm run db:test` passed 221 PostgreSQL checks (159 database, 62 API/workflow). The new real-route normal/demo case covers incomplete draft creation, saved reference checks, fresh publication rejection after edits, immutable private history, archive/restore and assignment rejection. A focused rerun passed after extending the same case with separate-demo-visitor read/check/publication denials. Normal/demo separation and student-role rejection also passed. These use synthetic local authentication, not live Cognito.

The lazy library page keeps its private schemas/components out of the public entry bundle, now 480.57 kB; no warning threshold changed. Formatting, whitespace and local Markdown file targets passed. No migration, environment change, user development-database reset, browser walkthrough, editable Fitch UI or student derivation acceptance is claimed. DOM tests do not establish real-browser/mobile/focus behavior. Existing Jest VM-module advisories remain. Local logs are ignored under `.codex-local/verification/derivation-authoring/`.

Code-review follow-up: combined library contracts moved to `problem-library.ts` and the `@logiclab/contracts/problem-library` package entry; derivation-specific definitions, solutions and checks remain in `derivation.ts`. Consumers and documentation use the new entry without compatibility re-exports. Node/browser exports, schema shapes, privacy and assignment guards are unchanged. `npm run check` passed the same 1,305 tests, type checks and production builds on rerun; the first run exited with a Node segmentation fault at engine-test startup, which did not repeat. Built ESM/CommonJS smoke accepted all four library variants through the new entry and confirmed the derivation entry stays specific. Formatting and whitespace checks passed. PostgreSQL checks were not repeated for this import-only reorganization.
