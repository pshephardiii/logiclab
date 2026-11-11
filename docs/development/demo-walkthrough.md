# Reviewer walkthrough

This is a short tour of the implemented instructor/student experience. It uses isolated synthetic data and simulated payments. No signup, email, card details, or real charge is required. A hosted URL is not available yet; use [local demo setup](public-demo.md) and open `http://localhost:5173/demo`.

Allow roughly five to ten minutes. Labels below match the current demo template; this is a walkthrough, not a claim that hosted deployment has been verified.

## 1. Inspect the instructor's starting state

Choose **Explore as instructor**. Under **Classes**, find:

- **Demo: Introduction to Logic** — funded, with an enrolled student and six published assignments.
- **Demo: Try simulated checkout** — initially unpaid.

Open **Problem library** to inspect **Implication and disjunction**. It has an editable draft and an immutable published version. Its formula is `(P -> Q) & (!P | Q)`. Open **Assignments**, select the funded class, and inspect **Your first truth-table assignment**. The assignment pins a published version rather than following future draft edits.

You can also choose **Duplicate as draft** on the saved assignment. The new copy is editable, keeps the same ordered problem publications and learning settings, and has no student submissions or publication timestamp. Leave it as a draft and use the original assignment for the rest of this tour. If you have unsaved edits, Stay retains them; Discard permits copying saved content rather than those edits.

This demonstrates reusable content, versioning, and class-scoped publication.

## 2. Complete the same assignment as a student

Use **Switch role, reset, or end demo**, then **Explore as student**. This changes role within the same workspace.

Open **Assigned work**, select the funded class and example assignment. Enter some T/F answers and use **Save problem**. Reload saved work to confirm persistence. Leave an incorrect answer or a blank to make the submission feedback visible.

Follow the final-submission confirmation. Submission freezes the saved answers and produces feedback; the seeded assignment permits solutions after submission. Final work is read-only. This flow differs from anonymous practice, where visitors can check freely without creating an official submission.

## 3. Try immediate feedback without submitting

As the student, select **Explore tables and concepts at your own pace** in the funded class. In the first row, enter **F** for the final answer: with P and Q both T, the formula evaluates to T. Pause for about 1.2 seconds and look for **Incorrect**. Change the answer to **T** and pause again; the old feedback clears while the new check runs. Blank cells have no Unanswered marker.

Try several quick edits: checking waits until you pause. **Check answers** runs immediately. Neither action saves or submits; use **Save problem** to persist entries, then reload to confirm. Solutions are available anytime through the separate button, and practice has no final submission. Switch between the graded and practice assignments to compare their feedback rules.

Use the **Problem** selector to open **Recognize a contradiction**. Select True to see Incorrect, then False to see Correct. This is a filled answer, not a blank. Open **Classify a formula** and try Contradiction before Tautology. **Save problem** persists only the selected occurrence; switching problems retains local edits. **Clear answer** restores an unanswered choice. **Show assigned solution** reveals the correct answer and explanation; hiding it does not change your selected answer.

New visitors receive template 7. If your current workspace predates it, explicitly reset to get the updated practice example; role switching alone preserves existing data.

## 4. Review the submission as the instructor

Return to the demo controls and choose instructor. Under **Assignments**, select the funded class and example assignment, then review its submitted work.

The instructor sees the work just submitted by the synthetic student. This demonstrates that role switching preserves one shared classroom journey, while separate visitors receive independent data.

## 5. Compare independent grade and answer release

As the student, open **Tables and concepts: separate grade and answer release**. Complete and save all three problems, then submit. This graded example returns a receipt while grades are pending; it does not allow pre-submission checks.

Switch to instructor, open that assignment and choose **Reveal answers**, then **Confirm answer reveal**. Switch back to student: solutions and explanations are now available, but the grade is still pending. Return as instructor and choose **Release grades**, then **Confirm grade release**. The student's result is now visible. You can also release grades before answers; the controls are independent. Graded correctness can still imply binary answers even with the answer key locked.

The problem library also lets you create a True/false or Multiple choice question, supply its key and optional explanation, save it and publish a version. Add that version to a new assignment through **Add published problems**. Option text edits and moves preserve option identity; published versions retain their original keys. Draft and version previews have their own local answers and do not save student work.

## 6. Try simulated billing

Open **Billing (simulated)** and select **Demo: Try simulated checkout**. Start checkout and use the simulator's success action. Inspect the resulting purchase and class coverage.

