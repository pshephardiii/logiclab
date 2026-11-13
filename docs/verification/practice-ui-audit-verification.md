# Practice UI audit verification

Branch: `032-chore-practice-ui-audit`. Application baseline: `29fc76b`, followed by the presentation-only extraction noted below and closeout documentation. Final validation recorded November 13, 2026.

## Result and scope

The user accepted truth-table, Fitch and dependency independent-practice UI for this pass. The [practice checklist and findings](../qa/practice-ui-checklist.md) retain per-slice evidence and limitations; acceptance does not mark every checklist step as executed. Natural-deduction tree cases were deferred after clarifying that the target introductory method is semantic tableaux, not natural-deduction proof trees.

Practice navigation now exposes truth tables and derivations together. Fitch has inline editing, explicit nested Open/Close/Reopen controls, readable citation placeholders, grouped line menus and inclusive range deletion with modal preview/cancellation. Normal append stays inside the deepest open subproof until closure; earlier insertion and explicit scope repair remain available. Closure does not discharge an assumption or certify an inference.

Dependency controls gain complete-entry guards, grouped menus and exact range deletion without adopting Fitch block semantics. Independent dependency practice uses aligned formulas without vertical assumption guides or their extra indentation. Premise/Assumption labels, sorted dependency sets and discharge references remain visible. The guide-free display is practice-only; other shared dependency views retain their current defaults.

Self-created Fitch/dependency practice can edit the conclusion and original premises without resetting confirmed/pending proof work. Premise synchronization uses stable source identity. Assigned and instructor-reference statements do not receive those practice-only controls. Existing feedback is cleared after changes, hidden while editing a target or pending entry, and recomputed only on explicit checking.

Both entry flows require a formula, enabled rule and the rule's required citations before adding a new line. Staged citation slots preserve their positions; logical/syntax validation remains the checker's responsibility. Empty dependency sets remain allowed. Deletion preserves unresolved surviving references instead of silently retargeting them, and stale authoritative snapshots cannot be overwritten by pending entries/range deletion.

## Final automated checks

`npm run check` passed: type checks, **2,286 tests** (587 engine, 1,051 API, 648 web), and production builds. The initial sandbox run hit `EMFILE` in the API watcher regression; the complete rerun outside the sandbox passed, including that test.

- `npm run format:check`, branch/working-tree whitespace and changed local Markdown file targets: passed (176 local file targets; heading anchors were not checked).
- Final logs are local: `/private/tmp/practice-audit-final-check.log` (initial failure), `/private/tmp/practice-audit-final-check-unrestricted.log` (passing rerun), and `/private/tmp/practice-audit-final-format.log`.
- After code review, extracted Fitch scoped formulas, justifications and entry controls, dependency full-removal confirmation and shared range-selection help into controlled components. State, mutation ordering, focus effects, callbacks, DOM structure and styling remain with their existing owners/semantics. All 648 frontend tests and frontend type checking/production build were rerun successfully after this extraction; existing behavior tests cover the moved code without new tests tied to file boundaries. No additional browser or backend run was performed for this presentation-only cleanup.
- No API, persistence, shared contract, logic-engine or database schema code changed. PostgreSQL checks were not repeated for this frontend/planning branch.
- Existing Jest VM-module advisories remain; no warning threshold or test configuration was weakened.

Tests cover nested scope/closure/reopening, insertion-to-append transitions, pending and stale snapshots, exact/reverse/full/middle ranges, modal Keep/Escape/focus, grouped menus, missing references, stable premise identity, target editing/validation, complete-entry requirements, empty dependency sets, explicit checks, practice-only presentation and shared authoring/assigned-work behavior.

## Browser and user evidence

Earlier focused headless Chrome runs used temporary local Vite servers and the actual frontend/proof engine. Only signed-out bootstrap API responses were intercepted. They covered Fitch construction/checking, explicit closure/reopening, inline editing, disjunction introduction, deletion/ranges, grouped submenus, target editing, citation gating and dependency construction/deletion. Runs checked desktop and 390px/320px page bounds, focus/Escape behavior and absence of uncaught page errors. Proof tables retain horizontal scrolling on narrow screens.

Ignored scripts/logs/screenshots live under `.codex-local/ui-audit/032/`: `fitch-editing`, `fitch-range`, `fitch-submenus`, `practice-conclusion`, `fitch-entry-requirements` and `dependency-range`. Representative desktop/mobile captures were inspected during implementation. Temporary Vite/Chrome processes were stopped; user API/frontend servers and databases were not changed. These are earlier slice checks, not a final browser sweep or browser CI.

The later Fitch append-scope correction and guide-free dependency practice display have targeted automated coverage and subsequent user acceptance of the practice UI; no additional agent browser run is claimed for those final corrections. Shared authoring/student controls have regression coverage, but no live assigned/instructor browser journey was repeated here.

## Rollout, limits and next sequence

Rebuild/deploy the frontend to adopt the controls. No migration, environment change or demo template upgrade/reset is required. Existing route/resource scopes, explicit saves/submission, immutable results and independent grade/answer release policies remain intact.

This is a focused practice audit, not exhaustive product QA or accessibility certification. No fresh clean install, remote CI query, hosted deployment, live Cognito/email/payment verification, screen-reader/multi-browser matrix, complete zoom/contrast audit or load/soak run was performed. Truth-table acceptance is the user's visual assessment, not a repeated agent truth-table API/browser suite. No infrastructure was provisioned or external messages sent.

Next: `033-chore-disable-natural-deduction-trees` guards new use and clarifies names while retaining code/history. Proposed `034-feat-semantic-tableaux` adds truth trees as a distinct method, then proposed `035-chore-truth-tree-practice-ui-audit` refines their independent practice UX. Resume demo teaching-flow and genuine-account product audits afterward, followed by portfolio sandbox preparation. Confirm numbering if tableaux implementation is split. See the [proof-method plan](../planning/proof-method-availability.md) and [UI sequence](../planning/ui-ux-audit.md). No next branch, PR publication or deployment is started by this record.
