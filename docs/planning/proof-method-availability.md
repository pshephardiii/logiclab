# Proof-method availability and unambiguous naming

Decision: November 12, 2026. **Planned, not implemented.** Current practice UI work remains on `032-chore-practice-ui-audit`.

## Audience and terminology

LogicLab targets introductory logic/philosophy. Fitch and dependency-style natural deduction remain active proof methods. The existing tree implementation is a **natural-deduction proof tree**: inference nodes connect supporting derivations to a conclusion, with explicit assumption discharge. It is not a semantic tableau. Its implementation and verification remain historical evidence, not a commitment to offer it in the introductory product.

**Semantic tableaux**, also called **truth trees**, are wanted as a separate method. To test argument validity, begin with the premises and the negation of the conclusion, apply decomposition/branching rules, and track branch closure. All branches closed establish validity; a fully decomposed open branch supplies a counterexample. An unfinished open branch does not establish invalidity. Detailed conventions, completeness, counterexample extraction, authoring, feedback and grading need their own planning before implementation.

Do not repurpose the existing natural-deduction tree checker for tableaux or treat the difference as a visual orientation change. Share suitable formula/runtime infrastructure while keeping their representations, rules and checking obligations distinct.

## Next branch: 033-chore-disable-natural-deduction-trees

This branch both guards availability and clarifies terminology throughout the codebase. Keep the implementation available for future work; do not delete it or convert stored proofs into another method.

### Availability guards

- Remove natural-deduction trees from public practice setup, instructor format controls and new assignment problem selection in normal/demo modes. Update navigation/help text that currently advertises three active proof formats.
- Enforce admission on the server, not only in the UI: reject new natural-deduction tree authoring, reference publication and assignment inclusion/publication. Cover create/update, duplication and attempts to reuse existing published versions, including mixed assignments.
- Block new student attempts and mutations of natural-deduction tree work, including draft saves, transient checks and final submission. Explain unavailable content clearly rather than leaving enabled controls or indefinite loading. Review mixed assignments explicitly so a hidden item cannot be silently omitted from completion/submission requirements.
- Preserve existing stored definitions, pinned versions, drafts, submissions, scores and grading history. Keep authorized historical reads/review available without weakening existing grade/reference disclosure. Do not erase, rewrite, regrade or reinterpret records merely to disable the method. Settle any existing mixed-assignment mutation/review edge cases explicitly during the slice design.
- Update demo seeding so new/reset workspaces contain only supported methods. Version the template if its contents change; test explicit reset and retained visitor behavior. Existing workspaces must encounter the same guards without requiring automatic deletion or reset.
- Retain checker/contracts/editor implementation and meaningful direct tests. Add admission/guard coverage for normal/demo boundaries and retained read-only data. This is an application availability decision, not removal of the method from historical transport validation.

### Naming and organization are part of this branch

Use **natural-deduction tree** in user-facing text and documentation for the retained method; reserve **semantic tableau / truth tree** for the separate future method. Avoid bare “tree” where a reader could reasonably confuse the two. Ordinary graph/tree terminology inside a clearly scoped algorithm can remain where its meaning is unambiguous.

Scan frontend, backend, shared tools, tests and documentation together. Include file and directory names, identifiers, schemas/types, imports/exports, fixtures, comments, diagnostics and help labels—not just visible dropdown text.

- Rename format-specific `tree/` directories to an explicit name such as `natural-deduction-tree/`, following the owning area's conventions.
- Rename ambiguous format-specific files/components such as `TreeProofEditor`, `TreeProofSummary` and their tests to corresponding `NaturalDeductionTree…` names. Apply the same clarity to format-specific contract/checker/helper modules and symbols such as `TreeProof` where appropriate.
- Keep genuinely multi-format proof orchestration generic. Do not rename a shared proof report or formula helper as though it belonged only to natural-deduction trees.
- Update imports and public package entries with their consumers in one coordinated change. Avoid internal compatibility re-exports that obscure the new ownership; document any actual external compatibility boundary before changing it.
- Preserve existing serialized discriminants, versions, IDs, JSON keys and persisted data unless a separately reviewed migration requires otherwise. In particular, the historical `format: 'tree'` tag can remain as a documented storage/transport value while code and UI names become explicit. A filename/type rename is not justification for silently changing stored records.
- Preserve historical branch names and original verification records. Add current-status pointers where needed rather than renaming past work numbers or pretending the old implementation was tableaux.

Success means the application no longer offers new natural-deduction tree work, retained authorized data stays inspectable, and readers can distinguish the retained natural-deduction implementation from planned semantic tableaux at a glance in the directory structure and code.

## Following work

Finish the current practice audit using truth tables, Fitch and dependency only. After the disabling/naming branch, plan semantic tableaux in a dedicated branch and determine its implementation slices. Do not claim tableaux are available or assume an exact checker/editor/grading design yet.

The remaining [UI audit journeys](ui-ux-audit.md#remaining-audit-branches--agreed-november-12-2026)—demo teaching flow, then genuine-account product review—remain planned. Their former proposed numbers 033/034 are superseded; assign fresh numbers after the intervening proof-method work is sequenced. Keep portfolio sandbox preparation after the agreed release work. This plan does not create a branch, implement guards or authorize deployment.