No payment provider is contacted. Coverage comes from the same purchase/event/entitlement workflow used by the simulator, rather than a frontend flag. If desired, author an assignment for this class using the existing published problem and publish it after coverage is active.

## 7. Reset and inspect the restored state

Return to the demo controls and choose **Reset demo and discard changes**. Choose either role again.

The student submission is gone, the example assignment is available to complete again, and the checkout class is unpaid. The funded class retains its seeded starting coverage. Reset replaces the workspace's owned data and credential while retaining its original maximum lifetime.

**End demo** logs out of the demo; it does not immediately delete the workspace or affect a normal account session. Expiration blocks access, and operator cleanup later reclaims expired data. Default idle expiry is 30 minutes and maximum lifetime is four hours.

## Code to explore next

| Question                                                       | Starting point                                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| How are routes and role rules shared with navigation?          | [Route definitions](../../apps/web/src/routing/route-definitions.ts)                                       |
| How is the synthetic graph created through normal workflows?   | [Demo seed](../../services/api/src/persistence/demo/seed.ts)                                               |
| How are demo resources fenced against reset?                   | [Demo access](../../services/api/src/persistence/demo/access.ts)                                           |
| How does the API stay separate from provider/database details? | [Architecture overview](../architecture/overview.md)                                                       |
| How are jobs configured and invoked?                           | [Job registry](../../services/api/src/application/jobs/registry.ts) and [operator guide](operator-jobs.md) |

Operational limits and cleanup commands are in [local demo setup](public-demo.md). Normal Cognito signup/login remains a separate flow at `/account`.

## Inspect point weighting

Open the mixed graded assignment as instructor: its three problems carry 20, 5 and 5 points. Published allocations are locked. Choose **Duplicate as draft**, change **Points for problem 1**, and save. Verify the total updates and the saved value survives reload. Reordering carries each problem's allocation; repeated copies can have different weights. Completion-only and practice hide point controls.

For a submitted graded example, inspect instructor final submissions and select a student: the retained total, percentage and each problem's points appear separately from correctness counts. As student, the introductory assignment shows points immediately after finalization; the mixed example withholds both correctness and earned points until **Release grades**. **Reveal answers** alone does not release its grade. Reset restores template 7's starting weights and clears submissions.

## Seeded proofs in all three formats

1. As student, open **Practice proofs in three formats**. Each problem proves `P -> P`; its format is pinned by the instructor. Editing never checks automatically. Use **Check proof** explicitly, **Save problem** to persist and **Show assigned solution** for the separate reference.
2. For the dependency problem, start the proof, add an assumption line `P`, and leave its self-dependency selected. Add an inference `P -> P`, choose **Conditional proof**, and select line 1 as both the discharge assumption and conclusion. Leave the final dependency set empty. Check, save and reload.
3. Compare the Fitch problem: open a subproof with assumption `P`, set its endpoint to that assumption, then use **Conditional proof** at root citing the closed subproof. Save each occurrence separately.
4. For the tree problem, start the proof and choose **Conditional proof** for conclusion node 1. Open its three-dot menu → **New branch assumption for node 1**. Enter `P` for node 2 and **Branch assumption formula**, select **Discharge node 2**, then **Add node**. The confirmed branch appears above the conclusion. Check explicitly, save and inspect the separately revealed reference.
5. Open **Derivations: separate grade and answer release** to try graded submission (60 points total). Pre-submission checks are unavailable. Switch to instructor to review finals, adjust a flagged proof's points/comments and independently choose **Release grades** and **Reveal answers**.
6. Open **Complete Fitch, dependency and tree proofs** for completion-only work. Finished attempts may contain logical mistakes; final diagnostics flag those mistakes without a score. Instructor reference reveal remains separate.

## Optional: author and assign a Fitch derivation

The demo includes seeded proofs. You can also author a separate disposable example to explore practice, completion-only and graded proofs. Allow extra time for these steps:

