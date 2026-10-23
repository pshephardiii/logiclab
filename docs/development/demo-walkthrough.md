# Reviewer walkthrough

This is a short tour of the implemented instructor/student experience. It uses isolated synthetic data and simulated payments. No signup, email, card details, or real charge is required. A hosted URL is not available yet; use [local demo setup](public-demo.md) and open `http://localhost:5173/demo`.

Allow roughly five to ten minutes. Labels below match the current demo template; this is a walkthrough, not a claim that hosted deployment has been verified.

## 1. Inspect the instructor's starting state

Choose **Explore as instructor**. Under **Classes**, find:

- **Demo: Introduction to Logic** — funded, with an enrolled student and a published assignment.
- **Demo: Try simulated checkout** — initially unpaid.

Open **Problem library** to inspect **Implication and disjunction**. It has an editable draft and an immutable published version. Its formula is `(P -> Q) & (!P | Q)`. Open **Assignments**, select the funded class, and inspect **Your first truth-table assignment**. The assignment pins a published version rather than following future draft edits.

This demonstrates reusable content, versioning, and class-scoped publication.

## 2. Complete the same assignment as a student

Use **Switch role, reset, or end demo**, then **Explore as student**. This changes role within the same workspace.

Open **Assigned work**, select the funded class and example assignment. Enter some T/F answers and use **Save problem**. Reload saved work to confirm persistence. Leave an incorrect answer or a blank to make the submission feedback visible.

Follow the final-submission confirmation. Submission freezes the saved answers and produces feedback; the seeded assignment permits solutions after submission. Final work is read-only. This flow differs from anonymous practice, where visitors can check freely without creating an official submission.

## 3. Try immediate feedback without submitting

As the student, select **Explore truth tables at your own pace** in the funded class. In the first row, enter **F** for the final answer: with P and Q both T, the formula evaluates to T. Pause for about 1.2 seconds and look for **Incorrect**. Change the answer to **T** and pause again; the old feedback clears while the new check runs. Blank cells have no Unanswered marker.

Try several quick edits: checking waits until you pause. **Check answers** runs immediately. Neither action saves or submits; use **Save problem** to persist entries, then reload to confirm. Solutions are available anytime through the separate button, and practice has no final submission. Switch between the graded and practice assignments to compare their feedback rules.

New visitors receive template 3. If your current workspace predates it, explicitly reset to get the updated practice example; role switching alone preserves existing data.

## 4. Review the submission as the instructor

Return to the demo controls and choose instructor. Under **Assignments**, select the funded class and example assignment, then review its submitted work.

The instructor sees the work just submitted by the synthetic student. This demonstrates that role switching preserves one shared classroom journey, while separate visitors receive independent data.

## 5. Try simulated billing

Open **Billing (simulated)** and select **Demo: Try simulated checkout**. Start checkout and use the simulator's success action. Inspect the resulting purchase and class coverage.

No payment provider is contacted. Coverage comes from the same purchase/event/entitlement workflow used by the simulator, rather than a frontend flag. If desired, author an assignment for this class using the existing published problem and publish it after coverage is active.

## 6. Reset and inspect the restored state

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
