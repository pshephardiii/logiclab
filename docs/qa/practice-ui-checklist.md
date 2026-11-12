# Practice UI audit checklist

Branch: `032-chore-practice-ui-audit`. Created November 12, 2026. Status: **In progress; natural-deduction tree cases deferred**. This checklist is an execution guide, not evidence that a case passed.

## Scope and working agreement

Current scope, updated November 12, 2026: review anonymous independent practice truth tables at `/` and Fitch/dependency proofs at `/practice/proofs`. Natural-deduction tree cases are deferred; the method remains visible until the planned disabling branch. See the [availability/naming plan](../planning/proof-method-availability.md). Semantic tableaux are not implemented and are not tested here. Include visual clarity, mathematical presentation, interaction, errors, recovery, navigation, keyboard use and responsive behavior. Instructor-authored true/false and multiple-choice questions have no independent-practice screen; review them in the later teaching-flow audit rather than treating their absence here as a defect.

You perform the steps and report observations using the case ID, for example **DEP-02: citations wrap beneath the rule**. The agent records the checkout, run IDs, findings, screenshots when available, fixes, verification and retest status. You do not need to collect that evidence yourself. Fix one coherent issue at a time, verify it and leave a reviewable commit-sized change before continuing. Do not infer that unreported steps passed; confirm completed cases/blocks together.

Use **Not run**, **Pass**, **Finding**, **Blocked** or **Deferred**. A visual preference is a valid finding; distinguish it from wrong results, inaccessible controls or lost work. Record intentional product changes separately. Existing engine tests cover the rule catalog in depth; this audit samples representative UI journeys rather than manually proving every rule in every format.

## Pass order

| Block | Cases                                          | Focus                                              |
| ----- | ---------------------------------------------- | -------------------------------------------------- |
| A     | SET-01, NAV-01                                 | Start and discover practice                        |
| B     | TT-01–TT-04                                    | Truth-table entry, checking and solutions          |
| C     | SETUP-01–SETUP-02, FIT-01–FIT-04               | Proof setup and Fitch                              |
| D     | DEP-01–DEP-03                                  | Dependency proofs                                  |
| E     | TREE-01–TREE-03                                | Deferred: natural-deduction tree cases             |
| F     | HELP-01, WORK-01, ACCESS-01–ACCESS-02, FAIL-01 | Shared help, retention, accessibility and recovery |

Take each block separately. Each test begins from the stated setup; do not rely on leftover answers from another case. Use the site's **Start over** action and discard confirmation to reset proof practice between examples. Final audit sign-off covers only cases actually exercised.

## A. Start and navigation

### SET-01 — Start the local application

- [ ] Reviewed; result: Not run

1. Use the existing local setup and run `npm run dev` if it is not already running. No new installation, database reset or migration is required just for this audit.
2. Open `http://localhost:5173/` in a signed-out browser window. Use the actual configured port if your local setup intentionally differs.
3. Open DevTools Console and Network in this application tab. Clear old entries.
4. Use an ordinary desktop viewport first. The agent records browser/version, viewport and checkout when recording evidence.

**Check:** practice loads without login, uncaught errors or an indefinite loading state. The API must be running for truth-table requests; proof checking runs locally. Authenticated/demo workflows and disposable-database setup belong to the later audits. Do not change working authentication configuration solely for anonymous practice.

### NAV-01 — Find both practice experiences

- [ ] Reviewed; result: Not run

1. From `/`, find the link to proof practice using only the visible navigation/content.
2. Open proof practice; confirm that its purpose and temporary-work notice are understandable.
3. Before entering work, use browser Back and Forward, then return to `/` using the site's navigation.
4. Open `/practice/proofs` directly in a fresh tab.

**Check:** both entry points work, the current task is clear, and moving between truth tables and proofs is discoverable. Note redundant links, misleading labels, awkward spacing, excessive explanations or unexpected scroll/focus changes.

## B. Truth tables

### TT-01 — Formula entry and keyboard guide

- [ ] Reviewed; result: Not run

1. At `/`, inspect the empty table instructions and keyboard guide. Identify the **Create table** button from the instructions.
2. Enter `P &`; pause for validation. Try **Create table** if enabled, and try Enter.
3. Replace it with `P & Q`; pause, then create the table.
4. Separately create tables for `~P`, `P v Q`, `P | Q`, `P -> Q`, `P <-> Q` and `[(P v Q) & ![R -> P]]`.
5. Paste a Unicode example: `¬P ↔ Q`. Try mismatched delimiters such as `[P & Q)` and then correct them.
6. Try `P <-> Q <-> R`, then `(P <-> Q) <-> R`.

**Check:** the guide clearly maps keystrokes to symbols. Valid aliases work; malformed formulas receive one understandable positioned error and cannot create a table. Chained biconditionals require explicit grouping. Corrections clear stale errors. Table creation is visible on a short screen; ordinary motion can scroll to the new table, but not when merely checking answers. OS text replacement remains a known platform limitation; report observations without assuming input hints can disable it completely.

### TT-02 — Correct, incorrect and blank answers

- [ ] Reviewed; result: Not run

1. Create `P & Q`. Confirm rows TT, TF, FT, FF and fixed given columns P/Q.
2. Fill the final column T, F, F, F, then select **Check answers**.
3. Change the first answer to F, clear the second and check again.
4. Correct the first answer and fill the second F; check again.
5. Change one checked answer without checking again.

