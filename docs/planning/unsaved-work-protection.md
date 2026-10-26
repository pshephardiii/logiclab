# Unsaved work protection

Branch: `012-feat-unsaved-work-protection`.

## Agreed scope

Protect unsaved student answers, instructor assignment drafts, and problem-library drafts. Internal navigation offers Stay or Discard changes; reload, closing the tab and external navigation use the browser's standard warning where supported. Saving remains explicit. No automatic saving or browser-storage persistence is introduced.

Only dirty editors register protection. Successful saves or a return to the saved values remove their registration; failed saves retain it. Multiple editors must not clear one another's protection. Forced session expiry/reset cannot be prevented by this UI; authorization and credential lifecycle remain authoritative.

## Commit-sized slices

1. Shared foundation (implemented): dirty registration hook, one route blocker, native confirmation dialog, beforeunload cleanup, and data-router browser entry point. Tests cover clean navigation, Stay/discard/Escape, multiple registrations, unmount cleanup, Back, query navigation, hash-only navigation and becoming clean during a prompt. Student and instructor editor integration are implemented in slices 2 and 3.
2. Student integration (implemented): register unsaved answers and protect same-page class/assignment changes and reload. Keep pending checks, saves, dirty baselines and final confirmation consistent. Explicit discard must authorize only the intended transition, with no persistent bypass.
3. Instructor integration (implemented): assignment and library drafts, same-page selections, published/read-only exclusions, failed-save retention and action controls.
4. Session/demo actions (implemented) and automated final verification (complete; manual QA deferred): deliberate logout/role/reset controls, cancellation/failure behavior, browser focus/keyboard and unload checks, documentation and local PR draft.

Keep each slice small and reviewable; adjust the sequence if shared same-page confirmation belongs in its own slice.

## Foundation boundaries

The browser entry point uses createBrowserRouter/RouterProvider with one catch-all application route. Existing route definitions, AppRoutes, account providers and normal/demo namespaces remain in place. The single UnsavedWorkProvider stays above application pages and aggregates useUnsavedWork registrations without reading or retaining editor contents.

React Router's [useBlocker](https://reactrouter.com/api/hooks/useBlocker) handles internal transitions. A separate beforeunload listener exists only while dirty; the browser controls the warning text and may not show it in every lifecycle situation. The custom dialog uses native showModal for modal focus containment, Stay as the initial focus, and Escape as Stay. DOM tests stub the native dialog methods; real-browser focus and browser-controlled unload UI remain to verify.

Path/query changes are guarded; hash-only jumps are allowed because they do not replace current editors. If all work becomes clean while confirmation is open, dismiss it and cancel the pending navigation rather than navigate unexpectedly. The shared confirmation hook now supports same-page actions without a global bypass. A pending action is canceled on Stay, when its owner unmounts, when work becomes clean, or when router navigation takes precedence. Only explicit Discard invokes the selected callback once. Deliberate session actions now use the same confirmation hook; forced session expiry remains immediate.

## Student integration

AssignedAttempt registers its existing dirty-answer comparison with the provider, excluding submitted work. It remains protected during a pending or failed save and after a failed reload; successful saves or reverted edits clear protection. Moving between problems retains the entire answer map and does not prompt.

Student class changes, assignment selection (including reselecting the active assignment), reload and retry after a failed reload require confirmation when dirty. Stay preserves selection, answers and final-confirmation state. Discard starts only that transition; a subsequent dirty edit is protected again. Available-assignment list refresh/pagination retains the open editor and does not prompt. Automatic feedback never marks work as saved.

DOM tests cover route cancellation, controlled class selection, assignment replacement, one-shot local confirmation, owner unmount cleanup, save failure/success, reverted answers, reload failure and explicit retry consent. Native dialog focus and browser-controlled unload prompts still require final browser verification. Instructor draft protection follows below; deliberate logout/demo role/reset actions are now protected as described below.

## Instructor integration

Assignment drafts register existing field/item/policy dirty state. Confirm before changing classes, selecting another assignment, New assignment, reselecting/reloading the current assignment, or retrying a destructive selection. Stay retains current selection and edits. Existing publication/archive controls remain disabled until the draft is saved. Published assignments and archived drafts are read-only and do not register protection.

Problem-library drafts register title/instructions/formula dirty state. Confirm before New problem or selecting/reselecting a problem. A published version is an immutable snapshot, but its source problem draft remains editable and protected; publication does not make the draft read-only. Archived drafts remain excluded. Previews, list reloads, filters and pagination preserve the open editor and therefore do not prompt.

Successful saves or reverted edits clear dirty protection; failed saves preserve input and protection. Tests cover class cancellation, discard during pending save with late-result isolation, selection/new/reload confirmation, failed/successful saves, retained edits during list operations, one-transition discard, read-only assignment exclusions, problem preview retention, and reverted problem edits. Session/demo controls are implemented below. Native browser focus/unload behavior remains for the dedicated QA branch.

## Deliberate session actions

Sign out and demo start/role/reset/end controls confirm before invoking the session operation when an editor is registered as dirty. Stay invokes no session request. Failed operations do not install a bypass; a new attempt needs fresh consent if dirty work still exists. Normal clean actions retain their previous behavior. In current layouts, navigating to account/demo controls already asks before leaving a dirty editor, so the controls normally find no dirty registration and do not ask again.

Forced session expiry, rejected credentials and role denial remain authoritative; the UI never waits for permission to enforce access. Dirty registrations update a synchronous registry as well as rendered state, so unmounting a protected editor removes its blocker before a session redirect effect runs. Tests cover forced expiry with and without an already-open confirmation, and successful/failed deliberate actions with fresh-consent behavior.

The shared confirmation grants one callback permission; it neither saves data nor suppresses future route warnings. Session reconciliation remains in the existing account/demo hooks. Full branch automated checks and the local PR draft are complete; see [verification evidence](../verification/unsaved-work-protection-verification.md). Real-browser modal focus and unload behavior are explicitly deferred to the QA branch at the developer’s request.

## Next branches

Continue with `013-test-demo-qa`, then `014-refactor-demo-audit`, followed by `015-chore-demo-deployment`. Manual QA is intentionally pending; automated verification does not certify a hosted release.
