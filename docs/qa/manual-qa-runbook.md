# LogicLab manual QA runbook

Branch: `014-test-demo-qa`. Prepared October 27, 2026.

This is an executable test plan, not evidence that these checks passed. All cases start **Not run**. Record each run and its results in [findings and changes](findings-and-changes.md). Automated checks support this runbook but do not replace browser QA.

## 1. How to use this document

1. Complete setup and record the commit being tested.
2. Work through the sections in order. Keep the same demo workspace unless a case explicitly asks for a new one or reset.
3. For each case ID, record Pass, Fail, Blocked or Not applicable, plus a short observation. Do not mark a section passed because only its happy path worked.
4. On failure, stop that case, capture the exact steps and actual result, and open a finding. Continue unrelated cases; mark dependent cases Blocked.
5. Fix in small commits tied to finding IDs. Retest the original failure and affected neighboring cases at the new commit.
6. Run reset, short expiry/capacity and cleanup cases last: they intentionally invalidate or delete test data.

There is no requirement to finish in one sitting. Suggested sessions: setup/practice/demo; content/assignments/student work; unsaved-work/duplication/failures; accounts/isolation; operator/expiry/accessibility. No case below is pre-marked as passed.

### Evidence and issue discipline

Use run IDs such as `QA-RUN-001` and findings such as `QA-001`. Keep screenshots, sanitized notes and reproduction scripts under ignored `.codex-local/qa/<run-id>/`. Record shareable summaries in the tracked ledger. Never commit `.env`, passwords, email codes, cookies, invitation codes, token hashes or unsanitized HAR files. DevTools Copy as cURL includes cookies: keep it local and remove credentials from shared evidence.

Classify failures as blocker, major, minor or cosmetic. Treat cross-user data access, lost saved work, exposed credentials and unexpected real external effects as blockers. A known unimplemented feature is a scope note rather than a fabricated test failure; link the agreed scope.

### Browser workspaces

Use separate browser **profiles** for A and B. Incognito windows in the same browser can share one cookie jar; they are not reliably separate visitors. Tabs within A intentionally share its session. Keep profile C available for normal-account checks. Record browser/version and viewport for every run.

| Profile | Purpose                                                 |
| ------- | ------------------------------------------------------- |
| A       | Main demo instructor/student journey                    |
| B       | Independent demo visitor for isolation                  |
| C       | Normal Cognito instructor/student accounts when enabled |

## 2. Setup and baseline

### SET-01 — Prepare an isolated QA database

1. From the repository root, run `git branch --show-current` and `git status --short`. Record the branch and `git rev-parse --short HEAD` in the run record. Do not discard unrelated local changes.
2. Run `node --version`, `npm --version`, and `docker compose version`. Use the repository-required Node 24.9+ and npm 11.19.0+; start Docker Desktop if needed.
3. Keep the existing ignored `.env`; do not overwrite it with `.env.example`. Record which settings you will change in private local notes.
4. Run `npm run db:up`.
5. Connect DBeaver to the local server as described in [local database setup](../development/local-database.md). Create a new database named `logiclab_qa` using its Create Database action. If it already contains data, inspect it first; do not drop or truncate it.
6. Change only the database name in the local `.env` DATABASE_URL to `logiclab_qa`, retaining your actual user/password/host/port. Point DBeaver's QA connection at that database too.
7. Keep TEST_DATABASE_URL pointing at a **different disposable database ending in `_test`**. Integration tests must not use your browser QA data or ordinary development data.
8. Check for shell overrides with `printenv DATABASE_URL` locally if commands connect to the wrong database. Do not paste credential-bearing output into the tracked ledger.
9. Run `npm run db:migrate` against the QA database.

**Expected:** Docker/PostgreSQL is healthy; migrations complete in `logiclab_qa`; ordinary development data is untouched. If you cannot isolate the database, mark destructive/operator cases Blocked rather than running them against valuable data.

### SET-02 — Start demo-only mode

1. In the ignored root `.env`, set `DEMO_ENABLED=true`, `APP_ORIGIN=http://localhost:5173`, `AUTH_ENABLED=false`, and `BILLING_ENABLED=false`.
2. Leave normal lifetime/capacity defaults for the main pass. Demo billing works through its isolated runtime even with normal billing disabled.
3. Run `npm ci` only if dependencies need installing. If strict script approval fails, follow the [reviewed installation policy](../development/dependency-installation.md), not a blanket approval; then run `npm run dev` from the repository root and leave that terminal open.
4. Open `http://localhost:5173/` in profile A. If Vite selects a different port, stop the old conflicting process and restore 5173; do not casually change the origin while testing cookies.
5. Open `http://localhost:5173/api/health` in another tab.
6. Return to the **application tab at `http://localhost:5173/`** (not the `/api/health` tab). Open DevTools there and select Console and Network. Clear old entries; enable Preserve log when examining navigation failures.

**Expected:** Web and API start, health returns an OK JSON response, and anonymous practice loads. Health checks API availability, not every dependency. Normal sign-in is unavailable while AUTH_ENABLED=false; record that configuration rather than reporting it as a broken demo.

### SET-03 — Record automated baseline

Run these separately from the repository root, recording each outcome and commit:

```sh
npm run check
npm run db:test
npm run format:check
```

**Expected:** type checks/tests/builds/formatting pass. Database tests use the separate `_test` database. Record actual counts instead of copying historical totals. The Vite native-config and chunk-size warnings were resolved in QA-003/QA-004; report a recurrence. The existing Jest VM warning is not a failure by itself. Do not mark manual cases passed from these commands.

## 3. Anonymous truth-table practice

### PRA-01 — Correct, incorrect and blank cells

