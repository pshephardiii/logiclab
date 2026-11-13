# Natural-deduction tree availability and retained-history verification

Date: November 13, 2026. Branch: `033-chore-disable-natural-deduction-trees`.

## Resulting behavior

Fitch and dependency proofs remain available. Natural-deduction trees are unavailable for new application work in normal and demo scopes. They are not semantic tableaux (truth trees); tableaux remain planned separately. The retained checker, contracts, editors and historical records remain available for future development and authorized historical review.

Owner create/edit/publication, assignment admission/duplication and student save/check/finalization enforce the policy on the server after existing authorization. Mixed assignments containing an unavailable item are wholly unavailable for new student work; no item is silently dropped. Rejected mutations leave fields, attempts and revisions unchanged. Previously finalized submissions can replay their frozen result without regrading. Historical reads, archive/restore, authorized solutions, instructor review/adjustments and independent grade/answer release retain their existing rules.

The UI removes unavailable format choices and publication versions, explains retained read-only work and suppresses new-work controls. Publication pagination uses the original offsets: an unavailable current draft/version does not hide older supported versions. Demo template 8 contains Fitch/dependency examples and 40 graded proof points. New/reset visitors receive it; existing visitors retain their data until explicit reset, under the original absolute workspace deadline.

## Automated checks

- Final `npm run check`: workspace type checks, **2,294 tests** (587 engine, 1,067 API, 640 web) and production builds passed. The run used normal process access outside the sandbox for the native watcher regression.
- Final `npm run db:test`: **315 PostgreSQL checks** passed (184 database, 131 API/workflow). Disposable test schemas cover normal/demo admission, ownership, mixed work, transactional rollback, final replay/release, retained history and template upgrade/reset/isolation. No user application database was migrated or reset.
- Earlier built CommonJS/ESM entry smoke verified the explicit schemas/checker/completion names, unchanged stored `format: 'tree'` payload acceptance, unavailable admission and removal of the old package entry. All 45 moved tracked implementation/test files had matching new paths.
- Formatting, branch/working-tree whitespace and changed-document local file targets passed at closeout. Link checks verify files, not heading anchors.

Final automated logs are local: `/private/tmp/availability-final-check.log` and `/private/tmp/availability-final-db.log`. Existing Jest VM-module advisories remain; no warning threshold or test configuration was weakened.

## Focused browser evidence

Headless local Chrome used the actual frontend and proof engine with **schema-validated synthetic session/resource API responses**. This is frontend evidence, separate from the real PostgreSQL HTTP tests above. No live account, backend session or historical user data was used.

- Anonymous practice offered only Fitch/dependency and checked a valid `P`-from-`P` Fitch proof with the real engine.
- Normal and demo instructor pages displayed retained library statements and private reference diagrams without save/publication controls. Retained assignments were read-only, could not duplicate/publish, and kept archive controls enabled.
- In both scopes, a publication page containing only an unavailable version exposed no Add action. Loading its next page exposed the older supported Fitch version.
- Normal and demo student pages kept both items of a mixed assignment visible read-only, suppressed save/check/finalization and rendered the saved natural-deduction tree diagram. Desktop, 390px and 320px captures had no page-level horizontal overflow.
- No uncaught page errors, unexpected API requests, resource writes or browser-storage entries occurred. Temporary Vite/Chrome processes were stopped; existing user servers were left alone.

Ignored fixture generator, smoke script, log and captures are under `.codex-local/verification/natural-deduction-tree-availability/`. Representative instructor/student captures were inspected. These scripts are local evidence, not browser CI or exhaustive visual QA.

## Rollout and limits

Rebuild/restart matching contracts, engine, database package, API and frontend outputs. Format-specific modules/symbols use explicit natural-deduction-tree names, including `@logiclab/contracts/natural-deduction-tree-derivation` and `@logiclab/contracts/natural-deduction-tree-derivation-work`; old-name package entries have no compatibility aliases. Stored tags, fields, IDs, versions, results and migration history are unchanged. No migration or environment change is required. Existing demo visitors upgrade only on explicit reset; restoring retained work does not re-enable new work.

This verifies the availability boundary, not full product QA. No clean installation, remote CI query, hosted deployment, live Cognito/email/payment check, screen-reader/multi-browser matrix or load/soak run was performed. Historical browser pages used intercepted data; backend lifecycle/disclosure guarantees come from automated HTTP/database coverage. Underlying natural-deduction trees remain retained implementation, not an active product method. No semantic tableaux, infrastructure provisioning, PR publication or next branch was started.

Next proposed branch: `034-feat-semantic-tableaux`. Agree decomposition, closure, completed open-branch counterexamples and authoring/feedback/grading semantics before dependent implementation. Split delivery if needed, then perform dedicated truth-tree practice UI QA and resume the demo/account audit sequence. See the [availability plan](../planning/proof-method-availability.md#following-work).
