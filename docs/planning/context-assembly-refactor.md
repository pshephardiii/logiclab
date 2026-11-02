# Explicit context assembly and focused maintainability review

Branch: `023-refactor-explicit-context-assembly`. The agreed order is explicit context assembly, straightforward extraction opportunities in large production files, then a test-gap scan across happy paths, failures and edges. Preserve behavior, authorization, disclosure, transaction ownership and normal/demo isolation. This is not a general architecture rewrite or permission to enable graded derivations.

## Slice 1: explicit submission-review assembly

Previously `createAssignmentStore` created a separate review store and spread its methods into the assignment facade. A handler calling `context.assignments.findSubmission` therefore obscured the implementation behind that property. The assignment store now contains assignment operations only, and the request context names the review dependency explicitly.

| Handler context property    | Constructed by                                                            | Responsibility                                                                     |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `context.assignments`       | `createAssignmentStore` in `persistence/assignment/store.ts`              | Assignment reads, authoring, publication, duplication, archive and release actions |
| `context.submissionReviews` | `createSubmissionReviewStore` in `persistence/submission-review/store.ts` | Owner-authorized final-submission lists and detail                                 |

Ordinary bootstrap (`bootstrap/dependencies.ts`) creates both stores using the shared ORM and exposes them beside the existing auth service/configuration in `AssignmentContext`. Both review handlers call `context.submissionReviews`. No HTTP path, response contract or query changed.

Demo bootstrap (`bootstrap/demo.ts`) explicitly assembles both stores against the current workspace transaction manager and exposes separately named request-local proxies. The review proxy retains the existing actor fence and refuses calls outside a resource transaction. The persistence review store still owns its queries and access checks; no forwarding alias remains in the assignment store. Unit/integration fixtures construct the same separate dependencies, so type checking detects stale facade usage.

Other composition sites were inspected: billing combines its own reads and mutations behind the billing application service; durable jobs combine schedule/execution operations for the operator workflow. Neither hides a separate HTTP review context in the same way. Keep those cohesive interfaces unchanged unless a concrete caller benefit emerges in a later slice.

### Verification

On November 2, 2026:

- `npm run check` passed type checks, 1,472 tests (377 engine, 791 API, 304 web) and production builds.
- `npm run db:test` passed 267 PostgreSQL checks (174 database, 93 API/workflow).
- Focused handler/bootstrap tests verify the explicit review dependency, shared ORM/service and resource cleanup after review-store initialization failure.
- A new demo regression reads an assignment created inside an uncommitted resource request through the explicit review store, then verifies both rollback and successful commit. It also rejects wrong-actor and outside-request calls. Existing normal/demo completion, graded/objective review, authorization, isolation and retention regressions passed.
- Formatting and whitespace checked. Logs are local `/private/tmp/context-check.log` and `/private/tmp/context-db.log`.

No browser walkthrough was repeated: frontend/HTTP contracts and presentation are unchanged. No migration, environment change, development-database reset, remote CI query or external provisioning was performed. Existing Jest VM-module advisories remain. The branch is not ready for a final PR draft while the requested extraction/coverage passes remain.

## Initial extraction inventory

Line counts were measured after the context change, excluding test files and generated outputs. Length is an inspection aid, not a refactoring threshold. These are candidates for the next pass, not extractions already performed.

