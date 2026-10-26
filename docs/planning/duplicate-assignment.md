# Duplicate assignment

Branch: `013-feat-duplicate-assignment`.

## Agreed behavior

Duplicate a saved assignment into the same class as a fresh, editable draft. Copy instructions, assessment/feedback/solution policy, and the ordered pinned problem-version references, preserving repeated occurrences. Name it Copy of followed by the source title, truncated to the existing 120-code-unit contract limit without splitting a Unicode character.

Draft, published and archived sources can be duplicated by their owning instructor. The copy is active and unpublished with fresh assignment/item IDs and timestamps. Copy no student attempts, results, invitations, purchases or entitlement records. Preserve the source unchanged. Creating a draft does not require coverage; publishing it uses the existing coverage, ownership, content and archive checks.

Duplication reads saved state, not local unsaved edits. UI must use unsaved-work confirmation before replacing a dirty editor with the copy. Cross-class copying, batch duplication and automatic retries are outside this branch. Each successful duplication creates a distinct draft; do not imply request idempotency.

## Small slices

1. Persistence operation and PostgreSQL regression checks (implemented). Lock the source parent row to serialize the snapshot with edits/publication/archive. Create the complete draft atomically, including when invoked inside a demo workspace transaction. No HTTP endpoint or UI yet.
2. Instructor-only POST endpoint (implemented) with an empty action body, returning 201 and the existing assignment response. Reuse authorization, exact-origin, rate-limit, error and no-store policies, including scoped demo resources. Add handler/route/access checks.
3. Duplicate as draft UI (implemented), opening the returned draft with dirty-editor protection, busy/error/recovery behavior and regression tests. Avoid silently issuing another duplicate after an uncertain response.
4. Automated final verification, documentation and local PR draft. Manual browser QA remains in the dedicated QA branch.

## Verification boundaries

Slice 1 should prove new IDs, saved content/policy/order including repeats, cleared publication/archive fields, unchanged source and student/financial data, owner scoping, coverage-independent draft creation, empty/long-title cases, source-lock serialization and transactional rollback. Slice 2 verifies HTTP/role/workspace boundaries, request strictness, no-store, errors and inherited rate limits. Slice 3 covers scoped client paths, fresh draft selection and subsequent saves, source states, unsaved-work consent, failed-request retention, duplicate-click prevention, late-response isolation and failed-list-refresh recovery. Final verification remains the next slice. No database migration is required.

## Instructor workflow

Open a saved assignment and choose Duplicate as draft. Draft, published and archived sources are supported. The UI explains that saved content is copied and the source remains unchanged. A dirty editor asks for Stay/Discard before the duplication request; Stay sends no request. A successful response opens the returned active draft and resets the editor baseline to the saved copy. Edits then save to the new ID, and normal publication checks remain in place. New unsaved assignments have no duplication action.

Busy controls and a mutation-in-flight guard prevent stacked requests. Failures preserve source edits and advise reloading Active or All assignments to inspect for a copy before deliberately trying again. Reloading never retries the POST. If the copy response succeeds but list refresh fails, keep the confirmed copy open and retry only the list read. The current list filter is preserved, so an active copy may be open while an Archived filter hides it from the list. Leaving the class aborts client handling of a pending response; it does not guarantee cancellation of a server write.

Manual browser QA remains deferred. No autosave, cross-class copying, idempotency key or automatic duplicate retry is introduced.
