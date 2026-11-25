# Practice samples and step-through worked examples

Current branch: `038-feat-practice-sample-problems`, following `037-feat-practice-only-exposure` and before the initial hosted practice sandbox. Implementation proceeds in the slices below; no deployment is authorized.

## Purpose

Give visitors with no formal-logic background, including recruiters, an immediate way to see what LogicLab does. They should be able to load a small usable problem, inspect its solution one meaningful step at a time or jump to the completed example without inventing formulas or knowing how to construct a proof/tree first. Sample loading, completed examples and the step-through layer belong to this single feature branch; videos are deferred.

This is part of anonymous independent practice and must work in both full local mode and the practice-only hosted mode. It does not depend on accounts, demo workspaces, instructor content or a database.

## Coverage

| Practice experience           | Load action                                                                            | Completed example                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Truth table                   | Populate a short formula and create its initial table using the existing practice API. | Reuse the existing solution display, with clear sample-oriented wording where needed. |
| Fitch derivation              | Load premises, conclusion, rule permissions and the initial proof workspace.           | Display a verified completed Fitch proof using the existing read-only proof view.     |
| Dependency derivation         | Load the corresponding format's statement, permissions and initial workspace.          | Display a verified proof with dependencies and any discharge visible.                 |
| Truth tree / semantic tableau | Load premises, conclusion and initial roots, including the negated conclusion.         | Display a verified completed tree and its correct Valid/Invalid verdict.              |

Provide at least one curated sample for each available experience. Fitch/dependency may use the same small argument so visitors can compare formats. Prefer short formulas, few variables and a handful of steps, with notation/grouping that matches the current policy. Choose exact examples during the first implementation slice. A second small invalid-argument tree would help demonstrate an open counterexample; include it if it keeps the feature compact rather than requiring a sample browser or catalog UI.

Natural-deduction trees remain unavailable. Instructor-authored conceptual questions have no anonymous-practice page and are outside this branch's scope.

## Interaction

Use a prominent, clearly labeled **Load sample problem** action near setup. Recommended flow: one click opens the initialized practice workspace, without automatically revealing the solution. Once the sample is active, make **Walk through the solution** and **View completed example** easy to find, using type-specific wording where clearer. Visitors can inspect the finished result immediately or build up to it.

Keep the completed proof/tree in a clearly labeled read-only example area, separate from the visitor's editable attempt. Opening/hiding it must not overwrite entered work, fill the visitor's verdict, fabricate checking feedback or mark their attempt verified. The completed truth tree explicitly states the correct argument verdict. Visitors can continue trying the sample and use the ordinary Check action on their own work.

Loading/reloading a sample follows the ordinary reset and unsaved-work protections: replacing entered setup or work requires the existing discard confirmation. A visitor who stays retains their work and any pending entry. Repeated loading starts fresh sample state rather than retaining earlier feedback, answers or pending editor fields. Keep cancellation and late-response guards for table-generation requests.

Bind each worked example to its exact sample statement, proof format, permitted rules and policy/catalog. Edits to those inputs must stop presenting the reference as a solution to the changed problem; the UI can offer to reload the original sample. Editing only the visitor's attempted proof/tree keeps its matching sample reference available. Format switching uses the existing reset/confirmation behavior and loads the appropriate format-specific example only through an explicit sample action.

## Step-through layer

Use a handful of hardcoded demonstration stages alongside each curated sample, rendered with the existing visual components. The walkthrough is a separate read-only view of the example; it does not drive the live editor or replay simulated clicks against application controls.

- Provide **Back**, **Next step**, **Restart example** and an immediate **View completed example** action. Show the current step and total. Restart affects only the walkthrough position, never the visitor's attempted solution.
- Begin by identifying the statement and initial workspace, then reveal one meaningful change per click. Fitch stages can open an assumption, add an inference or close/discharge a subproof. Dependency stages can show the next line and how its dependencies carry through or discharge. Tree stages add an entire expansion/split or close a path, with the final stage explaining the correct argument verdict.
- For truth tables, demonstrate representative rows/columns or reveal a column at a time; avoid requiring a click for every cell. The completed table remains directly accessible.
- Give each stage one short explanation and, where useful, visually emphasize what changed. Use brief transitions with reduced-motion support, keyboard-operable controls and accessible step announcements. Navigation remains user-controlled, with no timed autoplay requirement.
- Intermediate stages are deliberately unfinished examples, not failed student work or verified complete solutions. Do not produce grading/checking feedback for the visitor merely by advancing the walkthrough.

