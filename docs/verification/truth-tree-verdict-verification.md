# Truth-tree student validity verdict verification

Branch: `035-chore-truth-tree-practice-ui-audit`, verdict slice, November 20, 2026.

Students now select Valid/Invalid independently of constructing their tree. Neither choice is prefilled. Practice, assigned saves/checks, finalization and instructor review retain the choice. New `truth_tree_v2` evidence records tree verification and verdict assessment separately. Full automatic credit requires a verified tree and correct choice; other outcomes require review. Completion requires a finished attempt and selection, permits mistakes and retains verification flags without points. Independent grade and answer release continue to govern disclosure.

## Automated evidence

- `npm run check` passed type checks, 2,719 tests (836 engine, 1,192 API, 691 web) and production builds.
- After adding the final aggregate wrong-verdict regression, the API type check and all nine truth-tree finalization tests passed. That case verifies a correct tree with a wrong choice remains pending grading review and contributes a completion verification error; forged aggregate counts are rejected.
- `npm run db:test` passed 321 PostgreSQL checks (184 database, 137 API/workflow), including normal/demo save/check/finalization, frozen retries, independent release and seeded reset workflows.
- Tests cover valid/invalid choices, missing/null choices, provisional open paths, forged evaluation fields, historical frozen evidence, dirty baselines, selection changes, completion gating and submitted review.

## Focused browser evidence

Local headless Chrome constructed the five-leaf argument using the real frontend/checker. A check before selection displayed construction feedback without the explicit outcome/counterexample; a wrong choice displayed incorrect after checking, and changing to the right choice cleared stale feedback and required another explicit check. Neither option was preselected. The existing tree reopen/reclose, pending-entry gating, focused reveal, non-overlapping formulas, keyboard panning and 390px page/entry containment checks passed. Browser storage remained empty and no uncaught page errors occurred.

Only signed-out account restoration was intercepted. This browser check did not exercise live resource APIs; PostgreSQL workflows supplied backend evidence. Ignored scripts, screenshots and results are in `.codex-local/verification/truth-tree-verdict/`. Temporary Vite/Chrome processes were stopped.

## Rollout and limits

No migration or environment change. Rebuild matching workspace outputs. Older draft answers without a verdict are unanswered; frozen version-1 results preserve their original meaning. New evaluations always record version 2. Template 10 uses neutral problem titles and verdict instructions; only new/reset visitors upgrade, preserving the original absolute lifetime.

The practice display change is instructional rather than an additional network-redaction boundary: authorized checks still return checker reports. Invalidity requires a fully decomposed consistent open branch. Formula-decomposition checkmarks remain deferred. No full product/browser/accessibility audit, hosted deployment, clean installation, remote CI query or live Cognito/payment verification was performed. Existing Jest VM-module advisories remain. No user development database was migrated/reset and no infrastructure was provisioned.
