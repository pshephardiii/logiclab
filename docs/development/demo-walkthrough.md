# Reviewer walkthrough

This is a short tour of the implemented instructor/student experience. It uses isolated synthetic data and simulated payments. No signup, email, card details, or real charge is required. A hosted URL is not available yet; use [local demo setup](public-demo.md) and open `http://localhost:5173/demo`.

Allow roughly five to ten minutes. Labels below match the current demo template; this is a walkthrough, not a claim that hosted deployment has been verified.

## 1. Inspect the instructor's starting state

Choose **Explore as instructor**. Under **Classes**, find:

- **Demo: Introduction to Logic** — funded, with an enrolled student and three published assignments.
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

New visitors receive template 4. If your current workspace predates it, explicitly reset to get the updated practice example; role switching alone preserves existing data.

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

For a submitted graded example, inspect instructor final submissions and select a student: the retained total, percentage and each problem's points appear separately from correctness counts. As student, the introductory assignment shows points immediately after finalization; the mixed example withholds both correctness and earned points until **Release grades**. **Reveal answers** alone does not release its grade. Reset restores template 5's starting weights and clears submissions.

## Optional: author a private Fitch derivation

Derivations are instructor-library content at this milestone, with no seeded example or student assignment availability. Allow extra time for this authoring check:

1. As the instructor, open **Problem library**, select **New problem**, enter a title and choose **Derivation (Fitch)**. Leave premises empty and enter `P -> P` as the conclusion.
2. Enable **Allow Implication introduction**. Keep its label or choose a suggested/custom label; no other rule needs permission for this example.
3. Select **Start reference proof**, then **Open subproof**. Enter `P` in **Formula for line 1**. Set **Final line of Subproof 1 at line 1** to `1. P`.
4. Set **New line scope** to **Root proof**, select **Add inference line**, and enter `P -> P` on line 2. Choose the enabled implication-introduction label under **Rule for line 2**, and select the first subproof under **Line 2 subproof 1**.
5. Select **Check current proof** and expect acceptance. This checks unsaved local work. Select **Save draft**, then **Check saved reference** and expect acceptance from the server. Select **Publish saved draft** to create version 1.
6. Change the conclusion to `Q`. The reference remains unchanged, and checking now requires correction. Save this draft and try publication; it must be rejected. Version 1 still shows its original target, rules, labels and private reference in history. Restore `P -> P` and save to keep the example valid.
7. Inspect the assignment picker: derivation versions remain unavailable. Resetting the demo discards this example and restores the existing seeded content.

This demonstrates instructor terminology, explicit rule permissions, stable proof references and authoritative checked publication. See [authoring verification](../verification/derivation-authoring-verification.md) for focused browser evidence and the remaining student/review work.
