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

## Slice 3: remaining straightforward Fitch editor extractions

Extracted `FitchProofInsertControls` (scope/insertion-position selectors and insertion buttons), `FitchProofDeletionConfirmation` (confirmation message and buttons), and the pure `proofEditorChoices` helper (line/block labels and scope lookup). `FitchProofEditor` retains scope/position/deletion/error state, insert error handling, affected-line counts and proof mutations. Its line/block rendering maps remain visible in the parent. Labels, missing-target handling, resource limits, confirmation cancellation and explicit-save semantics are unchanged. The editor decreased from 246 to 189 lines; no request, backend or styling behavior changed.

Frontend type checking, all 304 existing web tests and the production build passed on November 2, 2026. Formatting and whitespace checks passed. No test files were added or modified; existing authoring/student editor suites exercise these controls through their parents. No browser walkthrough or database/backend suite was repeated for this presentation/helper-only extraction. Local logs: `/private/tmp/fitch-controls-types.log`, `fitch-controls-tests.log` and `fitch-controls-build.log`.

The user-approved follow-up in this slice also extracts `FitchPremiseFields` and `FitchInferenceFields` from the `step.kind` branches in `FitchProofLine`. Each receives its narrowed `ProofStep` variant through `Extract`, without casts or new state. The line component retains the shared heading/formula input, assumption explanation and move/delete controls; it decreased from 163 to 108 lines. Premise linking still preserves formula text, and inference controls retain existing citation slots and missing references when rules change.

After the line-field extractions, all 304 existing frontend tests and the production build (including TypeScript checking) passed. No test files were added or modified. Logs: `/private/tmp/fitch-line-tests.log` and `fitch-line-build.log`. This completes the requested additions to slice 3; the broader coverage pass remains separate.

## Slice 4: assignment form defaults and derived state

Added the cohesive `assignment-form-state.ts` helper module for normalized assignment defaults, proof-policy eligibility and dirty/derived form checks. A private metadata helper supplies the same baseline for initialization and comparison; `assignmentItemState` remains responsible for occurrence identity, point validity/change detection and totals. `AssignmentForm` retains React state, initialization-time policy validation, its dirty-notification effect, short `readOnly`/`graded`/ID expressions and event/request handlers. The shared `SelectedProblem` type now lives with the form helpers instead of being exported by a UI component; `AssignmentItems` imports it as a type. No constants file or new limits were introduced.

On November 3, 2026, all 304 existing frontend tests and the production build, including TypeScript checking, passed. Formatting and whitespace checks passed. No test files were added or modified; existing form tests cover dirty/reverted state, policy transitions, point bounds, retained failed saves, read-only work and proof-mode restrictions through the extracted helpers. Backend/database checks and a browser walkthrough were not repeated for this pure frontend refactor. Logs: `/private/tmp/assignment-form-extraction-tests.log` and `assignment-form-extraction-build.log`.

## Slice 5: seven remaining page-helper extractions

Implemented the seven user-approved frontend candidates:

1. `assignmentPolicyTransition` derives the next learning policy and answer-reset flag. `AssignmentPolicyFields` retains proof-mode guards, event handling and notice/grade-timing updates.
2. `assignedWorkCapabilities` and `assignmentCompletionReady` derive student-work eligibility/readiness. Hook state, memo dependencies, requests, cancellation and timers remain in their original owners.
3. `conceptualPreviewData` shapes instructor preview content and its separate privileged answer payload. Preview answer/reveal state and ordinary content redaction remain unchanged.
4. Conceptual option helpers perform text changes, moves and removal while preserving IDs and clearing a removed correct selection. React updates and add-option identity generation remain in the component.
5. Shared `appendPageById` replaces existing append/dedup calculations in assignment, submission, problem, billing and classroom lists. The old classroom-only helper was removed after its callers migrated. Existing rows are preserved; only incoming IDs already in the current list are excluded. Order and duplicates within the incoming page are unchanged. Call sites that previously appended without filtering remain unchanged, as do first-page replacement and request lifecycles.
6. `assignmentActionNotice` selects existing publish/archive/restore/release messages independently from mutation handling.
7. Account-specific constants group existing form titles, headings and navigation items. Labels, navigation order, field visibility and account actions are unchanged.