| File                                                             | Lines | Finding and proposed disposition                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/api/src/persistence/assignment/store.ts`               |   438 | Largest inspected production file. Several helpers close over entity constructors and transaction state. Retain orchestration/locks; extract only if a cohesive helper can take a small explicit dependency set. Splitting methods just to reduce length would make tracing harder.                |
| `services/api/src/persistence/student-work/store.ts`             |   342 | Save/check/finalize share authoritative assignment/enrollment and attempt locks. Keep the ordering visible; pure evaluation/projections already live separately. No immediate safe extraction selected.                                                                                            |
| `apps/web/src/pages/student-work/hooks/useAssignedAttempt.ts`    |   326 | Answers/baselines are already extracted. Request cancellation, timers, writes and disclosure are coupled; avoid a new generalized request framework. Look for a small pure policy/helper only if it improves readability beyond moving conditions.                                                 |
| `apps/web/src/pages/student-work/components/AssignedAttempt.tsx` |   304 | Submission instructions, confirmation and submit button form a cohesive presentation section. Candidate: a small component receiving readiness/busy/confirmation data and callbacks; keep authoritative eligibility/request logic in the existing hook.                                            |
| `apps/web/src/features/proof/components/FitchProofEditor.tsx`    |   273 | Parent/endpoint/delete controls for each block are a cohesive presentation unit. Candidate: block controls alongside existing `FitchProofLine`, preserving stable references, filtered choices, parent-owned deletion confirmation and update callbacks. Reuse existing editor/helper regressions. |

The two presentation candidates appear inexpensive. Do not extract catalog data, small forms or existing focused helpers solely to reduce their line counts. Reinspect actual dependencies and test behavior before making either change.

## Preliminary test-gap triage

This is a targeted source/test comparison, not an exhaustive coverage audit and not a claim of product defects. The full test-gap pass follows extraction so additions validate final behavior rather than abandoned structure. Component tests exercise several hooks through real components; lack of a dedicated hook test file alone is not a gap.

1. **Late final-submission reply after assignment replacement.** `useAssignedAttempt` guards submit state updates with the request signal. Existing tests cover late check/save replies and submission failure/reload, but the inspected assigned-work suites do not explicitly defer a submit response, change assignment/unmount, then resolve it. Add a focused deferred-response case ensuring the old final cannot replace the new assignment's answers/result/notice.
2. **Check-response occurrence mismatch.** `useAssignedAttempt.check` explicitly rejects `response.itemId !== itemId`. The inspected hook/component tests do not exercise this branch. Return an otherwise valid response for another occurrence and verify an actionable error, retained edits and no feedback applied to either occurrence.
3. **Overlapping billing pagination.** `useClassBilling.more` deduplicates plan and purchase pages by ID. Existing component pagination checks use disjoint second pages. Add overlap cases verifying unique entries and retained selected plan, with the real hook and mocked transport. Do not infer that deduplication is broken or change its update policy without a separate behavioral reason.

Existing coverage already includes save/check failures, cancellation, incomplete proof/companion work, immutable retries, unknown/foreign identities, policy transitions, separate grade/answer access, ownership, normal/demo isolation, rollback and concurrency. Avoid duplicating those cases merely to increase counts. As the broader scan continues, record concrete trigger, expected behavior, current evidence and whether each finding needs a test, a fix or no action.

## Next slices

1. Frontend presentation extractions are implemented as recorded below. The user narrowed this pass to frontend production files; leave test files unchanged unless an extraction requires an adjustment.
2. Complete the test-gap pass, add focused cases for confirmed holes and fix reproduced defects separately from speculative concerns.
3. Consolidate final branch documentation/verification and prepare the local PR draft. The next feature remains `024-feat-derivation-grading-review`; graded proof admission remains guarded until that workflow is ready.

## Slice 2: five frontend presentation extractions

Extracted the five user-approved components without moving parent state or request lifecycles:

- `FitchProofBlockControls`: block parent/endpoint/delete controls, with eligible choices supplied by `FitchProofEditor`. The editor retains full-proof updates and deletion confirmation.
- `DerivationRuleFields`: permitted-rule toggles, effective labels and suggestions. `DerivationProblemFields` retains the full definition and disabled-rule label drafts.
- `AssignmentPublicationControls`: publication/archive information and duplicate/publish/archive/restore/reload controls. `ClassAssignments` retains requests and unsaved-work confirmation.
- `FinalSubmissionPanel`: instructions, controlled confirmation checkbox and submission button. `AssignedAttempt` retains confirmation state and eligibility/request handling.
- `AssignedProblemNavigation`: problem selection, previous/next controls and current allocation display. `AssignedAttempt` retains position, check cancellation and confirmation resets.

Existing labels, markup structure, disabled conditions and callbacks are preserved. No hook/request logic, backend behavior, schema or styles changed. No test files were added or modified.

Verification on November 2, 2026: frontend type checking, all 304 existing web tests and the production web build passed. Formatting and whitespace checks passed. The existing component suites exercise the extracted controls through their parents, including authoring labels, subproof editing/deletion, lifecycle controls, navigation and completion confirmation. PostgreSQL/backend checks and a real-browser walkthrough were not repeated for this frontend-only extraction. Logs: `/private/tmp/frontend-extraction-types.log`, `frontend-extraction-tests.log` and `frontend-extraction-build.log`. The next requested pass is the focused test-gap review; new coverage is not part of this extraction slice.