**Check:** all-correct, incorrect and blank states are distinguishable. Feedback uses text/symbols as well as color; the final column stays visually distinct. Counts agree with the entries. Editing clears stale correctness feedback. Input controls are comfortable, not oversized or cramped. Checking neither replaces entries nor unexpectedly scrolls the page.

### TT-03 — Solutions and intermediate columns

- [ ] Reviewed; result: Not run

1. Create `(P -> Q) & !P` and fill a few intermediate/final cells, deliberately including a mistake.
2. Select **Show solution**. Compare its values against your entries.
3. Select **Hide solution**, then show it again.
4. Change an answer while the solution is visible; inspect the entries and any correctness feedback.
5. Create `P <-> Q`; show the solution and check final values T, F, F, T.

**Check:** revealed answers sit clearly beside controls, with legible green T/rose F and explicit letters. They do not overwrite your choices or masquerade as your grade. Intermediate formulas/headings are readable; correct/incorrect and revealed values are distinguishable even without perceiving color. Show/hide labels and progress remain accurate.

### TT-04 — Replacement and session behavior

- [ ] Reviewed; result: Not run

1. Create `P & Q` and enter a few answers.
2. Navigate to proof practice without starting a proof, then return using site navigation and browser Back.
3. Change the table formula to `P v Q`; observe when the old table/answers disappear and create the replacement.
4. Reload the page.

**Check:** within-app return retains the existing truth-table session as designed; reload clears it. Editing the formula replaces the table state; note whether that destructive consequence needs clearer communication. Do not assume truth tables have the same warning behavior as proof practice. The UI must not promise persistence across reload or claim an answer was saved.

## C. Shared proof setup and Fitch

### SETUP-01 — Premises, conclusion and format choice

- [ ] Reviewed; result: Not run

1. Open `/practice/proofs` with fresh setup. Inspect labels, spacing, keyboard guide, default format and **Begin proof practice**.
2. Try beginning with an empty conclusion, then with `P &`. Correct it to `P`.
3. Add premises `P` and `Q`; remove one. In dependency setup, type into **New premise**, verify beginning is blocked until **Add premise** or **Discard premise**, then test both actions.
4. With entered setup data, choose another format. Select **Stay**; verify the original fields and selected format remain.
5. Change format again and select **Discard changes**. Inspect the new setup.
6. Repeat a simple setup in Fitch and dependency formats. Notice whether different premise-entry patterns are confusing.

**Check:** validation is actionable and preserves inputs. Format switching clears the entire previous setup only after consent. Premises are optional; incomplete added premises cannot start a proof. Dependency uses confirmed premise entry; current Fitch setup uses added premise fields—record consistency improvements rather than assuming both already match. No setup action checks solvability.

### SETUP-02 — Permitted rules and an impossible target

- [ ] Reviewed; result: Not run

1. In fresh setup, open **Permitted rules**. Verify opening does not accidentally toggle a checkbox under the pointer.
2. Inspect operator grouping, classical/derived groups, selected count, **Clear selection**, **Select all**, **Done** and Escape.
3. Leave only **Reiteration** selected. Use premise `P`, conclusion `Q`, then begin.
4. Check the unfinished proof. If needed, add `Q` by Reiteration citing `P`, and check again.

**Check:** only enabled inference rules are offered. No checker report claims the statement is impossible merely because the attempt failed. This is an intentionally unsuccessful example: syntax-valid setup does not establish that the target is derivable. Modal changes and closing behavior are understandable. Restart before the next case.

### FIT-01 — Build and verify a conditional proof

- [ ] Reviewed; result: Not run

1. Choose **Fitch**, no premises, conclusion `P -> P`. Keep **Implication introduction** enabled and begin.
2. Select **Open subproof**. Enter assumption `P`, then **Add line**.
3. Select **Close subproof**. It closes at the latest confirmed direct line (here the assumption itself) and returns entry to the main proof. Try the adjacent **Reopen subproof** shortcut, verify entry returns inside the same block, then close it again.
4. At root scope, enter `P -> P`, select **Implication introduction** and cite that closed subproof. Select **Add line**.
5. Select **Check proof** and expand **Line-by-line checks**.

**Check:** the confirmed proof grows with automatic numbering, visible scope guides and readable rule/citations. The conclusion remains easy to locate. **Close subproof** is disabled in the main proof or while an entry is pending. Opening/closing a subproof is discoverable and does not itself imply correctness. The final check verifies the proof and its support. Pending entry cannot be silently included or omitted by checking.

### FIT-02 — Edit, insert, move and delete

- [ ] Reviewed; result: Not run

1. Keep FIT-01's verified proof. Edit the final formula to `Q`, then check.
2. Confirm the feedback explains that this does not establish the requested conclusion; restore `P -> P`.
3. Use a line menu to insert a line before the conclusion. Enter `P -> P` by Reiteration citing the existing conclusion, even though that citation is now forward after insertion; confirm and check.
4. Move the inserted line after the conclusion. Recheck and inspect updated citation numbers.
5. Delete the inserted line: first choose **Keep proof work**, then reopen deletion and confirm.
6. Open the assumption's **Subproof settings**, inspect parent/endpoint choices, close with Escape, then try reopening/closing the subproof.

**Check:** IDs stay attached to the same logical entries while numbers change; movement must not silently retarget citations. Forward references are rejected, and recovery works. Deletion uses a modal with sensible focus restoration. Inspect spacing, menu placement and nesting guides. If the insertion selector does not offer a forward citation, record that guard and use an available citation; do not manufacture it through DevTools.

