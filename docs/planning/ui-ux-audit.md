# UI and UX audit

Status: the proof UI branches 029–031 are delivered. On November 12, 2026, the user split the remaining whole-product audit into journey-focused branches. Current: `032-chore-practice-ui-audit`, using the [practice checklist](../qa/practice-ui-checklist.md). Next, disable and explicitly rename the retained natural-deduction tree method on 033; plan semantic tableaux separately. Demo teaching flow and genuine-account product review remain follow-ups with numbering to be reassigned. Earlier branch names below are historical sequencing. This is **not** a completed product/accessibility audit or deployment authorization.

The branch follows [branch conventions](../conventions/branch-naming-conventions.md). Keep historical branch numbers intact when updating the remaining release sequence.

## Remaining audit branches — agreed November 12, 2026

1. **`032-chore-practice-ui-audit`**: anonymous truth tables and self-created Fitch/dependency proofs, using the [checklist](../qa/practice-ui-checklist.md). Natural-deduction tree UI cases are deferred by the November 12 audience/method decision. Conceptual questions remain assigned content.
2. **`033-chore-disable-natural-deduction-trees`**: guard the retained method across normal/demo UI and server admission, preserve authorized historical reads and rename ambiguous format-specific files, directories and symbols. See the [availability and naming plan](proof-method-availability.md). Semantic tableaux require separate planning/implementation and are not a rename of this checker.
3. **Demo teaching-flow audit — number to be reassigned**: instructor authoring through assignment settings/publication, student attempts/submission, instructor grading/feedback and student result/reference access. Include truth tables, conceptual questions and enabled proof methods. Address the assignment backlog in focused slices; split further if necessary.
4. **Genuine-account product audit — number to be reassigned**: signup/confirmation, login/recovery, normal classes/invitations/enrollment, assignment access, billing simulation and normal/demo boundaries. Distinguish simulator billing from real charges.

The earlier proposed `033-chore-demo-teaching-flow-audit` and `034-chore-account-product-ui-audit` numbers are superseded. Sequence the dedicated semantic-tableaux planning/feature branches after 033, then allocate the remaining audit numbers.
Then prepare the inexpensive portfolio sandbox and run a short hosted smoke check. Confirm unused numbering when creating subsequent branches. Shared fixes may benefit other journeys, but do not expand a branch into another whole-product review. Each branch records its own checks, findings and explicit deferrals. Do not rewrite the historical 029–031 evidence or interpret this plan as permission to deploy.

## Goal and boundaries

Review the product as a whole so a first-time student, instructor or demo visitor encounters a coherent interface. Functional QA checks individual journeys and fixes reported issues; this audit evaluates consistency across those journeys, including the states between actions.

Agree a visual direction, supported browser/device matrix and measurable accessibility target before implementation. Define typography, spacing, colors, action hierarchy and focus conventions from actual screens. A target is not a claim of accessibility conformance; record what was tested and what remains unverified.

Keep product features, backend architecture refactors and a wholesale UI-library migration outside scope. Preserve authorization, solution-release policies, explicit saves, immutable submissions, unsaved-work protection, normal/demo isolation and reduced-motion behavior. If a redesign needs a product-policy change, record it separately before implementation.

## Review scope

- **Visual consistency:** typography, spacing, alignment, content widths, colors, borders, forms, tables and primary/secondary/destructive actions. Check truth values, correctness feedback and solutions remain distinguishable without relying on color alone.
- **Accessibility:** keyboard-only journeys, visible focus, dialog focus containment/restoration, accessible names/descriptions, errors and announcements, contrast, zoom and reduced motion. Include assistive-technology testing against the agreed target and document any missing coverage.
- **Navigation and task flow:** clear entry points, next actions, current location, role boundaries, predictable Back/Forward behavior and recovery. Include demo role switching and normal-account navigation; avoid redundant controls or misleading enabled/disabled actions.
- **State coverage:** initial/empty, loading, pending validation, success, errors, retry, disabled, read-only, unsaved edits, final submission and expired sessions. Confirm transitions are understandable and preserve work as intended.
- **Responsive behavior:** short desktop viewports, mobile widths, enlarged text/zoom and dense problem/assignment tables. Constrain necessary horizontal scrolling to the table instead of the whole page.
- **Teaching clarity:** consistent labels, keyboard notation guidance, instructions and distinction between independent practice, private assignment practice, completion-only and graded work.

Cover anonymous practice, demo entry/lifecycle, normal accounts, class management/enrollment, problem-library authoring/history, assignments/duplication, student work, instructor review, simulated billing and error/not-found pages. Use synthetic data and exercise both normal/demo variants where their UI differs.

## Small delivery slices

