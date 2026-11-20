# Truth-tree practice UI audit verification

Branch: `035-chore-truth-tree-practice-ui-audit`. Final application baseline: `bc71f2f`, with closeout/planning documentation afterward. Final checks recorded November 20, 2026.

## Delivered behavior

Truth trees now use a shared visual trunk, staggered expansion rows and connected forks. Terminal paths expose inline Add step/Close/Reopen actions, with explicit entry confirmation/discard. Pending entries retain input, block competing edits/save/check/submission, and keep focus and confirmation visible. Unsafe saved structures retain a read-only fallback. UUIDs/citations remain stable; consecutive displayed branch numbers count terminal paths from left to right rather than shared trunk segments.

Wider trees and long single-line formulas scroll inside a keyboard-focusable viewport. Loaded diagrams/physical resizes center the trunk; ordinary edits retain manual panning, and targeted reveal follows entries/confirmation/undo. Setup buttons, keyboard guidance and closure/expansion fields have explicit spacing. Entered-application markers distinguish all-path use, partial use, pending compounds and terminal literals/constants; they do not certify correctness. Feedback uses textual verdicts, success/error/pending colors and matching branch-numbered outcomes. Unexpected-character feedback identifies the formula and highlights the character, including whole Unicode characters. Practice setup identifies the relevant premise/conclusion. Read-only notation normalizes symbols and grouping; editable text remains intact.

Students independently select Valid/Invalid, with neither option prefilled. Explicit checking, revisioned saves, read-only review and retained evaluation carry both construction and interpretation evidence. New `truth_tree_v2` evidence requires a verified tree and correct selected verdict for automatic full points; otherwise grading needs instructor review. Completion requires a finished attempt plus a selection, allows mistakes and retains verification flags without points. Existing frozen version-1 results retain their original meaning; older saved drafts without a verdict remain unanswered. Grade release and answer reveal remain independent.

The shared parser adds `^` as conjunction, with unchanged precedence, ASTs and identifiers. Proof inputs and both keyboard guides recognize it. Demo template 10 adds neutral problem titles and verdict instructions; new/reset visitors upgrade while existing visitors retain their graph and original absolute deadline.

## Final automated validation

- `npm run check`: type checks, **2,738 tests** (839 engine, 1,193 API, 706 web) and production builds passed.
- `npm run db:test`: **321 PostgreSQL checks** (184 database, 137 API/workflow) passed, including truth-tree saves/transient checks, immutable finals/retries, review, independent release, completion warnings and demo reset/isolation.
- Formatting, branch/working-tree whitespace and local Markdown file targets checked.

Focused regressions cover visual layout under unbalanced/reordered structures, terminal-path numbering, markers/partial coverage/undo, pending-entry ownership, keyboard confirmation and focus, retained dirty baselines, missing/wrong/correct verdicts, provisional open paths, forged evidence/aggregate summaries, completion gating and shared authoring/assigned consumers. Caret conjunction produces the same formula structure and table identities as existing aliases.

## Local browser evidence

Final headless Chrome reran the real frontend/engine workflow with a five-leaf argument, four forks and twelve formulas. It checked explicit expansion/closure, reopen/reclose, entry confirmation/discard, pending protection, focus/reveal, formula non-overlap, terminal numbering and feedback agreement, setup/closure/result spacing, keyboard panning and 390px page/entry containment. It verified unselected/wrong/correct verdict behavior, no stale feedback after a choice change, long formulas on one line with internal scrolling, `^` input, character highlights in setup and checked work, empty browser storage and no uncaught page errors.

Only signed-out account restoration was stubbed. Browser construction/checking used real frontend/engine code; this was not a live resource-API or account walkthrough. PostgreSQL checks separately supplied backend workflow evidence. Ignored scripts/screenshots/results: `.codex-local/verification/truth-tree-layout/`, `truth-tree-inline/`, `truth-tree-verdict/`, `truth-tree-polish/`, `truth-tree-numbering/` and `truth-tree-expressions/` under the same verification directory. Temporary Chrome/Vite processes were stopped. Earlier [verdict-slice evidence](truth-tree-verdict-verification.md) remains historical.

## Highlight-scrollbar follow-up

After the final suite, a reported tiny vertical scrollbar beside character highlights was fixed by providing vertical padding/line height and explicitly hiding vertical overflow on the formula snippet. Horizontal scrolling for long snippets remains available. The local Chrome smoke was rerun with an assertion that the highlighted snippet has no vertical content overflow, alongside the existing desktop/mobile checks; it passed. CSS formatting and whitespace checks passed. Full suites were not repeated for this CSS-only follow-up. Ignored evidence: `.codex-local/verification/truth-tree-expressions/scrollbar-smoke.cjs` and its log.

## Rollout, limits and next work

No migration or environment change. Rebuild matching contracts/engine/database-package/API/frontend outputs. Coordinate application rollback: old parsers do not accept caret notation and old result consumers cannot necessarily read version-2 evidence. Existing official results are not regraded. New/reset demos receive template 10.

The practice UI withholds the explicit argument outcome/counterexample before a student selects and checks, but authorized transient reports still contain checker evidence. This is instructional behavior, not an added network-redaction boundary. Construction marks are not automatic checking or proof of complete/correct decomposition.

Full demo teaching-flow and genuine-account visual QA remain planned. No fresh clean installation, remote CI query, hosted deployment, live Cognito/email/payment check, load/soak run, screen-reader audit or browser/accessibility matrix was performed. Existing Jest VM-module advisories remain. No user development database was migrated/reset, infrastructure provisioned, messages sent or PR published.

Next is proposed `036-feat-formula-grouping-and-decomposition`; see the [agreed cross-method plan](../planning/formula-grouping-and-decomposition.md). Explicit author boundaries, ungrouped-chain extraction/partitioning and mixed-operator grouping requirements are planned, not delivered by this UI branch. The current parser still infers binary association and discards grouping metadata. Resume demo teaching-flow and genuine-account audits after that feature, then portfolio sandbox preparation. No next branch is created by this closeout.