1. As the instructor, open **Problem library**, select **New problem**, enter a title and choose **Derivation**, then **Fitch** under **Proof format**. Leave premises empty and enter `P -> P` as the conclusion.
2. Open **Permitted rules (0 selected)**, enable **Implication introduction**, keep its label or enter your preferred label, and select **Done**. No other rule needs permission for this example.
3. Select **Continue to reference proof**, then **Open subproof**. Enter `P` in **Formula for line 1**, then **Add line**. Open line 1's three-dot menu (**Actions for line 1**) and choose **Close subproof at line 1**. This records its endpoint and returns **New line scope** to **Root proof**.
4. Enter `P -> P` in the next row (**Formula for line 2**). Choose the enabled implication-introduction label under **Rule for line 2**, select the first subproof under **Line 2 subproof 1**, and select **Add line**. Confirming a line neither checks nor saves it.
5. Select **Check current proof** and expect acceptance. Select **Save draft**, then **1. Problem details**. Select **Check saved reference** and expect server acceptance, then **Publish saved draft** to create version 1. Publication opens the immutable problem view; editing remains explicit.
6. Select **Edit draft**, change the conclusion to `Q`, return to **2. Reference proof**, and check: the retained proof now requires correction. Save, return to details and try publication; it must be rejected. Version 1 still has its original target, rules, labels and private reference in history. Restore `P -> P` on the details step and save to keep the example valid.
7. Open **Assignments**, choose **Demo: Introduction to Logic**, start a new assignment and select **Ungraded practice**. Under **Add published problems**, choose the proof and **Add version 1**. Set **Answer reveal** to **Anytime**, save and publish. Graded and completion-only proofs use submission-time feedback; grade release and reference reveal remain independent.
8. Use the demo controls to switch to student, open **Assigned work**, select the class and assignment, then **Start proof**. Recreate the confirmed subproof/reference steps from above. An unconfirmed row disables checking/saving until **Add line** or **Discard entry**; it is protected on navigation. Use **Check proof** explicitly, save with **Save problem**, reload and confirm the saved proof remains. **Show assigned solution** reveals the instructor reference separately. Practice has no final-submission control.
9. Switch to instructor and duplicate the assignment as a draft. Give the copy a distinct title, choose **Completion only** and **When I reveal answers**, then save and publish. Completion proof feedback is at submission, not immediate/manual checking.
10. As student, open the completion copy. Start the proof. Enter a finished but incorrect attempt: use `Q` for the assumption and confirm it with **Add line**. Use its three-dot menu to close the block on the assumption line, then enter root `P -> P` with implication introduction citing that block and confirm **Add line**. This fills required fields and reaches the target, but the inference is wrong. There must be no **Check proof** or pre-submission diagnostics. Save, confirm final submission and submit.
11. Expect score-free completion and post-submission proof diagnostics. Return as instructor, open the assignment and its final submission. Expect **Completed — errors found**, the frozen proof/report and no point score. Reference answers stay hidden from the student until you separately confirm **Reveal answers**. Switching back and refreshing answer access must not change completion or the retained diagnostics.
12. Reset discards these owner-authored examples and student work, restoring seed template 7 while retaining the original workspace deadline, including the seeded Fitch/dependency/tree proof journeys.

This demonstrates checked authoring, explicit practice feedback, finished-versus-verified completion and independent reference reveal. See [student-work verification](../verification/derivation-student-work-verification.md) for evidence and limits; dependency and natural-deduction tree proofs are also available. For graded instructor review, continue below.

## Optional: grade a Fitch submission

Use a published Fitch problem from the preceding section. You can author a new proof or use the Fitch version in the seeded proof assignments.

1. As instructor, open **Assignments**, choose the funded demo class, and create a graded assignment. Add the proof version twice, set the first occurrence to 20 points and the second to 10, select **When I release grades** and **When I reveal answers**, save and publish.
2. Switch to student and open the new assignment. Start each proof; leave the first incomplete/incorrect and finish the second correctly. Save each problem. There is no **Check proof** for graded work. Confirm final submission. Expect an awaiting-release receipt with no reports, points or instructor comments.
3. Return as instructor, open the published assignment and select the final submission. The accepted proof has its automatic points; the other needs review, keeping the assignment total unresolved. Inspect the original report under **Submitted problem**.
4. In **Instructor grading**, uncheck **Use automatic award** for the flagged occurrence, enter 12.25 and a comment, then **Save instructor grading**. Expect 22.25/30 points. Load grading history to inspect the saved change/reviewer/time. Changing the viewed problem retains grading edits; changing submissions or navigating away protects unsaved edits.
5. Confirm **Release grades** while leaving answers hidden. Switch to student, reopen/refresh results, and expect the points/comment and original diagnostics. The instructor reference is still unavailable.
6. Return as instructor and change the award to zero, then save: zero is a resolved grade, not pending. Check **Use automatic award** and save to reopen the unverified occurrence; the overall total returns to pending. Set an explicit award again and save. Corrections follow the existing release policy on the next student refresh.
7. Confirm **Reveal answers** separately. Switch to student and refresh answer access, then **Show assigned solution**. The reference/explanation appears without replacing submitted work or original diagnostics.
8. If a save conflicts or its outcome is uncertain, retain/copy the edits as needed and choose **Reload current grading**. Stay preserves the draft; Discard rereads current grading. Inspect history before reapplying a change because a disconnected write may have committed.
9. Reset the demo to discard these examples and their retained grading history. End the demo when finished.