1. At `/`, use a short viewport, enter `P & Q` in **Propositional formula** and click **Create table**. After successful creation, verify the page scrolls smoothly to Your truth table; with reduced motion enabled, it moves without animation. Errors, answer checks and returning to an existing practice table must not trigger this scroll.
2. Verify row order TT, TF, FT, FF and fixed given columns P and Q.
3. In the final answer column, enter T, F, F, F. Click **Check answers**.
4. Change the first final answer to F; leave the second blank; check again.

**Expected:** first check reports four correct. Second reports two correct, one incorrect and one unanswered. Editing clears stale feedback before the next check; given values cannot be changed. False remains F rather than being mistaken for blank. Correct and incorrect answer cells have light green/red backgrounds plus readable Correct/Incorrect text and ✓/✕ markers; color is not the only signal. Dropdowns remain keyboard operable and show — for a blank. Use a formula such as `(P & Q) -> R` to compare intermediate and final columns: the final column retains a subtle left edge and slightly deeper green/red shading after checks.

### PRA-02 — Solutions, preservation and state reset

1. With a mixture of F and blank answers, click **Show solution** and then **Hide solution**.
2. Navigate to another application page and return to Practice without refreshing the browser.
3. Change the formula to `P -> Q` and create the new table.
4. Fill final answers T, F, T, T and check.
5. Refresh the browser.

**Expected:** showing/hiding solutions preserves entries. Expected values appear to the right of the dropdown, with T in green and F in rose/red, without a visible Solution label; assistive text identifies them as correct answers. In-app practice navigation preserves the mounted practice state. Editing the formula clears the prior exercise/answers; implication has the expected four answers. Browser refresh can reset anonymous practice: it is not a persisted assignment and is outside dirty-editor registration.

### PRA-03 — Parsing, limits and helpful errors

1. Create `!P`, answer F then T, and check.
2. Check the Keyboard guide: Meaning / Key / Symbol should read clearly beside the form on desktop and below it on mobile. Create `¬P`, `P ∧ Q`, `P ∨ Q`, and `P → Q` individually; compare with `!P`, `P & Q`, `P v Q` / `P | Q`, and `P -> Q`. Also try `V v P`: uppercase V must remain a variable.
3. Type `P &`, then pause for at least half a second. Verify a single inline invalid-formula message appears and Create table remains disabled; pressing Enter must not create a table or add a duplicate message. Complete it as `P & Q`; the old verdict should clear immediately and become well formed after the pause, enabling Create table. While a newly edited formula is awaiting validation, the button must stay disabled. Clear the field; feedback should clear. Try `p`, `AB`, and `P && Q` one at a time, verifying each remains invalid with Create table disabled.
4. Enter an opening parenthesis followed by two spaces using your usual keyboard. Verify it does not substitute a period or automatically change case; also check pasted notation remains unchanged. Record browser/OS if correction persists; remaining native substitution is an accepted limitation (QA-010), not a blocker.
5. Create `[(P v Q) & ![R -> P]]`; compare with `((P v Q) & !(R -> P))`. Verify equivalent rows/columns and answers. Try `[P)`, `(P]`, `[]`, and `[P`; each should produce local invalid feedback and keep creation disabled.
6. Try `P & Q & R & S`; then try `P & Q & R & S & T`.

**Expected:** supported symbols work; invalid formulas produce useful errors rather than a crash. Four variables generate 16 rows; five variables are rejected. Fixing input permits retry. Parentheses and intermediate columns remain readable. Full precedence/nesting bounds also have engine tests; see [engine rules](../../tools/logic-engine/README.md).

## 4. Demo entry, navigation and restoration

### DEM-01 — Fresh instructor workspace

1. Open `/demo` in profile A and choose **Explore as instructor**.
2. Open **Classes**. Locate **Demo: Introduction to Logic** and **Demo: Try simulated checkout**.
3. Open Problem library and Assignments; select the funded class.
4. Inspect **Your first truth-table assignment** and **Explore truth tables at your own pace**.

**Expected:** synthetic-data/no-real-charges notices are visible; two seeded classes and both assignments exist. The first is graded/submission-only; practice uses immediate feedback and anytime solutions. New workspaces use template 3. No signup, email or payment details are requested.

### DEM-02 — Role switch and deep-link reload

1. Use **Switch role, reset, or end demo**, then **Explore as student**.
2. Open Assigned work and choose the funded class.
3. Refresh `/demo/work` directly; then use Back and Forward through two visited demo pages.
4. Switch back to instructor through the demo controls.

**Expected:** the same visitor's instructor/student share classes and work; resource URLs remain under `/demo/...`. Reload restores the server session. No instructor links appear for a student. Role switching is not dual-role enrollment.

### DEM-03 — Invalid routes and no active demo

1. Open `/this-page-does-not-exist` and inspect the not-found page.
2. In a fresh profile B, open `/demo/assignments` before starting a demo.
3. Return to `/demo`, start B as instructor, and keep B separate for isolation tests.

**Expected:** unknown URLs have a usable not-found view; protected demo access requires a session rather than showing A's work. B gets a fresh independent workspace.

## 5. Reusable problem library

Perform these in A as instructor. Use titles prefixed with your run ID. Keep a private fixture note mapping each title to its ID and published versions.

### LIB-01 — Create, validate and restore a draft

1. Open Problem library and choose **New problem**.
2. Try saving a blank title/formula; then enter title `<run-id> Library`, instructions `QA instructions`, formula `P & Q` and save.
3. Select the saved problem again; reload the browser and reselect it.
4. Change the formula to invalid `P &` and attempt Save draft. Correct it back to `P & Q`.

**Expected:** invalid input is rejected with useful feedback; failed save retains entered fields. Valid saved content survives reload. The problem is private to its instructor until used in published class work.

