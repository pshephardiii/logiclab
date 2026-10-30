# Propositional proof checker: final branch verification

Date: October 30, 2026. Branch: `020-feat-propositional-proof-checker`. This verifies the standalone engine foundation, not a released derivation exercise workflow or exhaustive product QA.

## Automated checks

- `npm run check`: type checks, 1,257 tests (357 engine, 661 API, 239 web) and production builds passed. The branch adds 282 proof-related cases (253 engine and 29 API contract-consumer cases) over the preceding branch.
- `npm run db:test`: all 212 existing PostgreSQL checks (155 database, 57 API/workflow) passed, without failures/skips. These are regression checks for existing persistence, grading, billing, demo and job workflows; the branch adds no database schema or persisted proof workflow.
- Formatting, branch/working-tree whitespace and local Markdown file links passed.
- Root truth-table parsing, error messages, AST shapes, structural IDs and four-variable limits remain covered. Proof parsing has separate falsity/variable support. Production entry size is 499.24 kB without raising the warning threshold.
- The engine records its existing contracts-workspace dependency explicitly and builds it before standalone engine tests. The lockfile change adds no external library.

Tests cover the versioned 19-rule catalog and aliases; structural formula matching; proof-only contradiction parsing and limits; bounded incomplete transport/report consistency; exact local rule variants, permissions, citation counts, compound substitutions and near-misses; Fitch scope/closure/references, malformed/cyclic identities and resource limits; and whole-proof premise correspondence, local-versus-upstream validity, unused errors, final-root targeting and deterministic failure reports.

Complete proof cases exercise the line-based rules, nested/one-line conditional proofs, proof by cases, negation introduction and classical proof by contradiction. A locally correct step depending on an earlier error remains locally correct with invalid support. A valid target with an unused error remains established while the submission requires review. No resource-limited check becomes an automatic zero or a successful partial acceptance.

## Built-package verification

A fresh Node 24.21.0 process exercised the built public `@logiclab/logic-engine/proof` entry through both ESM and CommonJS, alongside root parsing and contracts. Eight synthetic cases verified:

1. Valid modus ponens is accepted.
2. A locally valid final modus ponens with invalid upstream support requires review and does not establish the target.
3. An unused erroneous line requires review while an independent final target remains established.
4. A one-line assumption block correctly supports conditional introduction.
5. A closed-subproof interior cannot leak into a root-level reiteration.
6. An unsupported catalog version is unassessable.
7. Oversized input is rejected as a resource failure.
8. Malformed raw input is unassessable.

Every result passed the shared report schema; ESM/CommonJS results agreed and inputs were preserved. Existing authored problem-definition schemas still rejected derivations. This process used no API server, database, browser, network provider or credentials. Local scripts/logs live in ignored `.codex-local/verification/proof-checker/`; the smoke is evidence rather than a new CI suite.

## Delivered behavior and boundaries

The standalone `checkProof(unknown)` function composes raw-data preflight, strict contract validation, problem premise/rule validation, formula parsing, Fitch structural analysis, local inference checking, dependency propagation and exact final-root target evaluation. Reports separate local validity, support validity, target establishment and overall acceptance/review/unassessable status. It does not search for a proof, compare against an instructor reference, assign points or apply result-disclosure policy.

The classical catalog has separately selectable rules and stable IDs independent of suggested labels. The exact biconditional and discharge variants are specified in the [checker design](../planning/propositional-proof-checker.md). Falsity uses `⊥` or contiguous `_|_`, distinct from ordinary variable F. Existing table parsing still rejects it.

Transport uses flat UUID-referenced steps/blocks, retaining bounded incomplete work. Declared limits include 200 steps, 64 blocks, depth 16, 50 premises, 256 characters per formula, 500 diagnostics and 500,000 deterministic work units. Proof parsing permits all 26 uppercase variables with its existing grammar nesting bound. Work units are an implementation budget, not a wall-clock deadline or instruction counter. Failure is explicit; authoritative problem configuration must come from the caller's trusted pinned problem version for assigned work.

## Rollout and remaining work

No migration, new environment variable or live route is added. Rebuild matching contracts and engine consumers; the existing root import remains available and proof utilities use the separate `/proof` entry. Published derivation definitions, instructor references/editors, student proof saving/checking/submission and awarded grading are still unavailable. The existing problem-definition guard remains in place. This engine must not be exposed as a graded assignment workflow without the planned authorization, immutable snapshots, review and release integration.

Next planned branch: `021-feat-derivation-authoring`, beginning with versioned definitions/private reference contracts and persistence compatibility. Pin the format, catalog, permitted rules and effective labels; publication must require an accepted reference. Resolve label collisions/editor decisions before their dependent implementation. Keep graded student availability guarded through the student/review milestone in 022–023.

## Limits

No clean installation, remote CI query, hosted deployment, browser walkthrough, live Cognito/email/payment check, load/soak run or accessibility/browser matrix was performed. Browser UI did not change. Existing Jest VM-module advisories remain. Larger product QA and smaller issues are deferred as requested.

Only Fitch structure is implemented; dependency-style proofs and natural-deduction trees remain later branches. No predicate logic, arbitrary custom rule behavior, general equivalence replacement, proof search, numerical partial credit, instructor adjustment workflow or real payments were added. No infrastructure was provisioned, external messages sent, user development database migrated/reset, commit created or PR published by the agent.