See [grading/review verification](../verification/derivation-grading-review-verification.md) for the focused automated/browser evidence and limits.

## Optional: author a natural-deduction tree

Template 7 includes a seeded tree. This optional walkthrough creates a separate instructor-authored example.

1. As demo instructor, open **Problem library**, create a titled **Derivation**, choose **Natural-deduction tree**, leave premises empty and enter conclusion `P -> P`.
2. Open **Permitted rules**, enable **Implication introduction**, choose its teaching label and select **Done**. Select **Continue to reference proof**: node 1 is an unverified conclusion root, copied from the target once. Statement premises, if any, remain available sources rather than automatically inserted leaves.
3. Choose that rule for node 1. Open its three-dot menu → **New branch assumption for node 1**. Enter `P` in node 2 and **Branch assumption formula**, check **Discharge node 2**, then select **Add node**. The drawing places `[P]` above `P → P`. Until confirmation, check/save/step changes are blocked; **Discard entry** leaves the confirmed tree unchanged.
4. Select **Check current proof**, then **Save draft**. The reference step remains selected after saving. Return to **1. Problem details** for **Check saved reference** and **Publish saved draft**. Expect acceptance at each check. Published selection shows the immutable problem first; **Edit draft** is explicit. Changing the conclusion or used statement sources retains the tree and may show a mismatch warning on the reference step. **Keep reference** preserves all work; confirmed **Restart reference** replaces it with a fresh unverified root. Rule changes require a fresh check; publication always checks the saved version independently.
5. Open **Assignments**, select the funded class and add the published tree. Choose ungraded practice for explicit checks, or graded/completion-only with submission-time feedback. Save and publish. Grade release and answer reveal are independently configurable.
6. Switch to student and open the assignment. Its format is fixed. Start the proof, add the assumption and discharge as above, then **Save problem**. In practice, **Check proof** checks without saving. Changing problems preserves local work; leaving/reloading protects unsaved edits.
7. For graded work, incomplete/incorrect proofs may be submitted and require instructor review; accepted proofs receive full points. For completion-only, fill the tree and matching root before submitting; logical mistakes produce retained verification flags without a score. Graded diagnostics wait for grade release; completion diagnostics appear after submission.
8. As instructor, review the final proof read-only. Grade/comment adjustments preserve original evidence. Reveal the reference independently from graded reports/points. See the preceding grading walkthrough for review and release controls.
9. End/reset the demo when finished. Reset removes these authored examples and restores template 7; including the prebuilt tree examples.

## Independent proof practice (no account)

1. Open **Practice**, then **Try derivation practice**, or go directly to `/practice/proofs`. Choose a format before beginning. This activity is separate from saved classroom/demo assignments.
2. Add premise `P`, enter conclusion `P`, inspect the permitted rules and select **Begin proof practice**. Rules default to the supported catalog, including classical rules; a reference solution is not required.
3. The proof opens directly. In Fitch/dependency the premise is copied into a line. For a tree, add a premise node, select/copy the statement premise, select that node as the conclusion root and delete the unused initial inference node with confirmation.
4. Select **Check proof** and expect verification. Change the entered formula to `Q`: the old report disappears. Check again and expect an error. Entries are never checked automatically.
5. Choose another format. **Stay** or Escape preserves the setup, proof and report. Repeat and choose **Discard changes**: expect an empty setup in the selected format, no premises/target/proof/feedback, and all default rules restored. **Start over** performs the same confirmed reset without changing format.
6. Leaving or reloading entered work requests discard/unload protection where the browser supports it. Reload/remount clears page memory; no database save, browser-storage backup or official grade is created. A failed check does not search for a solution or prove that the selected goal is impossible.
