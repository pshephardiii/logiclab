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
3. Add immutable tree definitions, private reference certification and persistence/library integration. Require an accepted reference in the selected format; never relabel an existing Fitch/dependency reference.
4. Add instructor/reference editing and preview, rule labels and authoring validation. Preserve unsaved work and failed-write recovery.
5. Add student editing, revisioned saves, explicit checks, completion/finalization and instructor review through existing independent release/grading policies. Enable live assignment admission only after these workflows are verified.
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