### LIB-02 — Immutable publication history

1. Save `P & Q`, then click **Publish saved draft** exactly once. Record version 1.
2. Change the saved draft formula to `P | Q` and save. Publish once more; record version 2.
3. Compare version 1 and version 2 in Published versions. Preview each.
4. Edit draft instructions without saving; inspect publication/archive controls; then revert that edit.

**Expected:** version 1 remains `P & Q`; version 2 is `P | Q`; previews match their snapshots. Dirty edits disable publish/archive. Each deliberate publication creates a new version; repeated clicks are not an idempotent save. Publishing does not make the source draft read-only.

### LIB-03 — Archive, restore and retained publications

1. With clean fields, archive the problem.
2. Change Show problems to Archived or All and reselect it.
3. Verify fields are read-only and published history is still visible.
4. Restore the problem; verify editing returns and both versions remain.

**Expected:** archive changes visibility/editability, not existing publication contents. Restore does not erase version history. Later assignment selections can use retained publications.

## 6. Instructor assignments and fixed QA fixtures

Create the following saved assignments in the funded class. For each row: choose **New assignment**, set title/mode/timing/solution access, choose `<run-id> Library`, click **Add version 1**, Save assignment draft, then Publish assignment. Wait for each request to finish. Do not copy values from the latest mutable library draft.

| Fixture title suffix | Assessment        | Feedback                            | Solutions              | Purpose                              |
| -------------------- | ----------------- | ----------------------------------- | ---------------------- | ------------------------------------ |
| Graded               | Graded            | On final submission                 | After final submission | Scoring and retained results         |
| Completion           | Completion only   | On explicit Check answers           | After final submission | Full-cell completion without score   |
| Practice             | Ungraded practice | On explicit Check answers           | Anytime                | Private repeatable practice          |
| Immediate            | Ungraded practice | Immediately after an answer changes | Never                  | Automatic feedback without solutions |
| Anytime graded       | Graded            | On final submission                 | Anytime                | Independent solution release         |

Record actual titles with the run ID. Five publications/creations fit the default mutation buckets, but long QA runs can hit **10 requests per route/IP per 15 minutes**. A 429 is expected throttling: note it and allow the window to expire before continuing dependent cases. Do not repeatedly click or silently change limits to force a pass.

### ASN-01 — Empty draft and mode transitions

1. Create a separate `<run-id> Empty` assignment without problems and save it.
2. Try to publish it.
3. Change from Graded to Completion only; choose immediate timing and after-submission solutions.
4. Change to Ungraded practice, then back to Graded. Inspect timing and solution choices without saving invalid combinations.
5. Save a valid empty draft.

**Expected:** empty drafts save but cannot publish. Practice cannot select after-submission solutions; the replacement is announced. Immediate timing survives transitions between non-graded modes. Graded resets to submission-only. Invalid combined policies are not persisted.

### ASN-02 — Repeated occurrences and saved snapshots

1. Create `<run-id> Ordered` with version 1, version 2, version 1 in that order.
2. Use the item Move up/Move down controls to reorder; remove one occurrence, then add it again.
3. Save and publish with at least two occurrences, including a repeated version; record the final order.
4. Inspect final problem formulas and titles. Edit/save the library draft afterward without publishing another version.
5. Reload the assignment.

**Expected:** order and repeats match the saved list, each occurrence is distinct, and later library edits do not change pinned assignment content. No problem draft is substituted for its selected publication.

### ASN-03 — Published locks and archive/restore

1. Open the published Graded fixture. Try changing title, policy and problem order.
2. Archive it, inspect the Archived list, and restore it.
3. Confirm its original publication date and content remain fixed. Leave it active for student tests.

**Expected:** published content/policy is read-only. Restore does not unlock or republish it. Archived assignments disappear from active student work; restored published work becomes visible again to enrolled students.

## 7. Student work and instructor review

Switch A to student. Select the funded class. All fixture tables here use version 1 (`P & Q`) unless explicitly stated. Final-column answers in TT/TF/FT/FF order are **T, F, F, F**. Given columns are not input cells.

### WRK-01 — Saving false, blank and separate occurrences

1. Open Ordered, enter F in an answer cell of the first occurrence, then move to another occurrence and enter T.
2. Move back; save only the first problem.
3. Confirm the other occurrence remains dirty. Save it too.
4. Reload saved work; then refresh the browser and reopen the assignment.

**Expected:** occurrence answers stay independent even for the same formula. Saving one does not mark another saved. F is preserved as false; blank remains null/unanswered. Persisted entries survive reload/refresh. No final result appears just because work was saved.

### WRK-02 — Graded submission and frozen feedback

1. Open Graded. Enter final-column values F, blank, F, F. Save problem.
2. Confirm no Check answers or pre-submission solution is offered.
3. Verify final submission is disabled while edits are unsaved or confirmation is unchecked.
4. Save all edits, check the finality confirmation and click Submit final answers once.
5. Reload the assignment; try editing the final table; show/hide its now-available solution.

**Expected:** result reports two correct, one incorrect, one unanswered out of four. Final answers and result remain read-only and survive reload; solutions show alongside entries without replacing them. There is one final submission, not repeated grading or a retry attempt.

### WRK-03 — Instructor review and practice privacy

1. Switch A to instructor and open the Graded fixture in Assignments.
2. Open its submission review and inspect the retained student answers/result.
3. Later, after doing Practice, open the practice fixture as instructor and look for submission review.

**Expected:** graded final work matches the student's frozen result. Private practice has no instructor submission review or exposed private drafts. Instructors do not see unsaved/student practice work as submissions.

### WRK-04 — Completion is about filled cells, not correctness

