# Duplicate assignment

Branch: `013-feat-duplicate-assignment`.

## Agreed behavior

Duplicate a saved assignment into the same class as a fresh, editable draft. Copy instructions, assessment/feedback/solution policy, and the ordered pinned problem-version references, preserving repeated occurrences. Name it Copy of followed by the source title, truncated to the existing 120-code-unit contract limit without splitting a Unicode character.

Draft, published and archived sources can be duplicated by their owning instructor. The copy is active and unpublished with fresh assignment/item IDs and timestamps. Copy no student attempts, results, invitations, purchases or entitlement records. Preserve the source unchanged. Creating a draft does not require coverage; publishing it uses the existing coverage, ownership, content and archive checks.

Duplication reads saved state, not local unsaved edits. UI must use unsaved-work confirmation before replacing a dirty editor with the copy. Cross-class copying, batch duplication and automatic retries are outside this branch. Each successful duplication creates a distinct draft; do not imply request idempotency.

## Small slices

1. Persistence operation and PostgreSQL regression checks (implemented). Lock the source parent row to serialize the snapshot with edits/publication/archive. Create the complete draft atomically, including when invoked inside a demo workspace transaction. No HTTP endpoint or UI yet.
2. Instructor-only POST endpoint (implemented) with an empty action body, returning 201 and the existing assignment response. Reuse authorization, exact-origin, rate-limit, error and no-store policies, including scoped demo resources. Add handler/route/access checks.
3. Duplicate as draft UI, opening the returned draft with dirty-editor protection, busy/error/recovery behavior and regression tests. Avoid silently issuing another duplicate after an uncertain response.
4. Automated final verification, documentation and local PR draft. Manual browser QA remains in the dedicated QA branch.

## Verification boundaries

Slice 1 should prove new IDs, saved content/policy/order including repeats, cleared publication/archive fields, unchanged source and student/financial data, owner scoping, coverage-independent draft creation, empty/long-title cases, source-lock serialization and transactional rollback. Slice 2 verifies HTTP/role/workspace boundaries, request strictness, no-store, errors and inherited rate limits. UI behavior remains the next slice. No database migration is required.
