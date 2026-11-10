# UI and UX audit

Status: in progress on `029-chore-ui-ux-audit`, updated November 9, 2026. The first read-only slice captured the baseline and prioritized findings in the [UI/UX audit record](../qa/ui-ux-audit.md). The user accepted a calm academic direction, desktop-first with usable mobile layouts, and Chrome as the initial browser baseline. Implementation and broader accessibility/browser verification remain pending. Perform before public deployment, including the required proof-editor interaction redesign. Keep it distinct from the correctness/code-structure audit; this plan does not authorize deployment.

The branch follows [branch conventions](../conventions/branch-naming-conventions.md). Keep historical branch numbers intact when updating the remaining release sequence.

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

Scope updated November 10, 2026: finish the dependency-proof experience across independent practice, instructor authoring, assigned student attempts and read-only review on `029-chore-ui-ux-audit`. Further Fitch and natural-deduction tree editor redesigns will use separate follow-up branches before deployment. Retain shared improvements already applied; this is a sequencing change, not a new checker or proof representation.

Preserve the existing backend proof representations, checker semantics, revisions and independent grading/reference-release policies. Adding a line confirms an editing action; it must not silently check correctness or reveal diagnostics withheld by the assignment policy. **Check proof**, saving and final submission retain distinct meanings.

Unconfirmed entry-row edits must count as unsaved work. Decide and clearly communicate whether Save includes that entry or requires confirmation first; final submission must never silently omit entered work. Test Stay/Discard, failed saves, earlier edits/deletion that break references, insertion/renumbering, keyboard entry/focus, mobile layouts and reduced motion. Keep the proof visible as it grows, with accessible announcements and predictable focus. Backend changes are not required merely to change this presentation; separately review any proposed change to transport or assessment policy.

This is a required usability deliverable for the planned UI branch, not an addition to the current checker slice or permission to deploy before it is complete.

## Future feature: instructor rule-label preferences

Provide an instructor settings page for preferred names/aliases by stable rule ID, so authors do not rename the same rules for every new derivation. Use those preferences as defaults for new problems, retain per-problem overrides, and keep effective labels pinned in published versions. Changing preferences must not rename existing published problems or student work. Plan this as a separate feature branch; no preferences storage or settings page is added by the current UI audit.
