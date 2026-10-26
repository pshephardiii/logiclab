# Duplicate assignment verification

Date: October 26, 2026. Branch: `013-feat-duplicate-assignment`.

## Automated pass

- `npm run check`: type checks, 700 tests (71 engine, 493 API, 136 frontend), and production builds passed.
- `npm run db:test`: 163 PostgreSQL checks passed (121 database, 42 API/workflow).
- Formatting, whitespace and local documentation link targets checked; the local PR draft is ignored by Git.

## Verified guarantees

Persistence tests duplicate draft, published and archived saved sources. They verify fresh assignment/item IDs, repeated ordered pinned versions, preserved instructions/policy, cleared archive/publication fields, unchanged source and attempts/results, no new billing records, owner scoping, empty sources, bounded Unicode titles and immediate learning policies. New drafts require no coverage, while later publication retains coverage/content checks.

Duplication joins the caller transaction and rolls back the full new draft with it. A concurrency test observes a PostgreSQL lock wait before committing a source edit; the duplicate then contains the committed title/item snapshot. Source mutations and duplication serialize on the same parent-row lock.

Handler/route tests verify authenticated ownership, a strict empty body, UUID params, 201 responses, no-store, authentication/role/origin restrictions, sanitized failures and inherited mutation limits (10 requests per 15 minutes per IP for the route). Real HTTP/PostgreSQL checks verify normal ownership and demo namespace isolation, including cross-visitor, normal-resource and student-role rejection.

Frontend tests verify normal/demo POST destinations and response validation; draft/published/archived duplication into an editable saved copy; subsequent saves using the copy ID; Stay sending no request; failed requests preserving local source edits; fresh consent after failure; duplicate-click prevention; late-response isolation after unmount; and retained confirmed copies when only list refresh fails. Reloading the list does not repeat the POST.

## Recovery and rollout

No database migration, configuration change or new dependency is required. The endpoint is `POST /api/assignments/:assignmentId/duplicate` with `{}`, returning the existing assignment response with status 201. Demo resources expose it under their existing namespace. The instructor editor opens the returned copy after success and confirms before replacing dirty source edits.

Every successful request creates another draft. No idempotency key or automatic duplicate retry is implemented. An uncertain response advises inspecting Active or All assignments before retrying. Aborting a client request cannot guarantee that the server rolled back a committed copy. A failed list refresh after a successful copy does not invalidate the known copy; retry only the read. Filters remain selected, so a new active draft may be open while an Archived list hides it.

## Deferred QA and limits

Manual browser QA is intentionally deferred to `014-test-demo-qa`. No real-browser walkthrough, clean dependency installation, remote CI query, hosted deployment, live Cognito check, screen-reader/browser matrix or load/soak run was performed. Existing Vite chunk-size, Jest VM-module and Vitest configuration advisories remain. No AWS resources, emails or real payments were created.

The focused concurrency check establishes the tested lock ordering, not long-duration load behavior. Cross-class/batch copying, autosave and guaranteed recovery after an uncertain write remain outside this branch. Continue with the dedicated QA branch, code audit, and sandbox deployment before treating the demo as release-ready.