### FIT-03 — Nested scopes and contradiction input

- [ ] Reviewed; result: Not run

1. Start fresh Fitch practice with no premises and conclusion `P -> (Q -> P)`; enable Reiteration and Implication introduction.
2. Open an outer assumption `P`, then an inner assumption `Q`.
3. Inside the inner subproof, add `P` by Reiteration citing the outer assumption.
4. Select **Close subproof** at that new `P`. In the outer scope add `Q -> P` by Implication introduction citing the inner subproof.
5. Select **Close subproof** there. At root add `P -> (Q -> P)` by Implication introduction citing the outer subproof, then check.
6. In a temporary next-line formula, type `_|_`; inspect its conversion to `⊥`, then **Discard entry**.

**Check:** nested guides/endpoints remain readable and entry scope is clear. This proof verifies; the extra contradiction entry must not change confirmed work or remain after discard. Literal `P & !P` is not the contradiction constant required by rules ending in `⊥`; help should make that distinction discoverable without an essay.

### FIT-04 — Delete an inclusive range of lines

- [ ] Reviewed; result: Not run

1. Build a Fitch proof with at least eight confirmed lines. Select the displayed line number **7**, then **5** (or use line 7's menu → **Delete ›** → **Delete a range starting at line 7**, then select line number 5).
2. Verify only lines 5–7 are highlighted and the modal previews those three formulas. Choose **Keep proof work** or Escape; all lines must remain.
3. Repeat the selection and choose **Delete selected lines**. Verify lines 1–4 and the former line 8 remain, renumbered. Citations to deleted lines must stay explicitly missing rather than target another line.
4. Select only the opening assumption of a multi-line subproof. The modal must explain why deletion is blocked; cancel and select the complete subproof to remove it.
5. Select first and last line to delete all work; confirm that this leaves an empty proof. There is no separate **Clear proof** button in the Fitch student/practice editor.
6. Try starting a selection while a new line is unconfirmed. Range controls must be disabled until Add line or Discard entry. Test cancellation/selection by keyboard as well as pointer.

**Check:** reversed endpoints mean the same inclusive range, no unselected lines are silently removed, complete deleted subproofs lose their metadata, and remaining IDs/citations retain their meaning. Removing a surviving subproof's endpoint leaves that endpoint visibly unresolved for explicit repair. Reference authoring retains its distinct **Remove reference proof** action; this case replaces the Fitch **Clear proof** action, not dependency/tree controls.

## D. Dependency proofs

### DEP-01 — Conditional proof and discharge

- [ ] Reviewed; result: Not run

1. Start fresh **Dependency** practice, no premises, conclusion `P -> P`, with Implication introduction enabled.
2. In the entry row select the assumption option, enter `P` and **Add line**. Its dependency is itself, `{1}`.
3. Open line 1's menu and choose its discharge action. Enter `P -> P` for the new inference using Implication introduction.
4. Select line 1 as the discharge conclusion as well as assumption. Leave the resulting inference dependency set empty and **Add line**.
5. Select **Check proof**.

**Check:** dependency selection is understandable, rule/citation fields align, the assumption/discharge relationship is visible, and the check verifies the proof. No assumption support leaks into the final result. The UI must not imply dependency format is governed by Fitch block scope.

### DEP-02 — Two citations, dependency ordering and feedback

- [ ] Reviewed; result: Not run

1. Start fresh with premises `P` and `!P`, conclusion `_|_`; enable Contradiction introduction.
2. Enter contradiction `_|_`, select Contradiction introduction and cite both premise lines.
3. Select dependencies in reverse order: line 2, then line 1. Add the line and check.
4. Inspect the confirmed dependency display: it should read `{1, 2}`.
5. Edit the final formula to `P` without changing the rule/citations and check again; restore `⊥` and recheck.

**Check:** two citation selectors align sensibly, contradiction notation renders correctly, dependency display is numerically sorted, and success/error states use clear text and color. Invalid local inference and target mismatch are understandable. Restoring the formula permits recovery.

### DEP-03 — Invalid support and stable references

- [ ] Reviewed; result: Not run

1. Start fresh with premise `P`, conclusion `P`, and Reiteration enabled.
2. Add `Q` by Reiteration citing premise 1 and depending on `{1}`. Add another `Q` by Reiteration citing that invalid line, also depending on `{1}`.
3. Check and expand **Line-by-line checks**.
4. Edit the final formula to `P` and cite premise 1; check again, retaining the earlier invalid `Q` line.
5. Delete the invalid line using its menu: cancel once, then confirm. Recheck.
6. Inspect movement/insertion controls and dependency selectors; confirm displayed numbers follow edits without redirecting references.

**Check:** feedback separates a locally matching step from invalid upstream support. Unused mistakes still prevent an error-free verified proof; deleting the mistake allows the final correct route to verify. Missing citations remain visible when deleting a cited line. Do not interpret a matching final formula alone as a verified proof.

## E. Natural-deduction trees — deferred

Do not execute this block on 032. These are historical natural-deduction tree cases, not semantic tableaux tests. They are retained only for a future decision to reactivate that method. Their deferral is intentional, not a pass or an unresolved implementation failure.

### TREE-01 — Guided conditional branch

- [ ] Deferred by user; result: Deferred

1. Start fresh **Natural-deduction tree** practice, no premises, conclusion `P -> P`, with Implication introduction enabled.
2. Confirm the initial node is an unverified conclusion root. Select Implication introduction for node 1.
3. Open node 1's three-dot menu → **New branch assumption for node 1**.
4. Enter `P` for node 2 and **Branch assumption formula**. Select **Discharge node 2**.
5. Before confirming, inspect the diagram and disabled **Check proof**; then select **Add node**.
6. Check the proof and expand **Node-by-node checks**.

**Check:** the branch attaches only on confirmation, `[P]` appears above `P → P`, and discharge is explicit. The proof verifies. Selecting a node makes its fields clear without revealing every node's full form at once. Node numbers/labels support the report without overwhelming the diagram.

### TREE-02 — Premise copying and a supporting node

- [ ] Deferred by user; result: Deferred

1. Start fresh tree practice with premise `P`, conclusion `P` and Reiteration enabled.
2. Select Reiteration for the initial root. From its menu choose **New supporting premise for node 1**.
3. Select the statement premise, then explicitly copy its formula into node 2. Inspect the distinction between selecting a source and copying its text.
4. Confirm with **Add node**, then check.
5. Edit the premise leaf formula to `Q` without changing its source and check again; restore `P`.

**Check:** available premises are sources, not automatically inserted leaves. Copying is deliberate, the support attaches to its intended root and the valid proof verifies. A changed leaf cannot pass by merely retaining the original premise ID. Errors identify the relevant node and recovery preserves the tree.

### TREE-03 — Unattached nodes, root choice and deletion

- [ ] Deferred by user; result: Deferred

1. Keep TREE-02's proof. Use global **New assumption node** to enter `Q`, then **Add node**.
2. Find the unattached node and select it. Check the proof.
3. Use its menu to make it the conclusion root. Inspect how the former connected proof is retained; check again.
4. Make the original `P` inference the conclusion root again.
5. Delete the unattached assumption: cancel once, then confirm. Recheck.
6. Delete the supporting premise from the connected proof. Inspect the missing-child state and recreate/reconnect a premise explicitly to recover.

**Check:** detached work remains visible and is checked, root replacement is explicit, and losing the old root does not erase its nodes. Deletion is modal; retained references do not silently point to a different node. A missing connection is visible and repairable. Do not attempt cycles/duplicate IDs through DevTools; malformed-data safety has automated coverage.

## F. Shared usability, retention and recovery

### HELP-01 — Learn a rule without leaving the task

- [ ] Reviewed; result: Not run

1. In an active proof, open **Keyboard guide**, then **Rule reference**.
2. Select Implication introduction and Contradiction introduction in the rule selector; inspect each visual pattern.
3. Repeat the rule view in Fitch and dependency practice, noting different citations/discharge requirements.
4. Close/reopen both guides. Use them while keeping the proof visible on a short screen.

**Check:** keyboard help is concise; rule patterns match the exact variants implemented, including `⊥`. The rule selector offers enabled rules, terminology is consistent, and help is navigable without a wall of explanatory text. Note any format-specific citation requirement that remains unclear.

### WORK-01 — Pending work, navigation and restart (repeat for Fitch and dependency)

- [ ] Reviewed; result: Not run

1. Begin a proof and confirm at least one entry. Start another entry but leave it unconfirmed.
2. Try **Check proof**: it must be disabled. Choose **Start over**, then **Stay**; verify both confirmed and pending work remain.
3. Navigate to truth-table practice; choose **Stay**. Try browser Back and Stay as well, using a tab with suitable history.
4. Try changing the active format; Stay must preserve the old format/work. Repeat and choose **Discard changes**.
5. Confirm the new format opens fresh setup with premises/conclusion/proof/feedback cleared; this is not proof conversion.
6. Begin again, enter work and reload. When the browser offers its unload warning, cancel once, then accept reload.

**Check:** navigation protection does not lose work on Stay or execute a previously cancelled action later. Discard and reload do not promise recovery. Proof practice is page-session only: no database save, local-storage restore, grade or instructor solution. Native unload warnings vary by browser and interaction history; report whether one appeared rather than claiming they are guaranteed.

### ACCESS-01 — Keyboard and focus

- [ ] Reviewed; result: Not run

1. Without the mouse, complete a short truth table and one proof in each in-scope format using Tab/Shift+Tab, typing, arrow keys and Enter/Space.
2. Open a rule dialog, move forward/backward through controls, close with Escape and reopen it.
3. Open a line/node menu, use its controls and dismiss it with Escape.
4. Open a deletion dialog, cancel and inspect focus; then repeat with confirmed deletion.
5. Trigger a validation error, correct it and resume without clicking elsewhere.

**Check:** focus is visible, order follows the task, modal focus stays inside until closure, and cancellation returns focus sensibly. Enter in formula entry confirms the intended entry rather than submitting/restarting the whole session. Native select/menu controls need not implement a custom arrow-key menu pattern; they must remain operable. Record screen-reader coverage separately—keyboard success alone is not an accessibility-conformance claim.

### ACCESS-02 — Narrow screens, zoom, reduced motion and visual consistency

- [ ] Reviewed; result: Not run

1. Revisit one truth table and a finished proof in each in-scope format at approximately 390px and 320px width.
2. Open a two-citation row, nested Fitch proof, dependency selector, permitted-rules dialog at narrow width.
3. Use a short desktop viewport and 200% browser zoom. Confirm key actions remain reachable without overlapping labels.
4. Enable reduced motion in OS/browser settings or DevTools Rendering; create a new truth table again.
5. Compare typography, whitespace, buttons, headings, selected entries, errors and success feedback across the three in-scope practice experiences.

**Check:** necessary table/tree scrolling stays within its container; the whole page does not scroll sideways. Menus/dialogs fit and can scroll, text does not obscure inputs, and controls are comfortably usable. Reduced motion avoids animated table scrolling. Verification/error/answer states remain legible without color alone. Record improvements in wording and density as well as defects. The agent can perform measured contrast/accessible-name checks for reported areas; screenshots alone do not establish contrast or accessibility compliance.

### FAIL-01 — Truth-table request failures and recovery

- [ ] Reviewed; result: Not run

1. Start with `P & Q` and entered answers. In DevTools Network request blocking, block `*/api/truth-tables/*` requests; the agent can assist with this setup. Avoid stopping the development servers or using Offline mode, which can also disrupt the dev module connection.
2. Try **Check answers** and **Show solution** separately. If a solution is already visible, hide it first.
3. Unblock requests and retry both actions.
4. Block again, enter a new valid formula and try **Create table**. Unblock and retry creation.
5. Check Console/Network for unexpected errors. Close DevTools blocking after the test.

**Check:** request errors are understandable and do not hang the UI. Failed check/solution requests preserve entered answers and allow retry; failed creation preserves the formula so it can be retried. Do not expect old answers after editing/replacing the formula. Proof checking remains local; no artificial API failure case is required for it. Slow-response/stale-response checks can be agent-assisted if an issue suggests a race.

## Agent-owned run and findings record

NAV-01 has a user-reported discovery finding below; no complete manual case/block pass is claimed yet. Historical 029–031 evidence is linked in the [audit record](ui-ux-audit.md); it does not mark this checklist passed.

| Run ID | Checkout / configuration | Cases exercised | Outcome / evidence |
| ------ | ------------------------ | --------------- | ------------------ |
| —      | —                        | —               | Not started        |

For each finding, append an entry using this structure:

```text
Finding: PRA-UI-001
Case: <case ID>; run: <run ID>
Observed / expected: <concrete behavior or visual concern>
Reproduction: <minimal steps and relevant formula/format>
Disposition: <fix, blocked or explicit deferral; reason>
Changes / commit: <implementation and commit when available>
Verification / retest: <actual checks and user/agent outcome>
Evidence: <available screenshot/log links; distinguish fixtures>
Status: Open | Fixed awaiting retest | Verified | Deferred
```

At closeout, resolve or explicitly defer findings, record tested/untested areas, run checks appropriate to changes and prepare local PR notes. Keep demo/classroom/auth/billing work in the subsequent audit branches. A completed practice checklist is not a whole-product or deployment sign-off.

### PRA-UI-001 — Derivation practice was difficult to discover

- **Case:** NAV-01; user-reported November 12, 2026. Other checklist cases remain Not run.
- **Observed:** the general practice landing page appeared to offer only truth tables. Source inspection found a small “Try derivation practice” link above the truth-table content.
- **Change:** replace reciprocal text links with a shared, labeled practice-type navigation on both pages. Give Truth tables and Derivations equal prominence, name all three proof formats and mark the active destination. Stack choices on narrow screens. Routes and session ownership remain unchanged.
- **Status:** Fixed awaiting retest. User should revisit `/`, locate Derivations, open it and confirm that both practice choices remain visible with the correct active state.
- **Verification:** 37 focused frontend tests passed (routing, proof practice and truth-table practice); frontend type checking/production build and changed-file formatting/whitespace passed. No user/browser retest or screenshot is claimed yet.

### PRA-UI-002 — Natural-deduction trees are outside the current audience

- **Decision:** user confirmed November 12, 2026 that the intended tree method is semantic tableaux, not the existing natural-deduction proof tree implementation.
- **Disposition:** defer TREE-01–TREE-03 and exclude that method from shared practice audit repetitions. Plan 033 to guard new use while retaining implementation/history and explicitly renaming ambiguous format-specific files, directories and symbols. Plan semantic tableaux separately.
- **Status:** Deferred to planned branch 033; no guards or renames implemented here. Current practice navigation still advertises the existing method until that branch updates availability/language. See the [implementation plan](../planning/proof-method-availability.md).

### November 12 Fitch review — user observations and first fixes

The user considers the truth-table UI satisfactory for this pass and moved on to Fitch. This records visual acceptance, not an assertion that every truth-table functional checklist step was executed.

**PRA-UI-003 — Citation purpose and spacing** (FIT-01, FIT-02): citation inputs appeared after rule selection without a visible indication of their purpose. Add **Line 1**, **Line 2**, etc. and **Subproof 1**, etc. placeholders while retaining a **None** option. Selected subproof citations show compact line ranges or an explicit not-closed description. Add spacing around help and proof actions.

**PRA-UI-004 — Explicit subproof lifecycle** (FIT-01, FIT-03): replace the new-line scope dropdown with current-context text and **Open subproof** / **Close subproof**. Closing records the latest direct confirmed endpoint and returns to the parent; pending entries, main scope and open nested children cannot be closed through this control. Existing line-menu settings, close/reopen and explicit continuation remain available for repair. Resume open ancestry from the last saved line. Replace cryptic `3–open` citation text with “starting at line 3 (not closed)”. Selecting an inference never implicitly closes a subproof or verifies it.

**PRA-UI-005 — Clear/check actions and modal confirmation** (WORK-01, ACCESS-01): put practice Fitch **Clear proof** and **Check proof** in one wrapping action row. Make full-proof deletion use the native modal, with spaced buttons, initial Keep focus, Escape cancellation and focus restoration.

**PRA-UI-006 — Inline editing** (FIT-02): edit an existing line using the same formula/justification row as entry, with **Done editing** and the existing line-action menu retained. Confirmed-line edits remain immediate local draft changes; this does not introduce another staging/save layer. Preserve premise linking and explicit inference-scope repair.

**Rule clarification:** Disjunction introduction accepts either orientation: from `Q`, both `P ∨ Q` and `Q ∨ P` are permitted. Existing checker behavior already supports this; no rule-policy change was made. A subproof cited by negation introduction must still be closed explicitly, ending in the contradiction constant under the existing rule variant.

**Status for PRA-UI-003–006:** implemented, awaiting user visual retest. Agent verification: all 607 frontend tests, frontend type checking/production build, formatting and whitespace passed. New coverage checks explicit/nested closure, pending guards, scope resumption/malformed ancestry, citation placeholder/None handling and modal Escape/focus. Focused Chrome verified a `P` premise / `¬P` assumption / `⊥` / `¬¬P` proof using explicit closure, inline edit/recovery, action alignment, modal behavior and 390px/320px bounds. It also verified `Q` to `P ∨ Q`. Only signed-out bootstrap API responses were intercepted; proofs used the real local engine. No backend/database or policy change. Evidence is ignored under `.codex-local/ui-audit/032/fitch-editing/`; screenshots were inspected. These checks are not a user visual sign-off or full accessibility audit.

### PRA-UI-007 — Replace Fitch Clear proof with range selection

- **Cases:** FIT-04, ACCESS-01; user-reported November 12, 2026.
- **Request:** delete a selected inclusive span, such as 7 through 5, while keeping the other lines; remove the separate Clear proof button. This supersedes PRA-UI-005's paired Clear/Check design for Fitch student/practice work.
- **Change:** selectable line numbers plus a line-menu range action, first-endpoint instruction/cancellation, highlighted inclusive selection and a native confirmation modal previewing every selected formula. Either endpoint order works; same-line selection can remove a single line. Selection itself writes nothing. Full selection leaves an empty proof. Unconfirmed entries block selection and stale authoritative snapshots block confirmation.
- **Subproof rule:** selecting an assumption requires including all entered lines of its subproof/nested blocks. Partial selection is explained and blocked; no automatic expansion removes unselected work. Deleting interior lines is allowed. Surviving citations/endpoints stay unresolved rather than silently retargeting or regrading.
- **Status:** implemented, awaiting user visual retest. Reference full-removal and malformed-proof recovery remain explicit controls; dependency/tree behavior is unchanged. No backend/database or checker-policy changes.
- **Verification:** all 614 frontend tests, frontend type checking/build, formatting and whitespace passed. Focused Chrome verified 7→5 selection/preview/highlight, Escape/focus/Keep, exactly three removed lines, renumbering/missing citation, full deletion, partial-subproof blocking, whole-subproof deletion and 390px bounds without page errors. The real frontend/engine was used; only signed-out bootstrap responses were intercepted. Temporary frontend/Chrome stopped; no user database/server changed. Evidence: `.codex-local/ui-audit/032/fitch-range/` (ignored). Desktop and mobile screenshots inspected. No user visual sign-off or full accessibility audit is claimed.

### PRA-UI-008 — Recover immediately from an accidental subproof close

- **Case:** FIT-01/FIT-03; user-reported November 12, 2026. The existing assumption-menu Reopen action was not discoverable enough for accidental closure.
- **Change:** show **Reopen subproof** beside Open/Close immediately after closing a block. It clears only that block's endpoint, restores its entry context and focuses the next formula. No line/formula/citation is removed or rewritten. The shortcut is disabled while a new entry or range selection is pending.
- **Boundary:** this is a quick reversal of the latest closure, not general undo. A subsequent confirmed edit or authoritative replacement invalidates the shortcut; the existing assumption-menu Reopen action remains available for deliberate later changes. Nested closure targets the just-closed child, not its parent or siblings.
- **Status:** implemented, awaiting user retest. Agent verification: all 617 frontend tests and frontend type checking/production build passed; changed-file formatting and whitespace passed. Added regression cases cover exact restoration, continued entry in the reopened scope, a later endpoint on re-closing, nested scope and pending-entry guards, and the durable menu fallback after another confirmed line. No new browser run is claimed for this small follow-up; the user visual retest remains pending. No backend/checker/persistence change.

### PRA-UI-009 — Group Fitch line actions into submenus

- **Cases:** FIT-02/FIT-03, ACCESS-01/ACCESS-02; user-requested November 12, 2026.
- **Grouping:** **Move line ›** contains Up/Down. **Subproof ›** contains the available Close/Continue/Reopen/Settings actions. **Delete ›** now groups single-line removal, a range starting at the current line and whole-subproof removal where applicable. Edit and Insert stay at the main level. Groups are omitted when inapplicable; movement boundary guards remain.
- **Interaction:** native nested popovers support mouse hover with a short pointer bridge, click/tap and normal button keyboard navigation. ArrowRight opens/focuses an enabled action; ArrowLeft or Escape returns to the group trigger without closing the parent. **Back to line actions** supports touch. Selecting an action closes both levels; outside dismissal, parent closure and scrolling invalidate nested views. Flyouts choose an available side and remain within narrow viewports.
- **Status:** implemented, awaiting user visual retest. Shared Fitch authoring/student/practice line menus use the grouping; dependency/tree menus are unchanged. No proof or assessment policy change.
- **Verification:** all 621 frontend tests, frontend type checking/production build, formatting and whitespace passed. New tests cover direct versus nested actions, disabled boundaries, exactly-once callbacks, parent retention, keyboard focus/Escape, Back/reset and hover group replacement. The jsdom popover stub now preserves ancestor popovers; native behavior was checked separately in Chrome. Focused Chrome passed hover pointer crossing, movement, keyboard open/Escape, settings-dialog transition, touch Back/Reopen and 390px/320px bounded menus without page errors. Only signed-out bootstrap API responses were intercepted. Temporary frontend/Chrome stopped. Desktop/mobile screenshots inspected; evidence under `.codex-local/ui-audit/032/fitch-submenus/` is ignored local evidence rather than CI or full accessibility conformance.

**PRA-UI-009 follow-up:** at the user's request, deletion now has its own **Delete ›** submenu. Single-line and range actions retain their existing confirmation/selection flows; an assumption offers whole-subproof deletion rather than unsafe removal of its opening line alone. Tests cover distinct callbacks, submenu dismissal and the assumption guard. No mutation or confirmation semantics changed. User visual retest remains pending.

### PRA-UI-010 — Edit the Fitch practice conclusion without restarting

- **Case:** FIT-01/FIT-02, WORK-01; user-requested November 12, 2026.
- **Change:** **Edit conclusion** appears beside the target in self-created Fitch practice only. Enter a new formula and choose **Apply conclusion**, or Enter; Cancel/Escape leaves the active target unchanged and returns focus. Empty/malformed formulas show a local error without changing the target or proof.
- **Retention/disclosure:** applying changes only the practice statement's conclusion, preserving all confirmed proof identities/formulas/citations/scopes and the unconfirmed next entry. Existing reports are cleared and no check runs automatically. Checking is disabled and old feedback hidden while the target editor is open; cancelling restores still-current prior feedback. Start-over/format discard resets the editor too. Assigned problems and instructor reference statements receive no new target-edit control.
- **Status:** implemented, awaiting user visual retest. All 626 frontend tests, frontend type checking/production build, formatting and whitespace passed. New tests cover target rechecking, pending/confirmed retention, invalid/cancelled edits, focus, restart cleanup and absence from assigned work. Focused Chrome checked the same flow with explicit valid/invalid rechecking, Enter/Escape/Cancel, desktop/390px/320px bounds and no page errors. Only signed-out bootstrap API responses were intercepted; proof checking used the real frontend engine. Temporary frontend/Chrome stopped. Screenshots inspected; ignored evidence: `.codex-local/ui-audit/032/practice-conclusion/`. No API/database/grading-policy change or full accessibility audit.

### PRA-UI-011 — Require complete fields before adding a Fitch line

- **Case:** FIT-01/FIT-02; user-requested November 12, 2026.
- **Change:** disable **Add line** until the new formula is nonblank, an enabled catalog rule is selected and its required line/subproof citation slots are filled with available targets. A short hint explains the next missing requirement; incomplete Enter cannot bypass the guard. Opening assumptions need a formula but no inference rule/citations. Rules with no inputs do not demand irrelevant citations. Rule changes retain entries but require clearing extra citation slots before confirming.
- **Boundary:** this checks entry completeness, not syntax, scope/discharge correctness or logical validity. Explicit **Check proof** remains authoritative; selecting an existing but open subproof is not a claim that it can be discharged. Previously retained/edited incomplete lines remain editable and **Done editing** does not trap the user. Server transport and assessment policies are unchanged.
- **Related fix:** staged citation selection now retains slot positions, so selecting the second citation first does not silently fill the first. Empty placeholders stay only in unconfirmed local entries; confirmation/persistence gates prevent incomplete slots from being committed as a new line.
- **Status:** implemented, awaiting user retest. All 631 frontend tests, frontend type checking/production build, formatting and whitespace passed. Coverage includes missing/disabled rules, formula/line/subproof requirements, zero-input rules, assumption exceptions, unavailable targets, second-first selection, clearing and Enter, plus existing pending/stale/scope/authoring behavior. Older regression setups now supply required fields rather than relying on blank insertion. Focused Chrome passed those entry flows, accepted conjunction, explicit syntax-error checking, 390px/320px bounds and no page errors. Actual frontend/engine; only signed-out bootstrap API responses intercepted. Temporary frontend/Chrome stopped. Ignored evidence: `.codex-local/ui-audit/032/fitch-entry-requirements/`; desktop hint screenshot inspected. No backend/database/checker-policy change or full accessibility sign-off.

### PRA-UI-012 — Keep edited practice premises aligned with the practice statement

- **Case:** FIT-02; user-reported November 12, 2026. Editing an original premise line changed the proof but left its supplied practice statement unchanged, causing “Premise formula does not match its supplied problem premise”.
- **Change:** in self-created Fitch practice, a premise formula edit updates the matching original premise by stable source ID as well as the visible proof line, clearing old feedback. Source reassignment is hidden in that context; students are editing their own premise, not linking to another source. Other premises, derived formulas, citations, scopes and the conclusion remain unchanged. Derived steps that no longer follow must still be corrected explicitly.
- **Boundary:** the synchronization callback is supplied only by independent Fitch practice. Assigned and instructor-reference problem statements remain fixed by their existing ownership workflows; editing a submitted answer does not change the supplied assignment premise. This does not relax the checker or add an API mutation.
- **Status:** implemented, awaiting user retest. All 634 frontend tests and frontend type checking/production build passed; formatting and whitespace passed. New cases check the original error's recovery, preserved derived work/citation identity, two identical premise formulas with different source IDs, blank-text recovery and assigned-content immutability. No extra browser run was performed for this focused state correction; tests invoke the real checker, and user visual retest remains pending.

### PRA-UI-013 — Dependency practice statement editing and complete new entries

- **Request:** carry the straightforward Fitch improvements into dependency proofs in slices, beginning with statement editing and entry completeness.
- **Change:** self-created dependency practice now offers **Edit conclusion** with the existing Apply/Cancel, validation and feedback behavior. Editing an original premise updates its supplied practice statement by stable premise ID. Confirmed proof work and pending entries are preserved; assigned and instructor-reference statements receive no new statement-editing controls.
- **Entry guard:** **Add line** requires a nonblank formula, an enabled rule, its required earlier-line citations and complete assumption/concluding-line discharge pairs. A short hint identifies missing fields; Enter cannot bypass the guard. Staged citation slots retain their positions when the second citation is chosen first or an earlier slot is cleared. Existing lines remain editable without trapping incomplete retained work.
- **Boundary:** empty dependency sets remain allowed, including after discharge. These controls check filled-in fields, not formula syntax, logical validity or correct dependency propagation; **Check proof** remains authoritative. No backend, database or checker-policy changes. Dependency menus, range deletion and further layout parity remain for the next slice.
- **Verification:** all 640 frontend tests, frontend type checking/production build, changed-file formatting and whitespace passed. Added coverage checks editable conclusions, retained pending work, duplicate-formula premise identities, assigned-statement immutability, required citations/discharges, second-first selection, clearing slots, empty dependencies and Enter guards. No additional real-browser run was performed for this slice; user visual retest and broader accessibility checks remain pending.

### PRA-UI-014 — Dependency line menus, range deletion and citation layout

- **Request:** carry the next straightforward Fitch controls into dependency proofs without changing their explicit dependency/discharge semantics.
- **Change:** group **Move line** and **Delete** actions into native submenus. **Delete** offers single-line deletion or a range starting at that line. Select the first and last line numbers in either order to preview the inclusive interval in a modal, then delete or keep the work. Selection highlights the affected lines, blocks competing edits, and can be cancelled. Remove the separate student/practice **Clear proof** button; selecting the entire interval leaves an explicit empty proof. Reference removal and malformed-identity recovery remain explicit modal actions.
- **Safety:** pending entries block selection, and an authoritative proof replacement invalidates an open deletion snapshot. Only selected lines are removed: surviving formulas, identities, citations, dependency sets and discharge pairs are preserved, with missing references requiring explicit repair. Dependency proofs do not acquire Fitch block-deletion rules or implicit assumption closure.
- **Layout:** citation fields now show **Line 1**, **Line 2**, etc., plus a **None** option; discharge fields identify assumption/concluding-line roles. Keep the rule selector across the full justification row, citations in matching columns and more vertical space between them. Space help/actions consistently and place the practice check action within the dependency editor. Existing horizontal proof scrolling remains available on narrow screens.
- **Verification:** all 644 frontend tests, frontend type checking/production build, changed-file formatting and whitespace passed. Regression cases cover reverse/full/middle/single selection, pending/stale guards, cancellation, explicit empty assigned answers and preserved unresolved references. Existing authoring tests now choose actual citation targets rather than option positions and use the new modal labels. Focused local Chrome verified an accepted conjunction, grouped menus, range preview/Escape, single-line deletion, unresolved references, 390px/320px page bounds and no page errors. Only signed-out bootstrap responses were intercepted; proofs used the real frontend/engine. Temporary frontend/Chrome stopped; desktop/mobile screenshots inspected. Ignored evidence: `.codex-local/ui-audit/032/dependency-range/`. No backend/database/checker change, full accessibility audit or user visual sign-off is claimed.

### PRA-UI-015 — Keep normal Fitch entry inside open subproofs

- **Request:** require explicit subproof closure before appending in the parent/main proof; keep dependency-proof semantics unchanged.
- **Change:** normal Fitch append resumes the deepest usable open subproof, even when an earlier insertion, moved line or scope repair leaves the final displayed line outside it. Returning from **Insert before** to **Append at end instead** also restores that context. The scope indicator explains that the subproof must be closed to continue in its parent. Attempting to continue an outer subproof while an inner one remains open shows a clear message. Closing each nested subproof returns entry to its parent; closing the last one permits main-proof entry.
- **Boundary:** earlier insertion and existing-line scope repair remain deliberate editing controls. Closure does not discharge an assumption or verify an inference. The shared Fitch editor applies this behavior to practice, instructor reference authoring and student attempts, including demo scopes. No dependency editor, checker, API or persistence rule was changed.
- **Verification:** all 646 frontend tests, frontend type checking/production build, changed-file formatting and whitespace passed. Added regression coverage for an open child despite a trailing root/outer line, parent-continuation blocking, insertion/append transitions, nested closure and subsequent root entry. Existing closure, reopening, malformed ancestry, authoring and assigned-work regressions passed. No additional real-browser run was performed for this focused scope correction; user visual retest remains pending.
