# Natural-deduction trees

Branch: `026-feat-natural-deduction-trees`, following the completed Fitch and dependency workflows. See [the agreed derivation sequence](logical-derivations.md#025-and-026-additional-formats). This is the slice record; broader documentation and PR notes wait until final verification.

## Confirmed representation — November 5, 2026

The user confirmed a **strict tree with explicit discharge**: the requested conclusion is at the root, supporting premises/assumptions are leaves, and inference nodes join their supporting branches. Repeated uses of a premise or assumption create distinct leaf occurrences, not shared graph nodes. This is natural deduction, not a truth tree/tableau.

The version-1 transport uses `format: "tree"`, a nullable `rootId` and a bounded flat `nodes` array. Stable UUIDs identify nodes independently of display position or array order. Flat serialization avoids recursive untrusted JSON. The later checker must enforce unique identities, acyclicity, one parent per non-root node, connectivity and bounded traversal. A draft can retain disconnected or malformed work for diagnosis; parsing a schema is not acceptance.

Nodes have these roles:

- **Premise:** formula plus the authoritative problem's `premiseId`. Repeated occurrences have distinct node IDs but can point to the same problem premise. An unused stated premise need not appear.
- **Assumption:** formula plus its own stable occurrence ID. Equal formulas do not make two occurrences interchangeable.
- **Inference:** conclusion formula, selected rule, ordinary child IDs in `lineReferences`, and discharged supporting subtrees in `branches`. These two operand lists correspond to the existing catalog's ordinary-line and subproof operands; they are not chronological citations or Fitch blocks. Zero-child rules such as excluded middle remain expressible.

Each discharged branch contains its supporting `rootId`, an explicit `assumptionFormula` and the `assumptionIds` of the leaves discharged there. A rule may discharge several occurrences of the same assumption formula within that branch. Each selected occurrence must actually be an open assumption leaf in that subtree and match the stated assumption formula. It cannot discharge a premise, a different branch's assumption or an assumption already discharged inside the subtree. Other open assumptions remain dependencies.

An empty discharge list represents **vacuous discharge**, retaining the explicit assumption formula so a rule such as conditional introduction can still be checked when its antecedent was not used. This follows the existing catalog's allowance for vacuous discharge, rather than adding a new rule variant. Multiple occurrences must be explicitly selected; matching formulas alone never closes assumptions automatically.

For disjunction elimination, one ordinary child proves the disjunction and two separate branches prove the common conclusion under their respective case assumptions. An assumption discharged from a case branch cannot disappear from the ordinary child or the other case. The existing local rule patterns determine the formula obligations; the tree adapter must separately validate structure and open-assumption support.

A fully accepted proof must establish the target at the selected root with no open temporary assumptions, pass all rule/permission/formula checks, and contain no disconnected or erroneous submitted work. All nodes remain subject to validation, so detaching a mistake is not a way to receive automatic full credit. Structural/resource/configuration failures must preserve the existing distinction between review-needed and unassessable outcomes; no invented zero grade or proof-search claim.

## Slice sequence

1. **Completed:** bounded standalone draft/input contracts and transport/admission regression tests. Retain blank/null edits and stable IDs; keep live definitions and student work unchanged.
2. **Completed:** iterative tree structure/reference analysis, branch-local discharge/open-assumption propagation and standalone checking through the existing formulas, catalog and reports. Test all catalog variants, repeated/vacuous/nested assumptions, cycles/shared children/disconnected work, support failures and resource limits.
3. **Completed:** tree definitions, exact database JSON types, private reference certification and owner persistence/library admission with compatible read-only reference handling. Require an accepted reference in the selected format; never relabel an existing Fitch/dependency reference.
4. **Completed:** instructor/reference editing and visual preview, rule labels and authoring validation. Preserve unsaved work and failed-write recovery.
5. **In progress:** staged student answer/save/check contracts, pinned evaluation and finished-attempt detection are complete. Next wire student persistence/transport and editors, followed by completion/finalization and review through the existing release/grading policies. Enable live assignment admission only after these workflows are verified.
6. Complete focused cross-format/demo/browser verification, rollout notes and the local PR draft. Keep student-created practice's remaining work in 027.

No automatic conversion, predicate logic, arbitrary instructor rules, truth trees/tableaux, numerical proof partial-credit algorithm or new UI framework is part of this branch.

## Slice 1 boundaries

`treeProofSchema` and `treeProofCheckInputSchema` are available from `@logiclab/contracts`. They reuse the existing UUID, formula, rule-ID, problem and size limits. They deliberately retain null selections, blank formulas, incomplete/disconnected nodes and incorrect references for later checker diagnostics, while rejecting unsupported transport versions, extra fields and oversized data.

This slice does not add a checker, database type/migration, API handler, authoring/student editor, publication/assignment admission or demo template. Existing Fitch/dependency contracts remain separate and continue rejecting tree payloads. No development database changes are required.

### Slice 1 verification — November 5, 2026

Contracts builds (Node and browser targets), contracts type checks and API type checks passed. The focused tree/Fitch/dependency contract run passed 74 tests, including 26 new tree cases covering draft preservation, repeated premise identities, multi-occurrence/vacuous discharge shape, canonical UUIDs, strict fields, transport bounds and unchanged live admission. These are transport tests, not proof-validity tests; the standalone checker is the next slice.

Formatting and whitespace checks passed. No database or browser checks were repeated because this slice changes neither persistence nor UI. Full workspace verification remains for later integration/final verification.

## Slice 2: standalone structure and checking

`checkTreeProof` and `analyzeTreeStructure` are exported from `@logiclab/logic-engine/proof`. The checker returns the existing version-1 report with accepted/review-needed/unassessable outcomes; it does not award points or enable live tree assignments. Callers remain responsible for loading the authoritative pinned problem and enforcing authorization/disclosure.

The implementation is contained in `proof/tree/`:

- `input.ts` bounds and inspects plain flat data before schema parsing. It rejects unsupported versions/fields, oversized lists/text, object/list accessors, array holes and custom iterators without following arbitrary nested fields.
- `structure.ts` resolves UUID children independently of array order and traverses iteratively. Every submitted node must belong to the selected root, with no duplicate identities, shared children or cycles. Ordinary and discharged children both participate in that same strict-tree constraint. Discharge IDs must identify distinct assumption leaves; actual open support is checked separately. A null root/branch remains incomplete work. The existing 200-node transport bound also bounds possible tree depth without recursive traversal.
- `nodes.ts` evaluates children before parents, verifies authoritative premise correspondence and invokes shared local rule matching. It computes open-assumption sets from the submitted leaves, validates each discharge against its own branch's still-open occurrences and exact formula, and removes only valid selected occurrences. Equal formulas do not merge identities. Nested/vacuous/multi-occurrence discharge is supported; repeated/cross-branch/already-closed discharge cannot manufacture support. All children propagate invalid or unknown support even when a parent inference locally matches its rule.
- `check-proof.ts` composes input/configuration, structure, formula reading, evaluation and root-target checking under the shared deterministic work/diagnostic budget. Acceptance requires valid submitted work and an established root with no open temporary assumptions. Node reports retain the original node-array `stepIndex`, not traversal order or a display line number. Structural failures do not produce a partially accepted proof; resource/configuration failures remain unassessable.

All 19 existing catalog variants are available under explicit per-problem permission. Tree operands adapt to the existing ordinary/subproof formula obligations rather than implementing a separate rule library. Fitch/dependency entry points retain their format boundaries. No persisted definition/answer/result union, API, editor, migration or demo seed changes in this slice.

The user also required the [proof-editor interaction redesign](ui-ux-audit.md#required-before-deployment-proof-editor-interaction-redesign) in the planned UI branch before deployment. Numbered proof entry should append a confirmed line to a clean proof display; tree entry should use deliberate branch-building. This changes presentation while preserving proof data, explicit checks/saves, unsaved-work protection and grading/reference-release boundaries. Unconfirmed text must never be silently lost or omitted at submission.

### Slice 2 verification — November 5, 2026

Engine type checking/build and the complete engine suite passed: **558 tests**, including **90 new tree cases**. Existing Fitch/dependency regressions passed. Tests cover all catalog variants and direct-rule parity, malformed/unfinished input, authoritative premise checks, array-order/report identity, nested/repeated/vacuous discharge, cross-branch and already-closed assumptions, invalid versus unknown support, detached work, strict-tree constraints, maximum-depth iterative checking, bounded diagnostics and work exhaustion. Focused API contract regressions passed **74 tests**. Node/browser contracts builds passed through the engine pretest.

Built ESM/CommonJS public-entry smoke passed six accepted/review/unassessable checks, validated the accepted report schema and confirmed input preservation. Formatting, whitespace and local documentation links were checked. This is engine/contract verification rather than a full workspace or browser/product QA run; no database/browser checks were repeated because their workflows are unchanged. No user development database was migrated/reset. Next: tree-format private definitions and checked instructor-reference publication, with live student admission still guarded.

## Slice 3a: staged definitions and reference certification

`@logiclab/contracts/tree-derivation` now exposes separate tree content, private definition and privileged solution contracts. Definitions pin `format: "tree"`, version-1 checker/catalog, premises/conclusion, permitted rule IDs/effective labels, the matching tree reference and optional explanation. Shared statement refinements retain UUID normalization, unique premise/rule identities, normalized label-collision rejection and text bounds. The shared statement base includes the staged format, while every existing live format schema still narrows its own literal explicitly.

`application/problem/derivation/tree/authoring.ts` validates configuration, checks the exact reference with `checkTreeProof`, requires acceptance for publication certification, projects ordinary content without reference/explanation and requires acceptance for privileged solution projection. Labels do not define inference behavior. Missing, rejected and unassessable references cannot certify publication or produce a solution; callers still own the saved-row lock and authorization/release decisions.

Exact exported database types describe tree nodes, branches, proof and private definition independently of transport types. Compile-time bidirectional assertions check that their fields match. These are staged types, not additions to entity definition/answer/result unions, and introduce no schema migration.

Persistence/library admission is deliberately a separate next slice: the current library union feeds existing frontend editors, reference previews and assignment dispatch directly. Widening it before compatible handling would send tree data into Fitch/dependency assumptions. The live library/publication/student boundaries continue rejecting trees; no HTTP endpoint or editor uses the new certification helpers yet. The next slice will connect owner persistence/checking/publication with explicit client compatibility before enabling tree editing. Assignment admission remains guarded until student/review workflows are ready.

### Slice 3a verification — November 5, 2026

Contracts (Node/browser) and database-package builds passed, along with contracts, database, API and web type checks. Focused authoring/library/tree-contract tests passed **112 cases**, including **26 new tree-authoring cases** for exact types/JSON, incomplete drafts, acceptance rechecking, open assumptions, resource rejection, private projections, terminology/identity constraints, cross-format rejection and unchanged live admission. The complete engine regression suite passed **558 tests**.

The new package subpath passed Node ESM/CommonJS and bundled browser smoke. Formatting, whitespace and local documentation targets were checked. No PostgreSQL/browser journey or full workspace check was repeated for these staged contracts/helpers; no entity metadata, persisted data, UI, environment or demo template changed. No development database was migrated/reset. Branch work remains in progress.

## Slice 3b: owner persistence, publication and client compatibility

The owner library and database definition unions now include trees. Existing save/read/archive/history routes use format-specific validation, and saved reference checks dispatch to `checkTreeProof`. Publication rechecks the authoritative saved statement, rules and reference under the existing problem lock before constructing an immutable version. No new endpoint or migration is required; tree definitions use the existing JSON storage.

The frontend can read and retain saved tree definitions, edit their statement/rules/explanation, explicitly check the current or saved reference, and display draft/version references safely. A flat read-only node summary tolerates unfinished/cyclic draft references without recursive rendering; it identifies root, supporting nodes and explicit discharge. Tree references never reach the Fitch editor. Tree construction/selection as a new format waits for the next editor slice. Confirmed format changes can discard a saved tree reference, while cancellation preserves it and failed saves retain edits.

Tree assignment admission remains explicitly unavailable for graded, completion-only and private practice. The assignment picker filters tree versions while retaining pagination and supported publications. Server assignment validation rejects bypasses before saving an assignment; student projections and direct saves also fail closed rather than falling through to Fitch processing. Owner publication does not grant student access.

### Slice 3b verification — November 5, 2026

Focused API tests passed **200 cases** across problem authoring/routes and tree transport. Focused frontend tests passed **56 cases**, including new saved-tree editing/checking/failed-save/format-change, read-only malformed-draft rendering and guarded picker pagination coverage. Contracts, database, API and web type checks passed; contracts/database builds passed.

Focused PostgreSQL authoring/HTTP tests passed **14 cases** across Fitch, dependency and tree definitions. They cover owner-scoped draft/history/archive behavior, missing/stale/accepted reference certification, publication/edit races, immutable snapshots, invalid-edit rollback, all-mode tree assignment rejection, normal/demo HTTP routes, cross-visitor privacy and demo transaction rollback. Tests used disposable isolated schemas and cleaned them up. The initial sandbox-blocked database connection was rerun with local database access and passed. No user development database was migrated/reset.

Formatting, whitespace and local documentation links were checked. No real-browser walkthrough, full workspace run or demo template update was performed for this slice. Tree reference construction and student workflow admission remain unfinished; next is the instructor tree editor/preview, followed by student/review integration. The separately planned proof UX redesign remains required before deployment.

## Slice 4: instructor tree reference editing and preview

Natural-deduction tree is selectable in the instructor problem form. Starting creates one unverified inference root from the current target; subsequent statement edits never rewrite entered formulas. Instructors add separate premise/assumption/inference occurrences, explicitly select the conclusion root, ordinary supports, discharged branch roots/formulas and assumption occurrences. Copying a selected statement premise into a leaf is explicit. Rule changes preserve existing operands and unresolved IDs remain visible rather than being redirected.

`features/proof/tree/` contains the bounded editor helpers, editor/node/inference controls and a visual preview. Supports appear above their conclusion with instructor rule labels, bracketed assumptions and explicit discharge annotations. The preview draws entered work without verifying it; only the existing explicit check actions produce diagnostics. A bounded iterative layout tolerates incomplete links and reports unattached nodes. Cycles/shared nodes stop the drawing without deleting draft data; duplicate identities disable editing and remain inspectable through the flat summary. Draft/version reference previews use the same drawing with no editing controls.

Node and whole-proof deletion require confirmation. Removing a node preserves incoming links, discharge selections and the root ID as unresolved until explicitly repaired. Format cancellation preserves the entire proof; confirmed changes clear the reference without conversion. Parent form state retains edits after failed saves and registers unsaved work. Archived drafts disable editing. Live tree assignment/student admission remains guarded.

### Slice 4 verification — November 5, 2026

Focused frontend tests passed **64 cases**, including **14 new helper/editor cases** for identity-proof construction/checking, explicit copying, stable identity, missing-reference deletion recovery, failed-save retention, rule changes, archive locks, format cancellation, unsafe preview graphs and maximum-depth iterative layout. Web type checking and production build passed. The existing Vite entry warning remains (501.58 kB; the threshold was not raised). Formatting, whitespace and local documentation targets passed.

Focused headless Chrome against real temporary local APIs and an isolated disposable schema passed UI tree authoring, explicit local/saved checks, save/publication/reload, draft preview, format cancellation, Stay retention, cancelled/confirmed node deletion, unresolved-reference checking and immutable version history. At 390px, the page did not overflow horizontally; browser storage remained empty and no uncaught page errors were recorded. Temporary servers and schema were cleaned up. The browser script was corrected to wait for the navigation dialog to close before resuming input; its final run passed.

Local evidence: `.codex-local/verification/tree-authoring/browser.cjs` and `authoring-mobile.png` (ignored, not browser CI). This is focused authoring verification, not a full accessibility/browser matrix, load run, student journey or full workspace check. Backend checker/persistence code did not change in this slice; no migration or user development database changes were made. The existing pre-deployment proof interaction redesign remains scheduled for the UI audit. Next: student editing/saving/checking and finalization/review integration under the established release policies.

## Slice 5a: student answer and evaluation foundation

`@logiclab/contracts/tree-derivation-work` defines a strict student tree answer plus revisioned save and explicit-check envelopes. Student answers contain only the entered tree, not a replacement statement, permitted rules, reference, explanation, report or grade. Incomplete/null selections and incorrect formulas remain saveable draft data. A separate exported database answer type matches the transport fields exactly without widening the persisted attempt-answer union yet.

`application/student-work/tree-response.ts` validates the answer shape and evaluates it against caller-loaded pinned public content. Evidence uses the existing occurrence/version-bound `derivation_v1` report; no reference proof, explanation, numerical award or write is produced. The caller still owns enrollment, workspace scoping, saved-row locks and feedback/reference disclosure. The helper rejects private definitions passed as public content and does not compare student work to an instructor reference.

`isFinishedTreeProofAttempt`, exported from the proof and completion entries, separately recognizes a filled strict tree with a selected, non-assumption root matching the target. It requires known supplied premise identities, filled formulas, permitted rules, exact operand counts, connected unique nodes and selected existing children/assumption identities. Missing fields, cyclic/shared graphs and invalid configuration/resource limits return false. Intermediate formulas must be filled, but their syntax/correctness and the logical correctness of discharge remain verification questions. An empty discharge selection remains an explicit vacuous-discharge attempt, not an automatically filled answer.

As agreed for completion-only work, a finished attempt may still contain a wrong rule application, false premise claim, malformed intermediate formula or open/incorrectly discharged assumptions. Fresh proof verification must flag that work after submission; completion is not a correctness grade. This helper alone does not finalize work, expose pre-submission diagnostics or create instructor grading requirements for score-free completion.

This slice stages those boundaries only. Existing save/check HTTP schemas, persisted attempt unions, student projections, public assignment admission and finalization dispatch remain guarded. The next slice connects the actual student save/check/read/editor flow; later finalization/review must retain the independent release rules before tree assignments are admitted publicly.

### Slice 5a verification — November 6, 2026

Contracts (Node/browser), engine and database-package builds passed. Contracts, engine, database and API type checks passed. Focused tree/Fitch/dependency response tests passed **84 cases**, covering exact answer types, revision/transport limits, rejected injected fields, pinned evaluation, occurrence binding, reference privacy, input preservation and unchanged live admission. The complete engine suite passed **583 tests**, including **25 new tree-completion cases** separating filled work from verified work and covering malformed/unfinished structure, wrong logical steps, vacuous/open discharge, selected-root semantics and resource/configuration failure.

Node ESM/CommonJS and bundled browser smoke passed for the new answer contracts and completion entry. Formatting, whitespace and local documentation targets were checked. No full workspace run, database integration run or browser journey was repeated for this staged pure-contract/evaluation slice. No live endpoint, UI, database entity/migration, demo template or development data changed. The branch remains in progress.
