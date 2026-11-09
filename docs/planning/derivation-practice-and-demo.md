# Self-created derivation practice and remaining demo examples

Branch: `028-feat-derivation-practice-and-demo`. This is the implementation record for [the agreed sequence](logical-derivations.md#028-student-created-practice-demo-and-feature-verification); consolidate broader API/product/setup guidance and PR notes at branch closeout.

## Confirmed decisions — November 9, 2026

- Self-created practice belongs to the current page session. No database saves or browser-storage persistence. Protect setup/proof work before navigation or browser unload; checking is not saving. Instructor-assigned practice keeps its existing revisioned saves and disclosure rules.
- Students choose premises, target and Fitch/dependency/tree format before starting. Validate syntax and supported configuration without requiring an instructor reference. An unsuccessful proof check does not establish that a self-created goal is impossible or search for a solution.
- Reuse the existing bounded propositional catalog/checkers and student editors. Checks are explicit and local, with no official scores or instructor-visible records. All 19 rules start enabled for self-created practice, including classical rules; students can disable rules before starting. Catalog labels identify the enabled rules.
- Changing an active format will require confirmation and clear the entire practice setup, proof and feedback. Cancel must preserve everything. No conversion or retained premises/target across that reset. This is the next slice; assigned formats remain locked.

## Slice 1: setup, editing and explicit checking

Public `/practice/proofs` is lazy-loaded and reached through “Try derivation practice” on the existing independent practice page. A link returns to truth-table practice. The new route does not require an account, demo namespace or owner-library definitions. Existing truth-table practice state and API behavior are unchanged.

Setup supports optional stable-ID premises, a required target, format selection and catalog rule selection. It uses proof grammar/bounds, including contradiction and all 26 propositional variables, rather than truth-table variable limits. Invalid setup retains fields and shows an error. A valid statement is fixed when practice begins; the three existing student editors own only the entered proof. No reference solution is required, fetched or stored.

Check proof is disabled until a proof is started. It evaluates the current statement/proof using the selected format's checker, renders the shared diagnostic report, and never saves or automatically checks edits. Every proof edit clears the old report. Dirty-work registration covers both setup edits and active practice, even after a successful check. Remount/reload loses page-local work; browser unload warnings remain browser-dependent.

The first slice permits format selection only during setup. Switching an active format and explicitly restarting are not exposed until the next slice adds the agreed full-reset confirmation. Demo template 6 is unchanged; remaining tree/cross-format examples belong to the later seed slice. No backend, shared contract, migration or assigned-work behavior changed.

### Slice 1 verification

- Frontend type checking and production build passed.
- All **393 frontend tests** passed, including **20 new cases**. Coverage includes accepted local checks across all three formats, explicit checking, stale-feedback clearing, invalid/malformed setup, supported grammar/bounds, rejected mismatched format, rule permissions, input preservation, no proof-check HTTP calls, unsaved navigation/unload handling, page remount loss and direct anonymous route access.
- Formatting and whitespace checked for the slice. jsdom uses the existing native-dialog stub; these tests do not establish actual modal focus or browser unload behavior.

No real-browser walkthrough, PostgreSQL run or full workspace check was performed for this frontend-only slice. Existing engine/backend behavior is reused and was not modified. Focused browser/mobile and cross-format demo verification remain planned for branch closeout; this is not full product QA or deployment approval.