1. Switch to student, open Completion, and leave at least one answer blank.
2. Save; try to enable final confirmation/submission.
3. Fill every answer cell with F, intentionally making the TT answer incorrect; save every edited problem.
4. Check answers before finalizing; then confirm and submit.
5. Reload and inspect the instructor's review after switching roles.

**Expected:** any blank blocks completion finalization. Fully filled but incorrect work can complete. Final result shows completed/total cells with no correctness score or grading feedback, and remains frozen. After-submission solutions unlock; instructor review also stays score-free.

### WRK-05 — Private practice, explicit checks and solutions

1. As student, open Practice. Enter an incorrect value and pause without pressing Check answers.
2. Click Check answers, edit the value, then check again.
3. Show/hide the solution, save, and reload.
4. Look for a final-submit button or official score.

**Expected:** on_check does not check automatically. Manual checks are transient; edits clear old feedback. Solutions preserve entries. Save is explicit. Practice has no final submission or official grade; instructor privacy is retained.

### WRK-06 — Immediate feedback, rapid edits and neutral blanks

1. Open Immediate. In the TT final cell enter F and stop for roughly 1.2 seconds.
2. Confirm Incorrect appears; change it to T, watching old feedback clear before the new result.
3. Rapidly switch that cell F/T/F/T, then pause.
4. Inspect Network for `/check` requests and leave other cells blank.
5. Edit again and immediately click Check answers. Save only when you choose to persist the entries.

**Expected:** one debounced automatic check uses the latest answers. Manual Check bypasses/cancels the queued check. Blank cells have no Unanswered marker in immediate mode. Never means no solution button or expected values from checking. Checks leave edits unsaved and create no official grade. Graded work still has no automatic check.

### WRK-07 — Independent anytime solution policy

1. Open Anytime graded before any final submission.
2. Show its solution, enter answers, and hide the solution.
3. Inspect checking/submission controls.

**Expected:** anytime solutions are deliberately available before graded submission. This does not enable manual/automatic checking or autosave; entered answers remain intact and final submission is still explicit.

## 8. Duplicate assignment

### DUP-01 — Copy draft, publication and archived source

1. As instructor, select a saved draft with ordered/repeated problems and click Duplicate as draft.
2. Record the returned new ID from its Network response; inspect title, policy and order.
3. Edit the copy's title and save. Reselect the source and inspect its unchanged values.
4. Repeat once for a published source and once for an archived source, respecting mutation limits.

**Expected:** each copy is an active editable same-class draft with a Copy of title, new assignment/item IDs, preserved pinned order/policy, and no publication/archive timestamps. Student submissions/results are not copied. Later saving targets the copy ID. The source is unchanged.

### DUP-02 — Unsaved source edits and existing filters

1. Edit a source draft title without saving. Click Duplicate as draft, then Stay.
2. Confirm no duplicate POST occurred and the edit remains.
3. Click Duplicate again, choose Discard changes, and inspect the opened copy.
4. Duplicate a source while the list filter is Archived.

**Expected:** duplication copies saved source content, not local edits. Success opens a clean new draft; the Archived filter is preserved and may hide that active copy from the list. It remains open/editable. A new unsaved assignment has no duplication action.

### DUP-03 — One request and uncertain-response recovery

1. In Network, enable Slow 3G. Double-click Duplicate as draft on a clean saved source.
2. Count duplicate POSTs and inspect disabled controls; restore No throttling.
3. For a safe repeatable failure, set Network Offline before a duplicate request, then restore Online.
4. Read the error, reload Active or All assignments, and inspect the list before deliberately trying again.
5. Do not simulate a lost-after-commit response by guessing: log that scenario as automation-covered unless you deliberately build a controlled local reproduction.

**Expected:** one request is issued for the double-click. A failed/unconfirmed request preserves source edits and warns that another request can create another copy. Reload is only a read; there is no automatic POST retry. Stopping the browser request does not prove the server canceled a write.

## 9. Unsaved-work protection and native dialog

For UNS-01 through UNS-04 run the actions separately on student answers, an assignment draft and a library draft. Use fresh edits for each destructive attempt. Do not use browser reload while recording unsaved data you need later.

### UNS-01 — Navigation Stay, Discard and fresh consent

1. Edit a saved value without saving; click a different navigation link.
2. Choose Stay; inspect URL, selected class/problem and all edited fields.
3. Attempt navigation again; press Escape.
4. Attempt again; choose Discard changes. Return and reopen the source.
5. Make another edit and attempt a new navigation.

**Expected:** Stay/Escape cancel navigation without losing edits or sending the destructive action. Discard follows the intended destination; reopened content is the last saved version. The next dirty edit requires new consent—no permanent bypass.

### UNS-02 — Same-page actions and non-destructive actions

1. With dirty student answers, change Class, choose another assignment, reselect the current assignment and Reload saved work, one at a time; choose Stay each time.
2. With a dirty instructor assignment, try New assignment, class change and Reload saved assignment; choose Stay.
3. With a dirty library draft, try New problem and another problem; choose Stay.
4. Refresh each list, change list filters, paginate where available, and preview library content without replacing the editor.
5. Move between problems in one student assignment.

**Expected:** destructive replacements ask; controlled selections and inputs remain unchanged on Stay. List/filter/preview operations and within-assignment problem navigation retain edits without unnecessary prompts. Accepted replacement acts only on the chosen transition.

### UNS-03 — Clean, saved, failed-save and read-only states

1. Change a field, then restore its exact saved value; navigate away.
2. Make another edit, save successfully and navigate away.
3. Make an edit, turn Network Offline, attempt Save, restore Online, and attempt navigation.
4. Open published/read-only assignments, archived library drafts and a submitted student attempt; navigate between them.