On November 3, 2026, frontend type checking, all 304 existing web tests and the production build passed. Formatting and whitespace checks passed. No test files were added or modified. Backend/database suites and a real-browser walkthrough were not repeated for these frontend-only pure extractions. Logs: `/private/tmp/page-helpers-types.log`, `page-helpers-tests.log`, `page-helpers-build.log` and `page-helpers-format-check.log`. The separate test-gap review remains pending.

### Answer-options component follow-up

Extracted the multiple-choice Answer options section into the controlled `ConceptualAnswerOptions` component. It receives options, the correct-option ID and editing callbacks. `ConceptualProblemFields` retains the full fields object, existing pure edit helpers and new-option UUID generation, alongside question, true/false and explanation controls. Existing labels, radio grouping, option limits, order controls and selection-clearing behavior are preserved.

After this follow-up, all 304 existing frontend tests and the production build, including TypeScript checking, passed on November 3, 2026. Formatting and whitespace checks passed. No test files changed. Logs: `/private/tmp/answer-options-tests.log` and `answer-options-build.log`; backend/database and real-browser checks were not repeated for the component extraction.

## Slice 6: first backend extraction pass (candidates 1–4)

The user moved the extraction pass to persistence stores and approved taking the proposed candidates in slices. This first backend slice extracts:

1. `duplicateAssignmentTitle` in the assignment application layer, preserving the copy prefix, 120-code-unit bound, Unicode character iteration and trailing-space trimming.
2. `libraryProblemDraft` in `persistence/problem/draft-response.ts`, alongside the existing published-version response helper. It preserves private-definition validation, null normalization and timestamp formatting.
3. `assignmentDetail` in `persistence/assignment/detail-response.ts`, preserving complete definition admission checks and owner-only pinned-version projection. The store retains the ordered/populated item query and all ownership/transaction behavior.
4. `submissionSummary` and `objectiveReviewAttempt` in `persistence/submission-review/response.ts`. Existing final-summary validation and objective result/score projections remain distinct from student grade-disclosure logic and the existing proof-completion owner projection. Queries, ownership/final-only checks and their ordering remain in the store.

On November 3, 2026, API type checking, all 791 existing API tests, the API production build and all 267 PostgreSQL checks (174 database, 93 API/workflow) passed. Existing database cases cover Unicode-bound duplication, source/pinned snapshot preservation, ownership, normal/demo isolation, grade disclosure, score-free completion review, rollback and concurrency. Formatting and whitespace checks passed. No test files were added or modified. No schema/environment change or user development-database migration/reset occurred. Frontend/browser checks were not repeated for these backend-only extractions. Logs: `/private/tmp/persistence-projections-types.log`, `persistence-projections-tests.log`, `persistence-projections-build.log` and `persistence-projections-db.log`.

The remaining approved backend candidates are draft-scoring validation (5), submission-result calculation (6), and payment-event validation (7), to be taken individually with existing transaction/lock/query order preserved. The separate test-gap review follows the extraction work.

## Slice 7: draft-scoring validation (backend candidate 5)

Extracted `validateDraftScoringInput` and `validatedDraftPointAllocations` into `application/assignment/draft-scoring-validation.ts`. The first preserves validation of weighted inputs, incompatible request combinations and non-graded point authoring. The second validates the full effective occurrence allocation and returns the same item-ID-to-points map without mutating items. Both retain `invalid_scoring` failures and existing shared schema validation.

The assignment store still checks input compatibility before its item queries, validates allocations after effective items/versions have been checked, and applies point changes itself. Item ordering/replacement rules, queries, ownership, locks, transaction ownership, flush order and rollback behavior remain unchanged.

