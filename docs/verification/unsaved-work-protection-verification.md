# Unsaved work protection verification

Date: October 26, 2026. Branch: `012-feat-unsaved-work-protection`.

## Automated verification

- `npm run check`: type checks, 685 tests (71 engine, 487 API, 127 frontend), and production builds passed.
- `npm run format:check`: passed.
- Whitespace and local documentation link targets checked; the PR draft is ignored by Git.

The branch changes frontend navigation/editor behavior and documentation. No API contracts, entities or migrations changed. PostgreSQL integration checks were not repeated for this frontend-only branch.

## Regression coverage

The shared guard tests use a memory data router and StrictMode. They cover clean navigation, Stay/Discard/Escape, multiple dirty registrations, owner unmount cleanup, history Back, query changes, allowed hash-only changes, dismissal when work becomes clean, one-shot local callbacks, and protection after a previous discard. Beforeunload tests assert prevention only while dirty and listener cleanup after unmount.

Student tests cover dirty answer registration, canceled class/assignment changes preserving controlled selections and entries, accepted replacement, fresh protection on subsequent edits, explicit reload consent, pending check cancellation after accepted reload, failed reload/retry consent, failed/successful saves, reverted answers and read-only final work. Moving between problems retains answers without a prompt. List refreshes and pagination retain the editor.

Instructor tests cover class changes during a pending save and late-result isolation; canceled new/selection/reload actions; retained inputs during list/filter/preview operations; failed/successful saves; reverted problem edits; existing publication/archive gating; and published/archived assignment exclusions. Published library versions remain immutable snapshots while their source drafts remain editable and protected.

Session-control tests prove deliberate normal logout and demo role/reset/end actions wait for consent, Stay invokes no session operation, and failed actions require fresh consent on retry. Forced session-expiry tests prove protected work unmounts and redirects even when a confirmation is already open. Synchronous unregistration prevents stale dirty state from blocking that redirect.

## Manual QA deferred

No real-browser walkthrough was performed for this branch. Native dialog methods are stubbed in jsdom: passing DOM tests does not establish actual browser focus containment/restoration, initial focus, keyboard traversal, mobile layout or browser-controlled unload warning behavior.

The dedicated QA branch should verify native focus and Escape, repeated Back/Forward navigation, reload/tab-close/external navigation after user interaction, student/instructor end-to-end cancellation and saving, normal/demo coexistence, and session expiry during work. Browser unload warnings are best effort and cannot guarantee recovery after a crash or abrupt process termination.

## Scope and rollout

There is no database migration or configuration change. The browser entry point now uses createBrowserRouter/RouterProvider, retaining the existing AppRoutes and normal/demo resource namespaces. One UnsavedWorkProvider owns route blocking and dirty registrations. Same-page actions use useConfirmDiscard before state changes; no global navigation bypass is installed.

Saving remains explicit. Unsaved data is held only in the existing component state, with no browser-storage persistence or autosaving. Read-only work does not register dirty state. Forced credential expiry and authorization remain authoritative. The guard protects the selected student and instructor editors; it is not a universal recovery mechanism for every form or anonymous practice state.

No clean dependency installation, remote CI query, hosted deployment, live Cognito check, AWS/payment call, load/soak run, screen-reader audit or browser matrix was performed. Existing Vite chunk-size, Jest VM-module and Vitest configuration advisories remain.

Next: dedicated demo QA, then the code audit and sandbox deployment. This automated pass does not replace those release-readiness steps.