**Expected:** reverted/saved work does not warn; failed-save work stays protected with entries intact. Read-only work does not create false dirty warnings. Ordinary class-name/account forms and anonymous practice are not registered persisted editors in this branch.

### UNS-04 — Keyboard focus, Back/Forward and unload

1. Open a discard dialog. Confirm initial focus is Stay; Tab/Shift+Tab through its controls and try interacting with the page behind it.
2. Press Escape; check that focus returns to a usable originating control. Reopen and test both buttons with keyboard only.
3. From a dirty editor, use browser Back, choose Stay, then Back/Discard; exercise Forward too.
4. Make a fresh edit and refresh the browser. Cancel the browser warning; inspect the retained page. Repeat and accept the warning only after recording the edit.
5. Try closing a disposable dirty tab and an external navigation. Compare a clean tab.

**Expected:** native modal contains interaction/focus and has an accessible name/description. Back/Forward stays consistent with the displayed URL. Browser-owned unload warnings are best effort, require user interaction in many browsers, and have browser-controlled wording. Clean work does not warn. Record browser differences; do not claim guaranteed crash recovery.

## 10. Simulated billing and publication gates

### BILL-01 — Unpaid authoring versus publication

1. As instructor, select Demo: Try simulated checkout in Assignments.
2. Create/save a draft with a published problem and try Publish assignment.
3. Open Billing (simulated), select that class, choose an available Plan, and click Create simulated checkout.
4. Inspect purchase history before simulating any outcome.

**Expected:** drafting/duplication is permitted without coverage; new publication is blocked. Pending checkout has no coverage or real provider redirect and displays no-real-charge messaging. Server terms are shown; browser input cannot choose arbitrary prices.

### BILL-02 — Success, failure and separate purchases

1. On the pending checkout, choose Simulate success and reload billing.
2. Publish the earlier draft; record its ID and publication date.
3. Create a second checkout only if you intend a separate purchase; choose Simulate failure.
4. Reload history and compare both purchase IDs/statuses.

**Expected:** success grants publishing coverage; failure does not remove another valid grant. Pending/paid/failed states survive reload. Another paid purchase is a separate period starting immediately, not an automatic extension. No card details or real charge occur.

### BILL-03 — Refund and retained work

1. Refund the class's only paid grant using Simulate refund. Reload coverage.
2. Try to publish a new draft; then open the previously published assignment.
3. As student, save/read existing published work in that class if enrolled.
4. Restore funding with a deliberate new successful checkout if further cases need publication.

**Expected:** without another valid grant, new publication is blocked; existing published work remains accessible under ordinary enrollment/policy rules. Refund does not erase submissions. Another still-valid grant may legitimately keep coverage active; inspect all purchases before reporting a failure.

### BILL-04 — Checkout retry identity

1. In a disposable purchase scenario, take Network Offline before Create simulated checkout.
2. Restore Online. Use Retry checkout if offered; inspect history before discarding retry intent.
3. Reload billing and verify the recovered/pending purchase count.

**Expected:** retries retain the same checkout intent rather than silently creating repeated purchases. Uncertain simulator outcomes require reconciliation/read retry; do not repeatedly click success/refund. See [billing reference](../api/billing-api.md) for intentional terminal-state rules.

## 11. Classes, invitations and student enrollment

### CLS-01 — Create and validate classes

1. As A instructor, open Classes; try a blank/whitespace-only name.
2. Create `<run-id> Invitation class` with leading/trailing spaces.
3. Reload classes and then refresh the page.

**Expected:** blank names are rejected, saved names are trimmed, and the new class persists. Duplicate names are allowed. No class edit/delete/roster-removal workflow is assumed.

### CLS-02 — Invite, redeem and replace

1. Generate new invitation code for Invitation class and keep it privately.
2. Switch A to student; open My classes and redeem the code. Reload the enrolled-class list.
3. Redeem that same current code again.
4. Switch A to instructor; generate a replacement code. Switch to student and try the old code, then the new code.

**Expected:** valid redemption enrolls once; repeating a current code does not duplicate enrollment. Old/replaced codes are rejected; already-established enrollment remains. The raw code is shown on generation only, not retrieved after leaving/reloading, and is not in browser storage.

### CLS-03 — Wrong workspace and invalid code

1. From B as student, try A's current demo invitation code.
2. Try a clearly invalid code in A, then switch back to instructor and inspect navigation.
3. Confirm instructor accounts have no student enrollment operation.

**Expected:** cross-workspace redemption fails without exposing A's class; invalid codes have useful sanitized errors. Role choices do not turn an instructor into a simultaneous student account.

## 12. Isolation and normal/demo coexistence

### ISO-01 — Independent visitors and role guards

1. Create a uniquely named problem/class/assignment in A.
2. In B, inspect the corresponding lists in both roles.
3. Copy A's assignment ID privately. In B DevTools Console, issue a GET to `/api/demo/resources/assignments/<A-id>` as instructor, or `/api/demo/resources/student/assignments/<A-id>` as student, using same-origin fetch.
4. For an instructor GET, paste this in B's Console after replacing the ID (do not paste cookie values):

```js
fetch('/api/demo/resources/assignments/REPLACE_WITH_A_ASSIGNMENT_ID')
  .then(async (response) => ({ status: response.status, body: await response.json() }))
  .then(console.log);
```

5. In B as student, directly open `/demo/assignments`, `/demo/library` and `/demo/billing`.

**Expected:** A's data is absent from B. Foreign resource reads return sanitized 404; role-restricted screens deny student access. Hidden navigation is complemented by API authorization, not used as the only protection.

### ISO-02 — Same browser, reset generation and multiple tabs