On November 3, 2026, API type checking, all 791 existing API tests, the API production build and all 267 PostgreSQL checks (174 database, 93 API/workflow) passed. Formatting and whitespace checks passed. No test files changed; existing scoring/authoring/demo integration coverage exercises the extracted checks. No schema/environment changes or development-database reset/migration occurred. Frontend/browser checks were not repeated for this backend-only refactor. Logs: `/private/tmp/draft-scoring-types.log`, `draft-scoring-tests.log`, `draft-scoring-build.log` and `draft-scoring-db.log`. Submission-result calculation (candidate 6) is next, followed by payment-event validation (7).

## Slice 8: submission-result calculation (backend candidate 6)

Extracted `calculateSubmissionResult` into `persistence/student-work/submission-result.ts`. It consumes already-loaded pinned assignment/items and saved answers, retains scoring/proof-policy checks and calls the existing objective/proof evaluators and scorers. It returns a result and optional point score without modifying entities, querying the database, acquiring locks or writing timestamps/revisions. Score-free completion remains separate from graded points; staged graded proof admission remains guarded.

The student-work store retains authorization/enrollment checks, assignment/attempt locks, immutable-final early return, revision validation, ordered item loading and final entity updates/flush/projection. Retained retries still return before calculation. Only a returned score is applied, preserving completion behavior. The store decreased from 342 to 297 lines.

On November 3, 2026, API type checking, all 791 existing API tests, the API production build and all 267 PostgreSQL checks (174 database, 93 API/workflow) passed. Existing integration cases verify objective/mixed/proof graded and completion finalization, review-needed point totals, independent disclosure, pinned data, immutable retries, concurrent save/submit, and caller/database/demo rollback. Formatting and whitespace checks passed. No test files changed, and no schema/environment change or user development-database migration/reset occurred. Frontend/browser checks were not repeated for this backend-only extraction. Logs: `/private/tmp/submission-calculation-types.log`, `submission-calculation-tests.log`, `submission-calculation-build.log` and `submission-calculation-db.log`. Payment-event validation (candidate 7) is next.

## Slice 9: payment-event validation (backend candidate 7)

Extracted `validatedPaymentEventTime` into `application/billing/payment-event-validation.ts`. It retains the existing checkout-reference match, safe-integer/maximum sequence checks, purchase-time lower bound and five-minute future allowance, returning the event timestamp for existing payment effects. Validation conditions, error codes and clock evaluation remain unchanged.

The billing store still handles duplicate receipts before calling validation. It retains class/purchase locks, conflicting receipt detection, stale-event/refund handling, purchase transitions, entitlement changes, receipt writes and flushes in their existing order and transaction.

On November 3, 2026, API type checking, all 791 existing API tests, the API production build and all 267 PostgreSQL checks (174 database, 93 API/workflow) passed. Formatting and whitespace checks passed. No test files changed. No schema/environment change or user development-database migration/reset occurred; frontend/browser checks were not repeated for this backend-only extraction. Logs: `/private/tmp/payment-event-validation-types.log`, `payment-event-validation-tests.log`, `payment-event-validation-build.log` and `payment-event-validation-db.log`. This completes the seven approved backend candidates; the separate test-gap review remains pending.

## Slice 10: assignment store structure follow-up

Following the user's review, extracted four more cohesive sections from the assignment store:

- `types.ts` owns the public `AssignmentStore` interface. Route context and test type imports now reference that file directly.
- `policy-fields.ts` owns the assessment/feedback/solution enum maps and `policyFields` conversion. It retains the existing dynamic database import convention; callers await the conversion.
- `queries.ts` owns `ownedClass`, `ownedAssignment`, `ownedVersions` and `detail`. Each receives the caller's entity manager, preserving ownership filters, optional write locks, version validation and populated/ordered detail loading.
- `draft-items.ts` owns `replaceItems` and `draftScoring`. Validation, reference checks, replacement, flush/reload and allocation application retain their order and use the caller's transaction.

`store.ts` decreased from 408 to 229 lines and retains public operation orchestration and transaction ownership. No helper creates a separate manager or transaction. Existing public behavior, error codes, publication/release/archive guards and normal/demo boundaries remain unchanged.

