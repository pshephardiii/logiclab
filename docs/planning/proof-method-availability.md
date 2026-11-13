# Proof-method availability and unambiguous naming

Decision: November 12, 2026; sequence confirmed November 13. **Branch 033 in progress: owner/student admission guards, available-only selection controls and retained read-only views are implemented; explicit naming cleanup and final verification remain in progress. Semantic tableaux are not implemented.** Practice UI branch 032 is complete for its agreed scope; see its [verification](../verification/practice-ui-audit-verification.md).

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

### Slice 2 — owner admission and demo seed (November 13, 2026)

- Problem create, saved-draft edits (including metadata-only changes or format replacement), and new reference publication enforce availability. Existing draft/version reads, historical reference checking, and archive/restore remain available under their existing authorization. Guard saved/replacement definitions before editing fields, under the existing lock/transaction where applicable.
- Assignment create, replacement, policy/weight/title updates, duplication and first publication validate every effective pinned version. Mixed assignments cannot silently drop unavailable items or bypass the guard through omitted item lists. Historical detail/list/review projections and existing published-state retries remain separate from new admission. A draft may be repaired by explicitly replacing its items with only supported versions; a rejected write rolls back the entire mutation.
- Seeding uses these stores too, so **template 8** is part of this slice: new/reset visitors receive Fitch/dependency examples only, with 40 possible graded proof points. Existing visitors retain their template/data until explicit reset; reset preserves the original absolute deadline and other visitors' records. No user development database reset or migration is needed.
- Test setup for retained natural-deduction trees uses explicit disposable-schema historical records rather than newly admitting unavailable work through stores. Dedicated normal/demo HTTP coverage verifies write rejection, retained reads, archive/restore and rollback. Underlying transport/checker and retained student-work regression coverage are preserved.
- Validation: all 1,067 API unit tests and 131 API PostgreSQL workflow checks passed, along with API type checking/build and changed-file formatting/whitespace. Database runs used disposable isolated test schemas; no application database was migrated/reset. No browser run or UI hiding is claimed for this slice.
- **Remaining:** student attempts/saves/checks/finalization still need their boundary guards, including mixed-assignment behavior. UI selectors/controls still advertise the old method until their slice; format-specific naming cleanup follows coordinated consumer changes. This is not branch completion or a claim that trees are fully hidden yet.

### Slice 3 — student mutation guards and retained read-only work (November 13, 2026)

- Student save/check/finalization validates the complete pinned assignment after existing authorization. Any unavailable proof makes the whole mixed assignment unavailable for new work, including writes/checks targeting supported problems. No item is dropped or treated as completed. Admission precedes attempt creation, and rejected writes retain saved answers/revisions.
- Already-final submissions remain replayable without re-evaluation or revision changes. Historical assignment/attempt reads, authorized references, instructor review, grading and independent grade/answer release remain available. No historical attempt is rewritten to implement the availability policy.
- Student pages explain unavailable content, retain navigation across all items and render saved work read-only. Edit/save/check/finalization controls are suppressed; hook methods also guard direct invocations and automatic checks. The assigned-tree panel itself defaults to read-only even if a caller requests editing. Answers and released results still follow their original access policy.
- Existing active-tree student UI tests now cover retained draft/final viewing, blocked work and independent reference access. Underlying tree editor/checker tests remain intact. Disposable historical database fixtures exercise both normal/demo boundaries, mixed active/unavailable items, no-attempt creation, unchanged saved revisions and final replay/release.
- Validation: 649 frontend tests and all 131 API PostgreSQL workflow checks passed, along with API/frontend type checking and production builds, changed-file formatting and whitespace. No browser run or database migration/reset was performed for this slice.
- **Remaining:** remove unavailable choices from public practice, instructor authoring and publication selection; make retained instructor records read-only with clear messaging. Then complete the coordinated explicit natural-deduction-tree naming pass and branch verification. Tree practice/authoring selectors are still present until that next slice; this is not full app hiding or branch completion.

### Slice 4 — practice/instructor availability controls (November 13, 2026)

- Public practice setup and format switching offer only Fitch/dependency, reject injected unavailable choices without discarding work, and guard the editor boundary. Navigation no longer advertises natural-deduction trees. Retained pure helpers/checkers remain format-complete; broader transport support is not an app entry point.
- New instructor authoring offers only available formats. Retained tree drafts render a read-only summary without constructing a reference, changing dirty state or exposing edit/save/new-publication controls. History, private retained reference display and archive/restore remain available. Published overview navigation labels these as retained drafts rather than editable work.
- Assignment choices filter each immutable version for availability while preserving raw pagination offsets. Do not filter solely by the current source draft: older supported versions remain selectable even if that draft's method is now unavailable. Instructor assignments containing retired work render all saved content read-only, suppress publication and disable duplication; archive/reload, result release and historical review remain separate controls.
- Obsolete active-tree app journeys now assert hidden choices and read-only retained behavior. Direct reference-editor construction, explicit local checking and deletion/repair tests continue exercising retained implementation outside the guarded app workflow; existing tree engine/editor suites remain available.
- Validation: all 640 frontend tests and frontend type checking/production build passed, plus changed-file formatting and whitespace. New cases cover unavailable-choice injection, version-only filtering across an empty page, retained library archive/restore/history, fixed instructor content and disabled duplicate/publication actions. This frontend-only slice did not repeat database checks or browser QA.
- **Next:** coordinated format-specific file/directory/symbol naming, preserving serialized `format: 'tree'`, followed by branch-wide validation and focused browser verification. No semantic tableaux or automatic data conversion is introduced here.

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