1. Open A's workspace in two tabs. Edit answers in one tab and switch role in the other.
2. Return to the first tab and perform a server-backed action.
3. Repeat with Reset demo in the second tab. Inspect restored lists and reopen work in the first.

**Expected:** stale credentials/state cannot revive the old workspace generation or write into a different user's data. On refresh/reconciliation, pages reflect the current session. Exact stale-tab UX should be recorded; local dirty warnings must not override server authorization. Do not expect separate tabs to be independent visitors.

### ISO-03 — Request/response privacy

1. Inspect assignment exercise/read/check responses before final submission in Network.
2. Inspect normal/demo cookies in DevTools Application, and localStorage/sessionStorage.
3. Review API terminal output after a normal action and a failed action; inspect sanitized error bodies.

**Expected:** exercise/check responses contain no expected answer values unless independently permitted solution access is used. Cookies are HttpOnly with expected scope/SameSite; localhost HTTP cookies need not be Secure. Tokens, passwords, raw invitation codes and provider details are not exposed through public resource responses or logs. Browser storage contains no auth/demo tokens or saved answer copies.

## 13. Optional live Cognito and normal-account pass

This section needs an existing development Cognito pool and controlled email inboxes. If unavailable, mark it Blocked with the missing prerequisite; do not pretend demo coverage verifies Cognito. It sends real verification/recovery emails and consumes development quotas. Follow [Cognito setup](../development/cognito-development.md); no new AWS resource is required just to write this runbook.

### AUTH-01 — Enable normal accounts without losing demo access

1. Stop the dev process. Preserve the QA database and enable AUTH_ENABLED with real development Cognito IDs/secret/key in the ignored `.env`.
2. Keep DEMO_ENABLED=true. Enable normal BILLING_ENABLED only if simulator signing configuration is ready; run `npm run billing:seed` explicitly if normal billing needs a catalog.
3. Restart `npm run dev` and open `/account` in C. Keep A's demo available separately.

**Expected:** both namespaces are available. Invalid enabled config fails clearly at startup. Reused Cognito accounts whose local rows exist only in another database may not provision into the fresh QA database; use fresh controlled signup identities rather than treating that as a supported account-import flow.

### AUTH-02 — Signup, confirmation and immutable role choice

1. Create a fresh instructor account with an address you control and a 12–128 character password containing uppercase, lowercase, a digit and a symbol; record neither in the public ledger.
2. Attempt login before confirmation; then confirm using the emailed code and sign in.
3. Repeat for a separate student in a separate profile. Try an invalid confirmation code and a resend, respecting quotas.
4. Inspect the restored user ID/role after refresh. Try an obviously wrong password once.

**Expected:** password rules are explained/enforced; unconfirmed/wrong credentials fail generically. Valid confirmation permits login, role persists and cannot be changed through login fields. Account-neutral resend responses do not disclose existence/delivery details. Password inputs clear after submitted requests.

### AUTH-03 — Recovery, logout and restoration

1. For a disposable student account, choose Forgot password, request a code, and complete Reset password.
2. Try the old password, then the new one. In another tab with the old session, attempt an authenticated resource request.
3. Sign out, refresh, and use Back toward protected work.
4. Sign in again, record user ID/role, close/reopen the tab and verify session restoration.

**Expected:** reset invalidates local sessions and changes the password. Logout removes access; Back does not reveal authorized data from a dead session. Valid sessions restore the same application identity. Invalid/reused recovery codes do not crash the app. Provider/storage reconciliation failures must be recorded rather than bypassed with account recreation.

### AUTH-04 — Normal class/assignment path and coexistence

1. As normal instructor, create a class and library problem/publication, generate an invitation, and have the normal student redeem it.
2. Fund normal class publication with the configured no-charge simulator if available; create/publish one graded assignment, submit as student and review as instructor.
3. Duplicate the saved assignment and inspect the active draft.
4. In the same browser profile, start/use/end a demo and return to the normal account.
5. Try a normal invitation in a demo student workspace and a demo code as the normal student.

**Expected:** normal workflow matches the demo's resource behavior, with Cognito-backed identity. Ending/resetting demo does not sign out the normal account or expose normal data. Invitation namespaces remain isolated. If normal billing is disabled and there is no grant, publication is correctly blocked; mark downstream work Blocked, not passed.

### AUTH-05 — Normal cross-owner and unenrolled student checks

1. Use a second controlled normal instructor account; attempt to read the first instructor's class/assignment by ID via the normal API.
2. Use a normal student not enrolled in that class; attempt the assigned-work read by ID.
3. Attempt instructor-only API operations as that student without modifying credentials.

**Expected:** cross-owner/unenrolled reads return 404 and student instructor operations return 403. Do not use real classroom/student records for this test.

### AUTH-06 — Provider token refresh within a valid local session

1. Sign in with a disposable normal account and record its public application user ID/role.
2. Read the configured access-token lifetime from the existing development Cognito app client or deployment configuration; do not copy tokens or change the pool settings to force this test.
3. Leave that signed-in browser profile intact beyond that access-token lifetime but within the local session's valid lifetime.
4. Refresh the application and inspect `/api/auth/session`, then open an authorized class/resource page.

**Expected:** provider refresh behind the server-managed session preserves the public user ID/role and authorized access without asking for another password. No provider access/refresh token enters browser storage. If you cannot wait for expiry or inspect the configured lifetime, mark this case Blocked/Not run; mocked refresh tests are separate evidence.

## 14. Failures, request replacement, conflicts and rate limits

### ERR-01 — Read failure and retry

1. Take Network Offline, then load a class list, library or assignment detail.
2. Restore Online and use the visible Retry/Reload action once.
3. Repeat for a solution request and a manual check; retain a known F answer.

