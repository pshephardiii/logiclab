# Assignment scoring

Status: `019-feat-assignment-scoring`, single-model backend enabled. Instructor weight controls and score presentation remain the next slice. This unreleased product does not retain a separate legacy grading workflow.

## One model for graded work

Every graded assignment uses points. Each occurrence has a positive whole-point maximum from 1 to 1,000, defaulting to 10; at most 50 occurrences gives a maximum allocation of 50,000. Repeated versions may have different weights. Practice and completion-only work award no numeric grade. Their occurrences retain default allocation metadata, which can be used if a mutable draft becomes graded.

An objective item earns its allocation multiplied by its fraction of correct response units. A truth-table cell is one unit within its problem; a conceptual choice is one unit within its problem. Incorrect/unanswered units earn no portion. Problem allocations determine relative assignment weight regardless of cell counts. A half-correct 20-point table plus a correct 5-point question earns 15/25 (60%).

Round each item's earned points to hundredths, ties upward. Sum rounded items using integer hundredths, then calculate percentage to two decimal places. Two 10-point items each one-third correct earn 3.33 + 3.33 = 6.66/20 (33.30%). Zero/fractional maxima and extra credit are outside this policy.

## Authoring and publication

Create with ordered `items: [{ problemVersionId, maxPoints }]` for explicit weights or `problemVersionIds` for defaults. Mutable-draft PATCH accepts a complete `pointAllocations: [{ itemId, maxPoints }]` set to edit weights while preserving occurrence IDs, or ordered weighted `items` to replace/reorder content with fresh IDs. Missing, duplicate, foreign or invalid allocations fail atomically. An identical `problemVersionIds` list preserves IDs/weights; changing an existing nonempty graded list requires explicit weighted items to avoid silently discarding allocations.

There is no assignment-level `scoringVersion` toggle or opt-out. Mode changes follow learning-policy validation. Score-free work rejects explicit weighted authoring inputs; changing mode does not erase allocation metadata. Published/archive locks, supported content, ownership, nonempty publication and class coverage remain enforced. Duplication copies allocations to fresh draft occurrences and clears final work/release history.

The current form carries allocations when reordering graded content and supplies defaults for added occurrences. Dedicated weight editing and score display remain pending.

## Frozen scores and evaluation evidence

Every graded finalization atomically retains both its correctness report and a separate `points_v1` score snapshot. The score contains each occurrence's ID, allocation, grading status and earned points, plus a validated assignment summary. Submit retries and reads return the stored snapshot without recalculation. A submitted graded row missing its score fails closed.

Result tags such as `truth_table_v1` and `mixed_v1` describe evaluation structures, not alternate grading policies. Keep these formats and the score snapshot's `scoringVersion: "points_v1"` tag. The removed toggle was on the assignment, not on versioned result data.

`scoreObjectiveSubmission` validates objective report counts and occurrence correspondence, then creates the score without changing correctness evidence. The pure scorer requires exactly one outcome per allocation:

- `correctness`: award the fraction established by the objective evaluator.
- `full_credit`: award the full allocation after the caller verifies the entire response. Future proof callers must include unused steps in that decision.
- `needs_review`: keep earned points null rather than zero. Any unresolved occurrence makes assignment earned points and percentage null while retaining known item scores for authorized review.

Missing/duplicate/foreign identities fail rather than disappear from the denominator. Legitimate zero grades remain distinct from unresolved review. Instructor adjustments and proof evaluation remain later branches; do not enable proof submission before usable review exists.

Student grade-release rules gate both correctness and points. Before finalization or while grades are withheld, the student score is null. Answer reveal remains independent. Authorized instructor final review includes frozen scores regardless of student release. Completion/private work stays score-free.

## Pre-launch data and migration

Apply migrations before running matching API/frontend packages. `Migration20261029160000` is retained as migration history; `Migration20261030120000` removes its obsolete assignment scoring toggle, fills missing occurrence allocations with 10, and makes allocations non-null with bounded defaults. Explicit allocations and existing scored snapshots are preserved.

The new migration refuses an existing submitted graded attempt without a score. It does not invent official grades by regrading retained submissions or delete data. For disposable pre-launch data, use a fresh database as described in [local database setup](../development/local-database.md#pre-launch-scoring-reset). This change does not reset the user's development database automatically.

Database constraints enforce occurrence bounds and basic score-row state/version. Application validation enforces cross-row correspondence and required final scores. Existing immutable-final triggers protect scores; future adjustments belong in separate records. Migration rollback restores the earlier schema, but older applications still require compatibility review.

## Verification — October 30, 2026

`npm run check` passed type checks, 963 tests (104 engine, 632 API, 227 web) and production builds. `npm run db:test` passed 212 PostgreSQL checks (155 database, 57 API/workflow), covering defaults/constraints, migration preservation/refusal, schema comparison, authoring weights/replacement, final scoring/redaction, frozen retries, review, duplication and normal/demo boundaries. Formatting and whitespace checks passed. Focused reruns passed all four scoring integration cases and 18 assignment-editor tests, including preservation of a nondefault weight through reordering.

No browser walkthrough, weight-control UI, instructor adjustment endpoint or user development-database reset/migration is claimed. Only disposable test databases were migrated. Existing Jest VM-module advisories remain.
