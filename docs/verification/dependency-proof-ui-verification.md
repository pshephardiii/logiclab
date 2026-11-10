# Dependency proof UI verification

Branch: `029-chore-dependency-proof-ui` (renamed from `029-chore-ui-ux-audit`). Application checkout: `cfa260f`, with documentation-only closeout updates. Recorded November 10, 2026.

## Scope

This branch refines dependency proof entry across independent practice, instructor reference authoring, assigned work and read-only views. It also includes shared visual/navigation foundations, proof help and notation, clearer dependency target diagnostics, and problem-library authoring/publication improvements. It does not complete the general UI audit or the Fitch/tree editor redesigns.

The chronological [UI audit record](../qa/ui-ux-audit.md) contains findings, screenshots, focused checks and their individual limitations. The [updated plan](../planning/ui-ux-audit.md) records the remaining work and branch sequence.

## Final automated verification

- `npm run check` passed: workspace type checks, 2,172 tests (587 engine, 1,051 API, 534 web), and production builds.
- `npm run db:test` passed: 318 PostgreSQL checks (184 database, 134 API/workflow), with no failures or skips. This includes the new owner/page-scoped publication-summary coverage and existing proof, grading, release, billing and demo regressions.
- Formatting, working-tree/branch whitespace and local Markdown file targets were checked during closeout.

Ignored local logs: `.codex-local/verification/dependency-proof-ui/check.log` and `db.log`. Existing Jest VM-module advisories remain.

After closeout review, straightforward frontend extractions separated assigned-editor selection, rule choices/grouping, dependency justification/assumption-guide rendering, discharge-entry construction, premise/metadata fields and reference-statement validation. State, focus, pending-entry and disclosure ownership remain with their existing components. The frontend type check, all 534 existing frontend tests (`--maxWorkers=4`), production build and formatting passed again; no test changes were needed. Logs use the `refactor-` prefix in the same ignored verification directory. The full workspace/database results above precede these frontend-only extractions; no browser sweep was repeated for them.

## Focused browser evidence

Earlier slices used local Chrome and temporary isolated schemas to check growing dependency proofs, entry confirmation, line actions, modal deletion, sorted dependencies, assumption guides, rule selection/reference, notation conversion, feedback and retained work. Follow-up checks covered the shared authoring/student contexts and the separate reference-authoring step.

The latest authoring passes checked confirmed premise entry with exactly one source and no phantom blank source; stale-reference warnings and consented restart; true/false and multiple-choice field spacing; published-first library selection, immutable snapshot versus changed draft, explicit editing, publication success and badges; shared practice checking; and 390px/320px layouts without document overflow or uncaught page errors. Temporary browser servers/schemas were cleaned up. Evidence lives under `.codex-local/ui-audit/029/authoring-polish/` and `authoring-polish-spacing/`; other slice paths are in the audit record.

These are prior focused passes, not a repeated full browser sweep at closeout. The initial inventory covered 49 route/state combinations with 125 screenshots. Its normal-account views used synthetic authentication/read-only fixtures; those captures do not establish live Cognito behavior. Some focused failure checks used injected responses, identified in the audit record.

## Rollout and limits

No migration or environment variable is added. Rebuild/restart matching contracts, API and frontend outputs: library list responses now include publication summaries. Existing drafts and published content remain separate; reference restart requires confirmation. No user development database was reset or migrated during closeout.

This is focused usability/regression evidence, not exhaustive product QA or accessibility conformance. No fresh clean install, remote CI query, hosted deployment, live Cognito/email/payment verification, screen-reader/multi-browser matrix or load/soak run was performed. Shared fixes also affect Fitch/tree consumers, but their full editor redesigns remain for 030/031. Assignment dates/status/settings/content views and instructor default rule-label preferences are planned, not delivered here. The renewed general audit follows those proof branches before the portfolio sandbox.