**Expected:** errors are useful, loading stops, retry works, and failed checks/solutions do not erase answers. Failed detail reads offer retry rather than creating a new draft by accident. No unhandled Console exception or credential details appear.

### ERR-02 — Slow requests and stale results

1. Enable Slow 3G, start a check, then change the answer before it completes.
2. Start a list/detail read and change class/assignment; accept discard only if requested.
3. Start a save or duplicate, leave the class, and later reload the original class to inspect server state.
4. Restore No throttling.

**Expected:** canceled/older responses cannot overwrite newer answers or another class's editor. A server write may have committed despite client cancellation; inspect before repeating it. Existing saved data is not silently rolled back by navigation.

### ERR-03 — Two-tab revision conflict

1. Open the same unfinished student assignment in two tabs under one session and load its saved revision in both.
2. Save an edit in tab 1; then try saving a different edit from tab 2 without reloading it.
3. Capture the conflict, copy any needed local answers privately, and reload saved work deliberately.

**Expected:** stale revision is rejected rather than silently overwriting tab 1. Tab 2 retains local entries and protection until explicit discard/reload. There is no merge or autosave feature to assume.

### ERR-04 — Throttling and input boundaries

1. Last in a session, deliberately repeat one harmless invalid mutation on a disposable fixture until its per-route limit is reached, or inspect an existing 429 encountered naturally. Never use duplicate/publish success to generate this load.
2. Record status, message and recovery window. Allow the window to expire.
3. Try blank/oversized titles, invalid IDs and unexpected request fields via a local DevTools request only if comfortable; otherwise mark the API-only subset automation-covered and link tests.

**Expected:** limits return 429 without corrupting data; permitted later retry works. Most resource mutations allow 10 per route/IP per 15 minutes; reads allow 60/minute. Student answer checking has its own route configuration—inspect response headers/current route rather than assume a universal budget. Strict invalid bodies/IDs fail cleanly. Do not paste cookies into issue reports.

## 15. Demo reset, expiry, capacity and operator jobs

Only run this section against the isolated QA database. It intentionally expires and deletes demo work. Finish screenshot/result collection first. No background automation should be assumed: API startup does not run worker/scheduler cycles.

### OPS-01 — Explicit reset and logout

1. In A, create a named extra class/problem/copy and save or finalize student work.
2. Note its workspace ID/generation and expiration privately from the demo session response.
3. Reset demo and choose a role again. Inspect both seeded classes/assignments, billing and student attempts.
4. Check B's unique data. End A's demo, then open `/demo/work` again.

**Expected:** reset rotates credentials, increments generation, restores template 3 and clears visitor-created content/attempts; it retains the original absolute deadline and selected role. B is untouched. End demo removes the demo session but does not immediately delete the database workspace or normal account session.

### OPS-02 — Short idle and absolute expiry

1. Stop dev. Save the original lifetime settings privately. Set idle timeout 60 seconds, max lifetime 180 seconds, activity interval 5 seconds in `.env`; restart.
2. Start a **new** disposable demo. Leave it idle for at least 75 seconds, then attempt a server-backed operation.
3. Start another fresh demo. Perform deliberate POST actions such as answer edits/checks every 20–30 seconds, within rate limits, and attempt an operation after 180 seconds from creation.
4. Do not treat polling or merely watching the page as activity. Do not reset to extend the deadline.
5. Restore original lifetime settings and restart after this group. Existing workspaces retain their recorded deadlines.

**Expected:** idle and absolute expiration deny access independently of cleanup; activity cannot extend the absolute deadline. Stale mounted pages do not authorize writes. Record any redirect/recovery problem. Browser unload protection does not prevent forced credential expiry.

### OPS-03 — Capacity includes expired stored workspaces

1. Using DBeaver, count `demo_workspaces` in the QA database. Record the number privately.
2. Use `select count(*) from demo_workspaces;` in DBeaver's QA connection for the count. Stop dev, save the capacity setting, and set DEMO_MAX_WORKSPACES=1; restart.
3. With at least one stored workspace present, attempt a fresh visitor start in a separate profile.
4. If testing from a newly empty QA database, start one workspace first, then attempt the second.
5. Restore the original capacity afterward.

**Expected:** another start is refused with a useful capacity response. Expired but uncleaned workspaces still count; no partial visitor graph is created on rejection. Lowering capacity does not delete existing data. Use cleanup, not ad hoc DELETEs, to reclaim expired roots.

### OPS-04 — Disabled schedules and manual cleanup

Run from the repository root, with DATABASE_URL still pointing to QA:

```sh
npm run jobs -- help
npm run jobs -- setup demo_cleanup
npm run jobs -- setup billing_reconciliation
npm run jobs -- schedules 0 20
npm run jobs -- list 0 20
```

1. Record the returned schedule IDs. Repeat setup once and compare IDs/settings.
2. Confirm newly created schedules are disabled. Start/restart the API; check that this alone does not execute them.
3. Make sure an expired disposable workspace from OPS-02 exists. Enqueue cleanup with a unique run key:

```sh
npm run jobs -- enqueue demo_cleanup QA-RUN-001-cleanup-1
npm run jobs -- worker 10
```

4. Record enqueue jobId and worker output. Inspect that exact job with `npm run jobs -- inspect <job-id>`.
5. If another queued job ran first, inspect the queue and run another bounded worker cycle; worker is not filtered to cleanup.
6. In DBeaver, confirm the expired workspace/owned graph is removed, while active B and normal QA users/classes remain.

**Expected:** setup is repeatable and preserves settings; manual job history is durable. Cleanup deletes at most ten expired roots per execution and skips locked ones. Non-expired/normal/shared/audit data remains. Deletion and history finalization commit separately, so interruption can leave incomplete counts; do not infer corruption solely from a count mismatch.