## Brief explanation text

Use light contextual explanations. The step-through approach is agreed; exact examples and wording remain to be reviewed during implementation.

- A brief introduction identifies premises as what is assumed and the conclusion as what the argument aims to establish. Familiar-language meanings for variables can make the selected example easier to understand.
- Beside the completed example, add two or three short sentences describing its main move. For Fitch/dependency, explain the relevant assumption/discharge when used. For truth trees, explain why all paths closing establishes validity, or why a fully decomposed open path supplies a counterexample.
- Keep detailed explanation out of the ordinary editor controls. Reuse existing visual premise/conclusion, rule-help and validity labels instead of repeating a textbook account throughout the page.

## Data and correctness

Hardcoded, repository-owned sample statements and completed examples are appropriate. These are intentionally public teaching content. They require no proof search, runtime AI generation, instructor reference access or database seeding.

Store curated stages with their sample, using explicit structurally consistent states or a small sample-specific sequence. A tree split reveals both child branches as one stage; Fitch stages must not retain endpoints/citations to lines that have not appeared yet. Avoid blindly truncating a completed structure or building a general tutorial/playback framework.

Pin the existing supported catalog/grouping versions and applicable rule permissions. Clone sample structures when loading them so editing cannot mutate the reusable fixture; keep all line/branch/assumption/citation identities consistent. Use normal initialization/reset paths and existing read-only renderers rather than constructing a separate editor or checker.

Validate every stage against the applicable shape/structure rules, allowing intentional incompleteness. Test forward/back/restart ordering and ensure the final stage matches the verified completed example. Verify completed examples with the real engine in tests. Each proof must be accepted under its exact statement/rules. Each tree must be verified with the expected argument outcome and matching displayed verdict; an invalid sample must include a fully decomposed open counterexample. Table expected values/IDs come from the existing engine/API workflow and must remain consistent. No new account/demo/backend resource routes should be needed; any use of the existing stateless table endpoints must remain compatible with the practice-only allowlist.

## Suggested implementation slices

1. Curate sample statements, completed answers, demonstration stages, short text and pinned versions; add real-checker validation, stage consistency and immutable-fixture coverage.
2. Add explicit load actions across table, Fitch/dependency and tree practice, preserving existing reset, pending-entry and request-cancellation behavior.
3. Add separate completed proof/tree displays, visible tree verdicts and reference-to-statement matching. Reuse table solution controls.
4. Add the curated step-through layer with Back/Next/Restart, step captions, change emphasis and reduced-motion support. Keep walkthrough navigation separate from the visitor's attempt.
5. Perform focused full/practice-only desktop/mobile journeys, including load/reload, Stay/Discard, statement edits, format changes, example visibility, step navigation, final-stage agreement and explicit checking; finalize documentation and PR notes.

## Acceptance and release boundary

A first-time visitor should reach a representative problem and its worked example using clearly labeled actions, without typing formulas, using an account or understanding the rule catalog first. Their own work must remain intact when opening the example, advancing/backtracking or restarting the walkthrough. A visitor can follow the visual development one step at a time or jump directly to completion. All completed examples must agree with the real checker and the displayed problem.

After this feature, perform its focused visual QA and proceed to reviewed inexpensive sandbox preparation and deliberate deployment promotion. Wider demo/account UI audits stay deferred before public exposure of those areas. A separate portfolio repository follows the practice sandbox. Video production remains deferred. No infrastructure or deployment is authorized by this plan.

## Slice 1 — curated content foundation

Public factories under `apps/web/src/features/practice/samples/` provide fresh data for each load and independent walkthrough snapshots. They pin catalog 2 and grouping policy 1 where applicable. No UI actions, account/demo dependencies, persistence or walkthrough navigation are added in this slice.