On November 3, 2026, API type checking, all 791 API tests, the API production build and all 267 PostgreSQL checks (174 database, 93 API/workflow) passed. Formatting and whitespace checks passed. Test changes are limited to the two imports required by the interface move; no assertions or cases changed. No schema/environment changes or user development-database migration/reset occurred. Frontend/browser checks were not repeated for this backend-only extraction. Logs: `/private/tmp/assignment-store-extraction-types.log`, `assignment-store-extraction-tests.log`, `assignment-store-extraction-build.log` and `assignment-store-extraction-db.log`. The separate test-gap review remains pending.

## Slice 11: student-work and problem store structure

Applied the assignment-store extraction pattern to the first user-approved pair of stores:

- `student-work/types.ts` owns `StudentWorkStore`. `queries.ts` owns enrollment/access/submission eligibility, ordered item loading and locked attempt creation/loading. `validation.ts` owns persisted learning-policy validation and revision checks.
- `problem/types.ts` owns `ProblemStore` and its update/publication result unions. `queries.ts` owns locked and ordinary owner-scoped problem lookups; ordinary lookup is reused for reference preview, version-list admission and draft reads.

Student-work queries retain assignment-before-enrollment locking and the attempt upsert followed by a locked identity-map refresh. All helpers use the caller's entity manager; stores retain transaction ownership, public operations, disclosure decisions and final mutations. Problem publication keeps its parent lock, version numbering, immutable snapshot creation and flush in the public operation. Error/return behavior, query order and normal/demo boundaries remain unchanged. The student-work store decreased from 297 to 199 lines; the problem store decreased from 202 to 133.

On November 3, 2026, API type checking, all 791 API tests, the API production build and all 267 PostgreSQL checks (174 database, 93 API/workflow) passed. Formatting and whitespace checks passed. Test-file changes only redirect type imports/annotations to the extracted interfaces; no assertions or cases changed. No schema/environment change or user development-database migration/reset occurred. Frontend/browser checks were not repeated for these backend-only extractions. Logs: `/private/tmp/student-problem-extraction-types.log`, `student-problem-extraction-tests.log`, `student-problem-extraction-build.log` and `student-problem-extraction-db.log`. The next proposed extraction slice is classroom, submission review and auth; the separate test-gap review remains pending.

## Slice 12: classroom, submission-review and auth helpers

Extracted `ClassroomStore` into `classroom/types.ts`, its response mapper into `summary.ts`, and invitation lookup/expiry/enrollment helpers into `invitation-enrollment.ts`. The public join operation still owns the transaction and checks expiry after acquiring the classroom lock, retaining it through enrollment. Demo-workspace/Cognito ownership filtering and idempotent enrollment remain unchanged.

Extracted `SubmissionReviewStore` into `submission-review/types.ts` and its owner-scoped assignment lookup into `queries.ts`. The lookup retains private-practice exclusion and runs before final-submission retrieval. Existing response assembly, final-only filters and proof-completion projections stay in the store.

Extracted auth's `appUser` mapper into `auth/app-user.ts`, passing the configured pool ID explicitly. It retains identity-provider/subject/pool validation and the original projection/error; its callers await the existing dynamic database import convention. Session queries, refresh/update-only behavior, expiry checks and persistence remain in the store.

Store sizes decreased from 144 to 87 lines (classroom), 93 to 75 (submission review), and 97 to 88 (auth). On November 3, 2026, API type checking, all 791 API tests, the API production build and all 267 PostgreSQL checks (174 database, 93 API/workflow) passed. Formatting and whitespace checks passed. Test-file edits only redirect imports for relocated interfaces; no assertions or cases changed. No schema/environment changes, user development-database migration/reset, frontend/browser rerun or live Cognito verification occurred. Logs: `/private/tmp/classroom-review-auth-types.log`, `classroom-review-auth-tests.log`, `classroom-review-auth-build.log` and `classroom-review-auth-db.log`. Billing and job-operator extractions are the remaining proposed slice; the separate test-gap review remains pending.