### OPS-05 — Report-only reconciliation, deduplication and cycles

1. Enqueue a reconciliation job and run a worker cycle:

```sh
npm run jobs -- enqueue billing_reconciliation QA-RUN-001-reconcile-1
npm run jobs -- worker 10
npm run jobs -- inspect <job-id>
npm run jobs -- findings <job-id> 0 20
```

2. Repeat enqueue with the same request key; compare job IDs. Use a different key for deliberately new work.
3. Compare billing purchase/coverage state before and after reconciliation. Do not deliberately corrupt retained records through SQL just to manufacture a finding.
4. Enable one QA schedule by its ID, invoke `npm run jobs -- scheduler 20`, inspect jobs, then pause it immediately. If nextRunAt is not yet due, record no due occurrence and revisit after its configured interval.
5. Run the scheduler again for the same due occurrence; inspect for unwanted duplicates. Leave schedules paused when finished.

**Expected:** reconciliation reports without repairing/changing billing or access. Healthy data may produce zero findings. Same-key manual enqueue reuses one intent; due scheduling is occurrence-deduplicated. Cycles run once and exit; no automatic timer is installed. The next branch may add an external trigger only after deployment design.

### OPS-06 — Operator errors and advanced recovery evidence

1. Run `npm run jobs -- inspect not-a-uuid` and inspect the error/exit status.
2. Review current integration coverage for expired leases, fencing, rollback, lock skipping and reconciliation snapshot consistency in `services/api/test/integration/`.
3. Record those advanced cases as automation-covered with commit/command evidence unless you execute a controlled reproduction yourself.

**Expected:** invalid commands fail usefully without exposing connection strings. Exit 0 means command success; findings alone are not execution failure. Worker exit 2 requires inspecting retry/recovery/failure/stale-finalization output; exit 1 is argument/config/runtime failure. Do not mark crash/lease scenarios manually passed from a normal worker run.

## 16. Keyboard, mobile, compatibility and pagination

### UX-01 — Keyboard and accessible feedback

1. Without a mouse, navigate the header, class selectors, editor forms, table answer selectors, action buttons and discard dialog using Tab/Shift+Tab/Enter/Space/Escape.
2. Check visible focus, associated labels and error announcements using your browser accessibility inspector; use a screen reader if available and record which one.
3. Enter an incorrect answer and inspect its accessible description/invalid state; verify a blank immediate-feedback cell remains neutral.

**Expected:** controls have useful names and visible focus, reading order is coherent, and no essential control requires a pointer. If no screen reader is used, leave that subset Not run; an inspector is not a screen-reader audit.

### UX-02 — Mobile layout and zoom

1. Use responsive DevTools at 390×844 and a smaller supported width such as 320px.
2. Visit demo controls, class lists, library editor/history, assignment editor/items, billing and student work.
3. Open a four-variable truth table and scroll its table region horizontally; inspect page-level overflow.
4. Open the discard dialog and zoom to 200% in a desktop viewport.

**Expected:** text/controls remain reachable and readable; table scrolling stays within its region instead of breaking the page. Modal buttons remain visible, and zoom does not hide the only exit/action. Capture screenshots per failing screen, not only the landing page.

### UX-03 — Pagination and browser matrix

1. Test any visible Load more controls for classes/enrollments, library/problems/versions, assignments, billing plans/purchases, submission review and job findings.
2. If the QA dataset has no second page, use a deliberately prepared disposable fixture or mark that manual subset Not run and reference automated boundary tests; do not create dozens of mutations just to hit a page boundary.
3. Where a second page exists, verify append order, no duplicates, final-page button disappearance, retries and selection preservation.
4. Repeat core student, duplicate and unsaved-navigation cases in a second browser engine (for example Safari or Firefox) if installed; record the engine/version separately.

**Expected:** pagination does not reset an unrelated dirty editor or duplicate rows. A Chrome pass is not a cross-browser pass. Rate limits, capacity and private-browser cookie sharing must not be mistaken for pagination bugs.

## 17. End-of-run review and exit criteria

1. Stop throttling/offline mode and restore original environment settings. Pause QA schedules; stop only QA processes you started. Keep databases unless their removal is separately agreed—do not run `docker compose down -v` as a routine cleanup step.
2. Update case results, findings, fixes and regression evidence in the ledger. Record remaining Blocked/Not run cases explicitly.
3. After fixes, rerun `npm run check`, `npm run db:test` when persistence/API guarantees are touched, and `npm run format:check`. Record exact commit and actual results.
4. Retest each finding's reproduction and its affected workflows. Reopen failures rather than writing a new Pass over old evidence.
5. Review the final ledger and prepare a branch PR draft only when the agreed pass is ready; summarize final changes and remaining risks.

QA exit requires no unresolved blockers, an explicit disposition for major issues, completed required cases for the supported browser/environment, and documented acceptance of remaining gaps. It does not certify hosted infrastructure, real payments, institutions/subscriptions, autosaving, derivations, deadlines, rosters/removal, or deployment automation—those are outside current scope.

### Advanced cases without a manual control

Use the automated suites as separate evidence for seven-day invitation expiry, parser nesting/length limits, webhook signatures/replay/order, catalog retirement and saved-term validation, refund/publication races, concurrent enrollment/invitation rotation, submitted-work database retention, demo generation fencing/rollback, cleanup lock skipping and job lease fencing/retry exhaustion. Record the exact test file/commit/command actually executed. Do not alter retained financial records or disable retention triggers to manufacture manual cases. If a manual reproduction is required for a finding, add a dedicated disposable fixture and document it before running it.