| Experience         | Sample                             | Walkthrough                                                                                                           |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Truth table        | `(P ∧ Q) → P`                      | Given truth combinations, conjunction column, final conditional column.                                               |
| Fitch              | From `P → Q`, derive `P → (P ∧ Q)` | Given premise, assume P, infer Q, combine P/Q, close the subproof, discharge it.                                      |
| Dependency         | Same statement as Fitch            | Track premise/assumption dependencies through each line; discharge the temporary assumption on the final conditional. |
| Valid truth tree   | `P → Q`, `P`; conclusion Q         | Start with the negated conclusion, split the conditional, close each contradictory path.                              |
| Invalid truth tree | `P → Q`; conclusion Q              | Split the conditional, close the Q/¬Q path, identify the fully decomposed open path with P=false and Q=false.         |

The rain/wet-ground interpretation connects the proof/tree captions to familiar language. The truth table uses rain/cold for its conjunction. Only the three inference rules needed by the proof examples are enabled. Stable public identities preserve citations across stages; sample factories and cloned stage snapshots prevent edits from mutating reusable examples. The table uses the existing engine's IDs and expected values rather than a separate answer algorithm.

Ten focused tests use real contracts, structure analyzers and checkers to verify accepted final proofs, both argument verdicts, the counterexample's actual truth values, local validity at each intermediate stage, the intentionally open Fitch block, exact table values/reveal order, final-stage agreement and independent reloads/snapshots. All web tests and a production web build also passed. No browser or PostgreSQL run is needed for this unconnected data foundation. Next: explicit sample-load actions with ordinary pending-entry, reset, cancellation and discard behavior.

## Slice 2 — sample loading

“Load sample problem” is available in truth-table setup, both proof formats and truth-tree practice, including active workspaces. The selected proof format determines its sample. One click from untouched setup creates an unanswered workspace: only the given premises and conclusion are supplied for proofs, and the tree begins with its premises and negated conclusion. No proof lines, expansions, verdict, checking feedback or solution are filled automatically. The default tree button loads the valid-argument sample; the second curated invalid example remains available as foundation data for later example UI.

Loading/reloading over setup or work requires Stay/Discard confirmation. Proof/tree pages use their existing owner-scoped confirmation and remount the editor on replacement, clearing pending line/conclusion/expansion controls as well as feedback. Stay preserves those controls. At narrow widths the proof-format selector occupies its own toolbar row so the load/restart buttons do not overlap it. Truth-table work already survives routing, so its sample action reuses the native discard dialog locally rather than adding a navigation blocker. An untouched default formula loads directly; entered formulas, existing tables or pending generation require confirmation.

Table loading passes the exact sample formula to the existing abortable creation operation, avoiding a stale-state request after replacing the input. Old requests are aborted; late checking responses cannot restore feedback. Answers/solution/error state resets on replacement. A failed request retains the sample formula and supports ordinary Create table retry. Sample controls do not write browser storage or contact account/demo resources.

Validation: all 845 web tests and production builds for the current local configuration and explicit practice-only exposure passed, including type checking. Coverage includes initial unanswered work and exact permitted rules, pending setup/line/conclusion/tree controls, Stay/Discard, table API loading, request cancellation, late feedback, failure/retry and repeated reloads. Focused Chrome with a temporary real practice API verified table loading/reloading, Fitch/dependency/tree initialization, pending-work consent, dependency/tree containment at 390px, no automatic check/solution/verdict, no private requests and no uncaught errors. An initial smoke setup used a full artifact against the restricted API and was blocked by the existing mismatch guard; the matching practice build passed. Temporary browser/servers were cleaned up. Screenshots and the local script are ignored evidence in `.codex-local/verification/practice-samples/`; they are not browser CI. Formatting and whitespace passed. No API/database behavior changed or PostgreSQL suite was rerun.

Completed examples and Back/Next/Restart controls are still pending. Next slice: separate completed displays, explicit sample-tree verdicts, and matching examples to the unchanged sample statement/rules without overwriting the visitor's attempt.

## Slice 3 — completed examples and statement matching

Loaded Fitch/dependency samples now offer “View completed example” in a separate read-only panel using the existing proof displays. The panel identifies the sample, explains its main move and leaves the editable attempt, pending line input, checking feedback and dirty state alone. Opening focuses the example heading; the action reports expanded state and can hide the example without changing work. Reloading a sample closes its old example.

