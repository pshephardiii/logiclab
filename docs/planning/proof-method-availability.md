# Proof-method availability and unambiguous naming

Decision: November 12, 2026; sequence confirmed November 13. **Branch 033 in progress: shared availability policy is implemented; endpoint/UI enforcement and semantic tableaux are not implemented yet.** Practice UI branch 032 is complete for its agreed scope; see its [verification](../verification/practice-ui-audit-verification.md).

## Audience and terminology

LogicLab targets introductory logic/philosophy. Fitch and dependency-style natural deduction remain active proof methods. The existing tree implementation is a **natural-deduction proof tree**: inference nodes connect supporting derivations to a conclusion, with explicit assumption discharge. It is not a semantic tableau. Its implementation and verification remain historical evidence, not a commitment to offer it in the introductory product.

**Semantic tableaux**, also called **truth trees**, are wanted as a separate method. To test argument validity, begin with the premises and the negation of the conclusion, apply decomposition/branching rules, and track branch closure. All branches closed establish validity; a fully decomposed open branch supplies a counterexample. An unfinished open branch does not establish invalidity. Detailed conventions, completeness, counterexample extraction, authoring, feedback and grading need their own planning before implementation.

Do not repurpose the existing natural-deduction tree checker for tableaux or treat the difference as a visual orientation change. Share suitable formula/runtime infrastructure while keeping their representations, rules and checking obligations distinct.

## Next branch: 033-chore-disable-natural-deduction-trees

This branch both guards availability and clarifies terminology throughout the codebase. Keep the implementation available for future work; do not delete it or convert stored proofs into another method.

### Slice 1 — availability foundation (November 13, 2026)

- Shared contracts expose the available-format list (Fitch/dependency) and a fail-closed availability predicate. This is application admission policy, not a narrower historical transport schema.
- The application has an explicit new-work guard and an actionable `409 PROOF_METHOD_UNAVAILABLE` error mapping shared by problem, assignment and student-work route error handlers. Call the guard after existing validation/authorization at the mutation boundaries in the next slices; it does not authorize historical reads.
- Focused tests retain natural-deduction tree transport validation, owner-definition validation and real reference checking while rejecting that format under the new admission policy. No checker, stored discriminant or historical validator was removed.
- **Not yet hidden or enforced at endpoints:** tree selectors, authoring/assignment/student mutations and demo seeds remain unchanged in this foundation slice. Next wire guarded owner authoring/publication and assignment admission under existing locks, retaining historical projections; then address student mutations, UI/seeds and coordinated explicit renaming.

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

The user accepted the truth-table, Fitch and dependency independent-practice UI for this pass. This is not exhaustive functional/accessibility sign-off. The agreed next sequence is:

1. **`033-chore-disable-natural-deduction-trees`**: implement the guards, retained-history behavior and explicit naming above while keeping the underlying implementation for possible future inclusion.
2. **`034-feat-semantic-tableaux`** (proposed): add truth trees as a distinct method. Settle decomposition/branching, closure, finished-open-branch counterexamples, authoring, student responses, feedback and grading before their dependent slices. Reuse suitable propositional infrastructure without repurposing natural-deduction tree semantics. Split implementation into further numbered branches if necessary rather than treating this reservation as a fixed-size commitment.
3. **`035-chore-truth-tree-practice-ui-audit`** (proposed, after tableaux delivery): fine-tune independent truth-tree practice using a dedicated checklist, representative validity/counterexample journeys, branching/closure interactions, keyboard controls and visual/mobile QA. Do not claim the current practice checklist verifies an unimplemented method.
4. Resume the remaining [UI audit journeys](ui-ux-audit.md#remaining-audit-branches--agreed-november-12-2026): demo teaching flow, then genuine-account product review, followed by inexpensive portfolio sandbox preparation and hosted smoke checks.

The former demo/account audit numbers 033/034 are superseded. Confirm unused numbering when creating each branch, particularly if tableaux implementation is split. This plan does not create a branch, implement guards or authorize deployment.
