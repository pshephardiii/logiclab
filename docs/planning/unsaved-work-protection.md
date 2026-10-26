# Unsaved work protection

Branch: `012-feat-unsaved-work-protection`.

## Agreed scope

Protect unsaved student answers, instructor assignment drafts, and problem-library drafts. Internal navigation offers Stay or Discard changes; reload, closing the tab and external navigation use the browser's standard warning where supported. Saving remains explicit. No automatic saving or browser-storage persistence is introduced.

Only dirty editors register protection. Successful saves or a return to the saved values remove their registration; failed saves retain it. Multiple editors must not clear one another's protection. Forced session expiry/reset cannot be prevented by this UI; authorization and credential lifecycle remain authoritative.

## Commit-sized slices

1. Shared foundation (implemented): dirty registration hook, one route blocker, native confirmation dialog, beforeunload cleanup, and data-router browser entry point. Tests cover clean navigation, Stay/discard/Escape, multiple registrations, unmount cleanup, Back, query navigation, hash-only navigation and becoming clean during a prompt. No existing editor registers dirty work yet, so production prompts remain inactive.
2. Student integration: register unsaved answers and protect same-page class/assignment changes and reload. Keep pending checks, saves, dirty baselines and final confirmation consistent. Explicit discard must authorize only the intended transition, with no persistent bypass.
3. Instructor integration: assignment and library drafts, same-page selections, published/read-only exclusions, failed-save retention and action controls.
4. Session/demo actions and final verification: deliberate logout/role/reset controls, cancellation/failure behavior, browser focus/keyboard and unload checks, documentation and local PR draft.

Keep each slice small and reviewable; adjust the sequence if shared same-page confirmation belongs in its own slice.

## Foundation boundaries

The browser entry point uses createBrowserRouter/RouterProvider with one catch-all application route. Existing route definitions, AppRoutes, account providers and normal/demo namespaces remain in place. The single UnsavedWorkProvider stays above application pages and aggregates useUnsavedWork registrations without reading or retaining editor contents.

React Router's [useBlocker](https://reactrouter.com/api/hooks/useBlocker) handles internal transitions. A separate beforeunload listener exists only while dirty; the browser controls the warning text and may not show it in every lifecycle situation. The custom dialog uses native showModal for modal focus containment, Stay as the initial focus, and Escape as Stay. DOM tests stub the native dialog methods; real-browser focus and browser-controlled unload UI remain to verify.

Path/query changes are guarded; hash-only jumps are allowed because they do not replace current editors. If all work becomes clean while confirmation is open, dismiss it and cancel the pending navigation rather than navigate unexpectedly. The initial guard does not yet cover same-page state changes or session actions; later slices must route those through explicit confirmation before destructive changes.