The reference is bound to the sample's exact type, format, checker/catalog/grouping versions, ordered premise identities/text, conclusion and enabled rule IDs/labels. Committed premise/conclusion edits remove the old reference action and offer a reload explanation. Editing the conclusion temporarily hides the reference while that editor is open. Changes only to attempted derivation lines do not invalidate the matching example. These are conservative source comparisons, not a new formula-equivalence or proof-search mechanism.

Truth trees offer the default sample and a compact “Load invalid-argument sample” alternative, with ordinary Stay/Discard protection between them. Each has a separate read-only completed tree and an explicit public sample verdict. The invalid example explains the completed open counterexample with P=false and Q=false. Viewing either reference does not set or correct the visitor's radio choice, add expansions to their tree, or run checking. The display has a distinct accessible name so the editable and example trees can be distinguished.

For tables, explicit sample loading marks the sample in the retained practice state. The normal solution action reads “View completed example”/“Hide completed example” and uses the existing solution API and expected-value display beside the visitor's unchanged dropdown answers. Editing the formula clears the sample marker; manually creating the same text is ordinary practice. Existing manual solution controls remain available for custom formulas.

Validation: all 857 web tests, type checking and a practice-only production build passed. Tests cover source/policy/rule matching, read-only views, pending entries, focus/expanded controls, preserved choices and answers, changed premises/conclusions, reload/switch consent and fresh closed examples. React attempt/example keys are distinct, preventing sibling state reuse during replacement. Focused Chrome against a temporary real practice API verified table solution disclosure with preserved answers, both completed proof formats with pending work, target-change invalidation, valid/invalid tree verdicts separate from visitor choices, mobile tree-example containment at 390px, and no private requests, automatic feedback, uncaught errors or console errors. The local script waits for React's edit-state update before checking removal. Temporary browser/servers were cleaned up; ignored logs/screenshots are under `.codex-local/verification/practice-samples/`. Formatting and whitespace passed. No backend/database behavior changed or PostgreSQL run was repeated.

Next: the curated Back/Next/Restart walkthrough layer. Completed examples are available directly now; step controls and stage change emphasis are still pending.

## Slice 4 — curated walkthrough controls

Each loaded sample now offers “Walk through the solution”. A shared read-only example view provides Back, Next step and Restart example, with bounded navigation, a step counter/caption announced through a polite live region and keyboard-operable buttons. Opening focuses the example heading. Opening a walkthrough also scrolls it into view smoothly, using instant movement when reduced motion is preferred; Back/Next/Restart does not request scrolling or move control focus. Proof/tree visitors can still jump directly to the completed example. Table visitors retain the existing direct solution action alongside their editable table.

The walkthrough renders the curated snapshots rather than replaying actions into the editor. Fitch/dependency views highlight the latest example line; tree views reveal each complete split/closure and show the sample verdict only at the final stage. Table views reuse the existing table renderer in explicit read-only mode, reveal one answer column at a time and distinguish the newly revealed column. Unrevealed cells are dashes with an accessible “Not revealed” label. No walkthrough step fills visitor answers, applies lines/expansions, changes their verdict or creates checking feedback.

Back/restart affects only walkthrough position. A brief stage outline transition is disabled under reduced-motion preferences. Statement/rule matching and pending-conclusion guards from slice 3 remain in force. Reloading closes and resets the old walkthrough, including same-formula table reloads that finish within one render batch; table sample generations make that reset explicit. Separate snapshots remain private to the read-only view, and direct completed views agree with the final curated stage.

Validation: all 863 web tests and a practice-only production build passed, including type checking. New coverage checks keyboard opening, step bounds/captions, Back/Next/Restart/direct completion, proof-stage row progression, table-column reveal, final-only tree verdicts, preserved pending entries/answers/choices and reload resets. Focused Chrome with a temporary real practice API repeated keyboard/table navigation, both proof formats, valid/invalid tree walkthroughs, direct completion, Back/Restart, 390px tree containment, reduced-motion computed styles and absence of automatic checking/private requests or page/console errors. Only an explicit table solution action requested solution data. Temporary browser/servers were cleaned up. Formatting and whitespace passed; ignored logs/screenshots use `walkthrough-` names under `.codex-local/verification/practice-samples/`. No backend/database change or PostgreSQL rerun.

The planned sample interactions are implemented. Next: a brief user-facing practice review and focused final feature verification/documentation, then the agreed sandbox preparation. This slice does not deploy, publish a PR or create another branch.

