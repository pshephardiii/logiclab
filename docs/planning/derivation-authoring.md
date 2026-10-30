# Derivation authoring

Status: first slice of `021-feat-derivation-authoring`. Standalone authoring contracts, private projection/checking helpers and database JSON compatibility are implemented. Active library/assignment contracts and workflow guards still reject derivations. There is no new route, editor, demo template or live publication in this slice.

See the [derivation sequence](logical-derivations.md) and [proof-checker specification](propositional-proof-checker.md) for the agreed product direction and checker semantics.

## Versioned authored data

The staged public contract entry is `@logiclab/contracts/derivation`. Keeping it separate from the existing root contract union prevents premature workflow acceptance and keeps unused authoring schemas out of current frontend imports. Root/browser package resolution remains supported through explicit package exports.

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

`validateDerivationDefinition` validates the standalone configuration and supported IDs without demanding a complete proof. `checkDerivationReference` returns either `missing` or a fresh versioned checker report computed from the saved statement, enabled IDs and reference. A checked reference is not necessarily accepted. Publication will require `report.status === "accepted"` inside the owning transaction; an old report or a trusted-looking client field cannot substitute for that check.

`derivationContent` explicitly whitelists the statement, format/version requirements and effective rules. It excludes the reference proof and explanation and returns independent parsed values. Its strict content schema rejects private fields rather than accepting a full instructor definition as ordinary content.

`derivationReferenceSolution` is a privileged helper for a caller that has already authorized answer access. It requires a freshly accepted reference and returns its proof/explanation in a separate strict solution schema. It does not authorize the caller, release grades or expose student-specific diagnostics. Owner draft editing can still retain/view raw unfinished reference work through a future private owner workflow; the solution projection is for accepted reference reveal.

These projections are staged helpers, not live student endpoints. Answer access will remain independent of student-proof feedback and grade release, as agreed. Instructor comments/review grades are not part of a reference definition.

## Persistence and current guards

The database's `ProblemDefinition` JSON union now includes an exact `DerivationDefinition` type and matching reference-step/block fields. Transport/database types are checked for mutual assignability. Existing `problems.definition` and `problem_versions.definition` JSONB columns already support the shape, so there is no migration, new column, trigger change or snapshot regeneration.

Direct database fixtures establish storage compatibility and existing immutable-version retention. A mutable draft may change its labels, statement, reference and explanation or be archived/restored without changing a pinned version. Existing version triggers reject updates/deletion of the entire snapshot, including its private reference JSON. These low-level fixtures do not enable publication or prove that the HTTP workflow accepts derivations.

The active `problemDefinitionSchema`, ordinary create/update contracts, `supportedProblemDefinition`, assignment selection/evaluation and truth-table dispatch remain guarded. No new persisted derivation rows are seeded through application workflows. A manually inserted staged row is not currently readable through the old owner serializer; do not use direct ORM writes as a rollout shortcut. Normal truth-table/conceptual content and historical results remain unchanged.

## Next slices

1. Add private owner authoring/read/preview workflows and type-specific projections, maintaining explicit assignment/student guards. Validate references against the saved configuration, recheck publication under the parent lock and preserve immutable version numbering/history. Update live response consumers coherently rather than widening a shared union and accidentally enabling unsupported evaluation.
2. Add the instructor Fitch/reference editor and effective rule/label controls, with incomplete draft saves, recoverable errors, archived locks and unsaved-work protection. Settle editor interactions before implementing them.
3. Verify owner/workspace isolation, reference privacy, concurrent edit/publication, and unchanged published format/rules/labels/solutions after draft edits. Finish branch verification/PR notes afterward.

Student proof workflows and graded assignment availability remain guarded through the planned 022–023 student/review milestone. This branch does not add instructor grade adjustments, numerical proof partial credit, alternative formats or general proof search.

## Slice 1 verification — October 30, 2026

`npm run check` passed type checks, 1,283 tests (357 engine, 687 API, 239 web) and production builds. The 26 new authoring cases cover storage/transport compatibility, incomplete drafts, fresh reference checks, label normalization/collisions, strict version/field bounds, custom-rule rejection, independent private/content/solution projections and unchanged active workflow guards. `npm run db:test` passed 216 PostgreSQL checks (159 database, 57 API/workflow), including four new derivation JSON/snapshot retention cases. Existing schema/snapshot, normal/demo and grading regressions passed.

Built Node ESM/CommonJS public-module smoke and standalone browser-contract bundling passed. Formatting, whitespace and local Markdown file-link checks passed. The frontend entry remains 499.24 kB, with no warning-threshold change. No migration, environment change, user development-database reset, browser walkthrough, new live authoring endpoint or derivation assignment acceptance is claimed. Existing Jest VM-module advisories remain.