1. Inventory routes, reusable controls and relevant states. Capture baseline screenshots and identify recurring issues. Agree the visual/accessibility direction and prioritize findings before changing styles broadly.
2. Fix shared layout, navigation, typography and form/action patterns in focused commits. Check their consumers together rather than restyling one page in isolation.
3. Refine dense domain screens, mobile layouts and state transitions. Preserve existing workflows; record before/after screenshots tied to each finding and commit.
4. Run keyboard, focus, reduced-motion, zoom, assistive-technology and browser checks. Add or update regression tests for behavior changes; do not create tests that merely mirror CSS values.
5. Retest affected end-to-end journeys, resolve or explicitly defer findings, update conventions where reusable decisions emerge, and prepare a local PR draft with evidence and limitations.

Keep fixes reviewable even if the complete audit spans many screens. Resolve one coherent issue per slice; let the user handle commits. Use the existing [QA evidence discipline](../qa/findings-and-changes.md) with a separate run/audit record so current functional QA results are not overwritten.

## Completion criteria

- Every inventoried core page/state has been reviewed against the agreed scope, with reproducible findings and traceable resolutions or explicit deferrals.
- Shared controls and terminology follow the agreed visual direction; any exceptions have a reason.
- Agreed keyboard, responsive, accessibility and browser checks have recorded outcomes, including untested areas. Screenshots alone do not establish accessibility or correct focus behavior.
- Changed behavior has appropriate regression coverage and relevant automated checks pass. No functional case is inferred to pass from visual review alone.
- Before/after evidence and outstanding limitations are ready for review; no open blocking usability/accessibility issue is silently carried into deployment.

New feature branches completed after this audit require a focused UI review before deployment; the audit is evidence for a particular checkout, not a permanent guarantee.

## Carry-forward finding: workspace navigation prominence

During QA on October 28, the user accepted separating site-wide and workspace navigation as an improvement, but found the workspace row insufficiently prominent as instructor navigation. Defer this visual hierarchy refinement to this audit rather than expanding the current QA slice. Explore stronger role labelling, contrast, placement or active-state treatment while retaining the two-level structure, normal/demo destination boundaries and accessible focus states. Include student navigation and desktop/mobile views in the review. No particular visual treatment has been selected yet.

## Required before deployment: proof-editor interaction redesign

Agreed November 5, 2026: redesign proof entry in this UI branch before initial deployment. For numbered proofs, show a clean proof display and a next-line entry area. Confirming **Add line** appends that line to the visible proof. Allow earlier edits, insertion and deletion with stable underlying identities and automatically updated display numbers. Explore the corresponding deliberate branch-building interaction for natural-deduction trees instead of forcing them into a numbered-line layout. Include instructor reference authoring, student editing and read-only review.

Scope updated November 10, 2026: finish the dependency-proof experience across independent practice, instructor authoring, assigned student attempts and read-only review on `029-chore-dependency-proof-ui`. Further Fitch and natural-deduction tree editor redesigns will use separate follow-up branches before deployment. Retain shared improvements already applied; this is a sequencing change, not a new checker or proof representation.

Preserve the existing backend proof representations, checker semantics, revisions and independent grading/reference-release policies. Adding a line confirms an editing action; it must not silently check correctness or reveal diagnostics withheld by the assignment policy. **Check proof**, saving and final submission retain distinct meanings.

Unconfirmed entry-row edits must count as unsaved work. Decide and clearly communicate whether Save includes that entry or requires confirmation first; final submission must never silently omit entered work. Test Stay/Discard, failed saves, earlier edits/deletion that break references, insertion/renumbering, keyboard entry/focus, mobile layouts and reduced motion. Keep the proof visible as it grows, with accessible announcements and predictable focus. Backend changes are not required merely to change this presentation; separately review any proposed change to transport or assessment policy.

This is a required usability deliverable for the planned UI branch, not an addition to the current checker slice or permission to deploy before it is complete.

## Future feature: instructor rule-label preferences

Provide an instructor settings page for preferred names/aliases by stable rule ID, so authors do not rename the same rules for every new derivation. Use those preferences as defaults for new problems, retain per-problem overrides, and keep effective labels pinned in published versions. Changing preferences must not rename existing published problems or student work. Plan this as a separate feature branch; no preferences storage or settings page is added by the current UI audit.

## Fitch delivery (030)

Fitch now has a visual proof with real nested-block guides, a confirmed next-line row, explicit assumption staging, line menus, scoped insertion and close/reopen actions. Subproof settings and line/subtree deletion use focused modals. Closing a block records an endpoint; the checker still decides scope/discharge validity. Unconfirmed entries block check/save/submission and remain protected on navigation. A stale entry cannot replace reloaded work.

