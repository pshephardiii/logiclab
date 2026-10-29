# Conceptual questions: focused demo verification

Date: October 29, 2026. Branch `017-feat-conceptual-questions`, demo/template slice. This records focused implementation evidence; final branch verification and PR notes remain pending.

## Automated checks

- `npm run check`: type checks, 926 tests (104 engine, 595 API, 227 web) and production builds passed.
- All 53 API PostgreSQL integration checks passed. Template-4 coverage verifies seeded mixed practice, transient checks without attempt creation, pinned solution keys/explanations, withheld mixed grades, independent release and finalization retries. Existing reset/cleanup/failed-reset workflows passed with the expanded graph.
- Older-workspace simulation retains edited content, final work and template metadata on authentication. Explicit reset restores the new graph while retaining the original absolute deadline and invalidating old credentials.
- Formatting and whitespace checks passed. The database-package suite was not repeated for this demo-content slice; no schema migration was added.

## Real-API Chrome walkthrough

Headless Chrome 156.0.8078.48 used temporary Vite/API processes and an isolated schema in the disposable local test database. All API responses were real local responses, without interception. Synthetic identities and simulator billing made no Cognito/email or real payment calls. The temporary servers/schema were removed after the run; the user's running app and QA data were not used.

The walkthrough verified:

1. A new workspace has three library problems and three published assignments, with the original graded truth-table example retained.
2. Instructor UI multiple-choice creation, correct-option reordering, isolated draft preview with optional answer/explanation reveal, explicit save and immutable publication.
3. Mixed private-practice automatic checking after a pause, manual checking, status-only responses and no attempt until explicit save. Saved false survives a full refresh after reselecting the class/assignment.
4. Solution/explanation show/hide without replacing selected answers, dirty choice retention across Stay, and a 390px question view without horizontal document overflow.
5. Mixed graded table/choice entry, explicit per-problem saves, final confirmation and submission. Pending-grade read responses contain no result, key or explanation.
6. Answer reveal before grade release, followed by grade release and visibility of the original frozen `mixed_v1` result. Instructor final review shows the frozen conceptual selection/status read-only.
7. Mixed completion-only gating and `mixed_completion_v1` finalization with filled incorrect entries, no correctness data and post-submission solutions. Assignment setup used API fixture calls; answer entry, saves and finalization used the browser.
8. Reset restores template 4, removes authored content/work and leaves browser local/session storage empty. No uncaught page errors occurred.

An initial harness attempt did not reselect the assignment after a full page refresh and timed out; the corrected navigation passed. An initial full-page screenshot captured poorly while scrolling; the replacement below is a stable element capture inspected visually. Neither is recorded as a product failure.

![Multiple-choice question in the 390px student demo view, with a selected answer and Clear answer control.](images/conceptual-practice-mobile.png)

Local scripts/logs/screenshots are ignored evidence under `.codex-local/verification/conceptual/`, not a browser CI suite. This is not exhaustive QA, a screen-reader/keyboard/browser matrix, load/soak verification, a clean-install check, hosted deployment or live Cognito verification. The original signup email-timing issue is outside this slice. Existing Jest VM-module advisories remain. Older applications cannot read new conceptual definitions or mixed results; coordinate rollback rather than rewriting published snapshots.
