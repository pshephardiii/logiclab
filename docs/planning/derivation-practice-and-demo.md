# Self-created derivation practice and remaining demo examples

Branch: `028-feat-derivation-practice-and-demo`. This is the implementation record for [the agreed sequence](logical-derivations.md#028-student-created-practice-demo-and-feature-verification); consolidate broader API/product/setup guidance and PR notes at branch closeout.

## Confirmed decisions — November 9, 2026

- Self-created practice belongs to the current page session. No database saves or browser-storage persistence. Protect setup/proof work before navigation or browser unload; checking is not saving. Instructor-assigned practice keeps its existing revisioned saves and disclosure rules.
- Students choose premises, target and Fitch/dependency/tree format before starting. Validate syntax and supported configuration without requiring an instructor reference. An unsuccessful proof check does not establish that a self-created goal is impossible or search for a solution.
- Reuse the existing bounded propositional catalog/checkers and student editors. Checks are explicit and local, with no official scores or instructor-visible records. All 19 rules start enabled for self-created practice, including classical rules; students can disable rules before starting. Catalog labels identify the enabled rules.
- Changing an active format requires confirmation and clears the entire practice setup, proof and feedback. Cancel preserves everything. No conversion or retained premises/target across that reset. This is implemented in slice 2; assigned formats remain locked.

## Slice 1: setup, editing and explicit checking

Public `/practice/proofs` is lazy-loaded and reached through “Try derivation practice” on the existing independent practice page. A link returns to truth-table practice. The new route does not require an account, demo namespace or owner-library definitions. Existing truth-table practice state and API behavior are unchanged.

Setup supports optional stable-ID premises, a required target, format selection and catalog rule selection. It uses proof grammar/bounds, including contradiction and all 26 propositional variables, rather than truth-table variable limits. Invalid setup retains fields and shows an error. A valid statement is fixed when practice begins; the three existing student editors own only the entered proof. No reference solution is required, fetched or stored.

Check proof is disabled until a proof is started. It evaluates the current statement/proof using the selected format's checker, renders the shared diagnostic report, and never saves or automatically checks edits. Every proof edit clears the old report. Dirty-work registration covers both setup edits and active practice, even after a successful check. Remount/reload loses page-local work; browser unload warnings remain browser-dependent.

The first slice initially permitted format selection only during setup; slice 2 below adds active format switching and explicit restart. Demo template 6 is unchanged; remaining tree/cross-format examples belong to the later seed slice. No backend, shared contract, migration or assigned-work behavior changed.

### Slice 1 verification

- Frontend type checking and production build passed.
- All **393 frontend tests** passed, including **20 new cases**. Coverage includes accepted local checks across all three formats, explicit checking, stale-feedback clearing, invalid/malformed setup, supported grammar/bounds, rejected mismatched format, rule permissions, input preservation, no proof-check HTTP calls, unsaved navigation/unload handling, page remount loss and direct anonymous route access.
- Formatting and whitespace checked for the slice. jsdom uses the existing native-dialog stub; these tests do not establish actual modal focus or browser unload behavior.

No real-browser walkthrough, PostgreSQL run or full workspace check was performed for this frontend-only slice. Existing engine/backend behavior is reused and was not modified. Focused browser/mobile and cross-format demo verification remain planned for branch closeout; this is not full product QA or deployment approval.

## Slice 2: confirmed full reset — November 9, 2026

Active practice now offers Change proof format and Start over. Both reuse the existing owner-scoped Stay/Discard confirmation. Selecting the same active format does nothing. Stay or Escape preserves the selected format, entered work, rule permissions and check report. Discard clears the entire statement and proof, including stable IDs, assumptions/citations, editor state and feedback, then mounts an empty setup in the chosen format with all 19 default rules. Nothing is converted. Start over performs the same reset in the current format.

Changing format during setup also confirms before discarding entered premises, target or rule changes, and clears any validation error on confirmation. A blank setup can change format freely because there is no entered work to lose. The chosen format alone does not make that empty setup dirty. Confirmed reset removes the old unload/navigation protection until new work is entered; checking an active proof still never makes it saved or clean.

### Slice 2 verification

Frontend type checking/production build and all **402 frontend tests** passed. Nine new cases cover all six cross-format transitions, Stay and native-dialog cancellation, old feedback/work removal, default-rule restoration, clean empty setup, a fresh attempt after reset, same-format restart/no-op and dirty setup/error retention. The focused run initially used an unsupported test-event shortcut; dispatching the actual cancel event corrected the test. Formatting and whitespace passed.

No shared provider, assigned editor, API, database, migration or demo seed changed. Native dialog focus/unload behavior still needs real-browser verification; jsdom uses the existing dialog stub. Next: versioned tree/cross-format demo examples, then branch-wide verification and consolidated documentation/PR notes.

## Slice 3: demo template 7 — November 9, 2026

New/reset workspaces now receive the same conditional-identity problem (`P → P`) in Fitch, dependency and natural-deduction tree formats. Each reference is published through the existing checked authoring workflow. Conditional proof and optional Reiteration are enabled, so students can use the minimal reference route or a longer valid proof without matching the instructor's exact structure.

All three proof examples appear in assigned practice, graded and completion-only sets. Proof practice keeps explicit checks, individual saves, anytime references and no final submission. The graded set has three 20-point problems (60 total), instructor review/adjustments and independent grade/answer release. Completion remains score-free with post-submission verification flags and separately revealed references. Existing table/conceptual examples and six-assignment organization are retained; there are now six published problem versions per workspace.

Authentication does not upgrade an existing visitor. A repeat provisioning request for an older active template remains unavailable rather than silently replacing its data. Explicit reset restores template 7, rotates credentials/generation and keeps the original absolute deadline. The retained-template regression builds a synthetic two-format v6-shaped graph inside the permitted deletion lifecycle, without disabling retention guards; other visitors remain unchanged.

### Slice 3 verification

- API type checking and all **1,051 API tests** passed; existing Jest VM-module advisories remain.
- All **133 API/PostgreSQL workflow checks** passed, including two new seeded-workflow/upgrade cases and updated seed/reset/cleanup expectations. Imported contracts, engine and database packages were rebuilt by that suite.
- Scoped demo-runtime checks accept longer valid proofs in all three formats without saving an attempt. Graded work with one incorrect tree stays pending until an instructor awards points; the tested correction yields 52.5/60 without rewriting original evidence. Grades/comments can be released while references remain locked, and later answer reveal preserves student work and immutable submission retries. The same filled-but-incorrect tree earns score-free completion with an error flag alongside two verified proofs.
- A retained two-format visitor keeps edited content before reset, receives the tree example only after reset, retains its absolute deadline and cannot reuse old credentials. Another visitor's generation/content stay unchanged. Temporary integration schemas were cleaned up; no user development database was migrated/reset.
- Formatting and whitespace passed. Initial upgrade-fixture runs exposed the existing deletion/provisioning guards; the final fixture respects them and the completed suite passes.

No new migration, schema, endpoint, frontend logic or reference-release policy was introduced in this slice. No browser journey or full workspace verification was repeated. Next: final branch-wide checks, focused real-browser practice/reset/demo journeys, consolidated rollout guidance and local PR notes.