Read-only submitted proofs, owner review and authorized references reuse the display without action/entry controls; ambiguous retained data remains inspectable. Instructor Fitch authoring uses details/reference steps, confirmed statement premises, grouped rules/labels, one-time source seeding, save/remount step retention and an explicit mismatch/restart flow. Shared authoring names/styles cover Fitch and dependency; the subsequent tree delivery is recorded below. No checker, grading/release, backend contract, database or demo-template change is introduced. [Focused verification](../verification/fitch-proof-ui-verification.md) is separate from the user's deferred general visual QA.

## Tree delivery (031)

Tree construction now uses the visual proof and one selected node's fields, staged **Add node** / **Discard entry**, three-dot actions and guided supporting-node/branch creation. Assumption formulas and discharged leaf occurrences remain explicit. A new connection is attached only on confirmation; occupied connections, the chosen root and existing identities are preserved. Unattached nodes remain selectable and unsafe layouts retain a repair list. Pending input blocks check/save/finalization and uses existing navigation protection; adding a node does not check or save.

All formats now use details/reference authoring steps and grouped rule/label settings. Tree statement premises form a confirmed source list; a fresh reference contains only an unverified conclusion root, without inserting every available premise. Existing trees survive statement changes, with explicit mismatch/Keep/Restart handling. Read-only references, submitted work and owner review use the diagram first, retaining unattached/unsafe work in inspectable lists. See [verification](../verification/tree-proof-ui-verification.md). No backend/checker/release change or demo-template upgrade is introduced.

## Next branch sequence after 029

These names use the next unused local/planned work numbers; confirm availability when each branch is created. This plan does not create or start any branch.

1. **`030-chore-fitch-proof-ui` — delivered**: carry the dependency editor's visual/interaction approach into Fitch practice, instructor reference authoring, student attempts and read-only review. Use a growing proof, deliberate entry confirmation, clear conclusion/help, line actions and modal deletion/settings. Adapt the presentation to real Fitch blocks, scope and discharge; retain checker semantics, stable IDs, explicit save/check/submit and release rules.
2. **`031-chore-tree-proof-ui` — delivered**: apply the same clarity to natural-deduction trees across those contexts. Make branch/node construction and explicit assumption discharge understandable; use tree-appropriate interactions rather than copying a numbered-line dependency editor. Build on the shared conventions and completed Fitch review.
3. **`032-chore-ui-ux-audit` — superseded by the journey split above**: the original plan was to resume the whole-product audit, including the assignment backlog below, shared form/navigation/state consistency, instructor review, account/billing/demo journeys and focused visual/keyboard/mobile/accessibility checks. Revisit unresolved baseline findings and any inconsistencies exposed by the proof branches. Keep the inexpensive portfolio sandbox after this work; report focused evidence and gaps without treating it as exhaustive contingency QA.

Existing shared improvements for all formats remain in place. Further Fitch/tree editor redesign is outside the closing 029 branch.

## Assignment UI backlog for the renewed general audit

Recorded November 10, 2026; **planned work, not implemented in 029**:

- **Student assignment lists:** show completion/submission state clearly, using authoritative saved attempt information. Distinguish final/completed work from pending instructor review or withheld results; private practice needs a meaningful saved/in-progress state because it has no final submission. Settle exact labels during implementation rather than inferring completion from local edits or correctness.
- **Due dates and ordering:** display assignment due dates and sort earliest due first, with stable ties and undated assignments grouped consistently (proposed: last). Due dates are not currently modeled in the assignment contracts/entities. Add the necessary authoring/data support and agree timezone/display semantics before wiring the list. Display/sorting must not silently introduce late-submission rejection or a new cutoff policy.
- **Assessment-mode labels:** make Graded, Ungraded practice and Completion only visible in student lists before opening an assignment, with consistent wording and non-color cues.
- **Instructor class-assignment lists:** provide the corresponding due dates/order and mode labels, plus publication/archive state and appropriate class submission/completion progress. Instructor-wide progress is different from one student's completion; do not present unreleased grades or treat a pending review as missing submitted work.
- **Assignment editing/settings:** move assessment mode, grade release and answer reveal to a separate settings page/step. Keep these independent policies understandable and mode-aware, preserve valid combinations/published locks, and retain unsaved edits and failed-write recovery across navigation.
- **Ordered-problem display:** link from assignment editing/settings to a dedicated content/view page instead of displaying all problems directly in the editor. Preserve occurrence order/IDs, repeated problems, pinned published versions and per-problem points; keep content viewing distinct from changing the assignment's structure/settings.

Split prerequisite data/policy work into focused slices if it exceeds the UI audit's scope. These items do not authorize a deadline-enforcement policy change, new deployment or an automatic expansion of 030/031.