Opening-scroll follow-up: 28 focused walkthrough/sample tests, the practice-only web build and local Chrome checks passed. Browser checks confirmed visible/focused walkthrough headings across the practice pages with normal/reduced motion and no new scroll calls during Back/Next/Restart. Existing completed-view focus behavior is retained. Temporary browser/servers were cleaned up; no full-suite or PostgreSQL rerun was needed for this shared presentation change.

Discovery-button refinement: Load sample and unopened completed-example actions use filled deep teal buttons with bold labels and a subtle shadow. Walkthrough/alternate-sample actions use pale teal; Hide and ordinary Check controls retain their existing hierarchy. The preceding 28 focused behavior tests passed. The palette-only follow-up passed the practice-only build, formatting, contrast calculations and local Chrome checks without repeating behavior tests. Filled-button text contrast is at least 7.5:1; companion normal/hover text pairs exceed 6:1. Chrome also confirmed 44px targets, mobile containment and no page errors. This is a focused visual check rather than an accessibility audit. Local settings were unchanged.

Discovery-callout refinement: static, named guidance panels now invite first-time visitors to “Try a sample problem” and “Walk through a solution, step by step”. They use a short description, teal accent border and prominent filled actions without urgent-alert semantics. Solution invitations now precede the working table/proof/tree; sample-table creation scrolls to that invitation, while ordinary custom-table creation retains its table reveal. Existing loading, disclosure, confirmation and walkthrough state behavior is unchanged. The 78 focused tests and practice-only build passed. Local Chrome verified named callouts and their order across all practice pages, sample-table reveal, desktop/mobile containment and no page errors. Screenshots/logs use `invitation-` names in the existing ignored evidence directory. No environment settings changed.

Sample-exit refinement: every loaded sample has a “Create your own problem” action in its discovery area, including table loading/error states and proofs whose edited statements no longer match the reference. Open completed examples and walkthroughs also offer “Exit sample” beside their heading. Existing confirmation protects replacement: Stay retains entries, choices and the open view; Discard clears the sample, examples, feedback and pending editor fields and returns focus to the original setup. Proofs retain the selected format with empty premises/conclusion; trees return to empty setup; tables restore their initial formula/editor. Table resets abort pending creation/solution requests and ignore late responses. No route/session bypass is installed.

All 875 web tests and the practice-only production build passed, including type checks. Coverage includes incomplete and example/walkthrough exits, accepted proofs with edited statements, consent retention, focus, table pending/failure cases and cancellation. Local Chrome repeated workspace/completed/walkthrough exits for tables, Fitch/dependency and valid/invalid trees at mobile width, verifying native Stay/Discard, setup focus/values, containment and no page errors or private requests. Temporary processes were cleaned up. Formatting and whitespace passed; ignored evidence uses `exit-` filenames in the existing practice-samples directory. No API/database behavior or local environment setting changed.

Quick UI-audit follow-up: Fitch/dependency proof displays now show a compact sideways-scroll hint only when their content overflows. The hint describes the existing keyboard-focusable scroll region without moving its scroll position. Sample proofs/trees omit the redundant Start over action; custom practice retains it. All 877 web tests and the practice-only production build passed. Focused Chrome checks verified mobile arrow-key panning, hint removal on desktop resize, protected sample exits, retained custom resets and no page/console errors. Mobile screenshots and logs are retained in the ignored `practice-samples/ui-audit` evidence directory. Broader responsive-editor redesign remains deferred; no API/database or environment-setting change.

## Final verification and next branch

Final verification passed workspace type checks, 3,278 tests (1,133 engine, 1,268 API, 877 web), full and practice-only production builds, and 348 PostgreSQL regression checks. Focused Chrome reran walkthroughs, all 15 sample-exit combinations and overflow/reset behavior against the final built practice frontend and real local API. See the [verification record](../verification/practice-sample-problems-verification.md) for evidence, environment restrictions and limits.

Suggested next: `039-chore-practice-sandbox-preparation`, covering hosting/cost review and concrete practice-only build/configuration, deliberate promotion and rollback preparation. Review before provisioning or deployment. The separate portfolio follows the sandbox; broader product UI audits remain deferred before exposing those areas. This closeout starts no branch and deploys nothing.
