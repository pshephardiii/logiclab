# Assignment scoring

Status: slice 1 on `019-feat-assignment-scoring`. Contracts and pure calculations are staged; no live grade, database, route or UI behavior changes yet. This is the first dependency in the [derivation sequence](logical-derivations.md#agreed-implementation-sequence).

## Decisions for this branch

An instructor assigns a maximum number of points to each assignment occurrence, not the reusable problem/version. Repeated occurrences may have different allocations. Use positive whole-point maxima from 1 to 1,000, with a default of 10 for future authoring. At most 50 items gives a maximum assignment allocation of 50,000 points. Allocations are required explicitly in the scoring function; the default is not silently applied while parsing existing data.

Zero/fractional maximum allocations and extra credit are outside this initial policy. These are explicit MVP bounds, not a claim that all teaching rubrics require them. Existing active authoring contracts do not accept the new allocation fields yet.

Earned points have two decimal places at most. For objective questions, award the item's allocation multiplied by the fraction of correct response units. A truth-table cell is one unit within its problem; a conceptual choice is one unit within its problem. Incorrect/unanswered entries earn no portion for that unit. Problem maxima, rather than total cell/question counts, determine relative assignment weight.

For example, a 20-point table with half its cells correct earns 10 points; a fully correct 5-point question earns 5. The assignment total is 15/25, or 60%, regardless of the relative number of table cells and conceptual questions.

Round each item's earned points to the nearest hundredth, with ties rounded upward for these nonnegative values. Sum rounded item scores using integer hundredths, then calculate the total percentage rounded to two decimal places. Two 10-point items each one-third correct earn 3.33 + 3.33 = 6.66/20, or 33.30%. Totals deliberately agree with the displayed item scores rather than rounding an independent unrounded aggregate.

## Awarded scores versus correctness evidence

The staged `points_v1` score snapshot is separate from retained `truth_table_v1`, `mixed_v1` and completion reports. It contains an item ID, maximum allocation, grading status and earned points for each occurrence, plus an assignment summary. Its strict contract validates unique normalized UUID identities, bounds, earned/max relationships, total consistency, status consistency and percentage arithmetic.

The pure server scorer accepts authoritative per-occurrence outcomes:

- `correctness`: a bounded positive total and nonnegative correct count no greater than that total. Intended for the existing objective evaluators, not proof-line partial credit.
- `full_credit`: the caller has established that this problem receives its entire allocation. A future proof caller must verify the entire submission is accepted, including unused steps, before supplying this outcome.
- `needs_review`: earned points are null, never zero. Any such occurrence leaves assignment earned points and percentage null with `needs_review`, while retaining known individual scores for authorized review.

Require exactly one outcome for every allocation. Missing, duplicate or foreign identities fail rather than silently receiving a zero or disappearing from the denominator. Empty assignments and all-zero configurations cannot produce score snapshots. Legitimate completed zero scores remain distinct from unresolved grading.

`scoreObjectiveSubmission` is an explicit adapter for legacy/mixed graded evidence. It checks summary consistency, matches occurrence IDs and creates a separate score without modifying the original report. It rejects completion-only results and missing/private work. This function is not called by live submit/read paths in slice 1. No instructor adjustment endpoints or derivation evaluation are introduced here.

These types/functions do not authorize disclosure. Later student projections must apply the existing independent grade-release rules to scores and preserve privacy while review is unfinished. Correctness evidence and instructor-awarded adjustments must remain separately inspectable.

## Compatibility and next slices

Do not calculate new official point grades from old submissions on read. Existing published assignments and retained reports must preserve their existing meaning; completion-only/private practice stay score-free. Persist an explicit grading/scoring version before enabling points on live assignments, so legacy work can be distinguished from new point-scored work. No data migration or backfill is performed in slice 1.

Next, design/add assignment-item allocation persistence, scoring-version compatibility and matching database JSON types. Specify how old drafts opt into scoring, how duplication preserves/resets policy, and how new defaults are applied. Preserve published assignment locks and frozen final work; keep weight editing confined to mutable drafts. New scored finals should retain both the original evaluation evidence and their scoring snapshot, without silently recalculating either later. Current result/API unions remain unchanged until that compatible workflow lands.

Then add create/PATCH validation and instructor controls, wire authoritative final scoring/release projections, and verify old/new snapshots together. Future instructor review resolves pending grades separately from original checker findings; that adjustment workflow remains branch 023. Do not enable proof submissions before a usable review workflow exists.

## Slice 1 verification

`npm run check` passed type checks, 957 tests (104 engine, 626 API, 227 web) and production builds. The 31 new foundation tests cover point bounds/default policy, per-occurrence weighting, decimal/tie rounding, completed zero versus unresolved review, missing/duplicate/foreign identities, UUID normalization, aggregate/snapshot consistency, input immutability, opt-in legacy/mixed objective scoring and rejection of completion/private work. Active assignment/result contracts remain unchanged and reject staged score payloads. Formatting, whitespace and local Markdown file targets passed. No PostgreSQL or browser checks were run for these pure/staged changes; no migration, new persisted grade, route acceptance or authoring UI is claimed.

## Slice 2: persistence and legacy compatibility

`Migration20261029160000` adds three nullable fields with no defaults or backfill:

- `assignments.scoring_version`: null retains legacy grading; `points_v1` is the explicit future opt-in and is allowed only for graded assignments.
- `assignment_items.max_points`: null means no point allocation, not zero points; non-null integers must be 1–1,000. The value belongs to the occurrence, including repeated versions.
- `assignment_attempts.score`: a separate JSONB score snapshot beside the unchanged correctness result. It is allowed only on submitted graded-result rows with a recognized score-version tag. Pending review stores null earned points/percentage in the typed snapshot.

Named entity fields, scoring enum and database JSON interfaces match this representation. A compile-time/runtime compatibility check guards mutual assignability with the transport score contract. The existing final-submission trigger protects the new score column from updates, clearing or deletion; ordinary immutable final-work retention and narrowly scoped demo cleanup remain unchanged. Future instructor adjustments must remain separate from this original frozen snapshot.

The database checks enforce local bounds, assessment mode and basic score-row state/version; they do not replace the full shared score validator or enforce cross-row allocation/snapshot correspondence. Atomic parent/item validation, publication locks and required scoring at finalization belong to the next workflow slice. A manually written `points_v1` row is not a supported way to activate live scoring yet.

This slice deliberately leaves API request/result unions, persistence workflows and frontend behavior unchanged. Existing assignments/items/finals remain null in the new columns. New work also remains legacy through current routes until coordinated activation; no live submission is silently scored, and no final correctness JSON is recalculated or rewritten.

Rollback locks the three affected tables before checking for scoring data. It refuses whenever any scoring mode, allocation or score exists, including unpublished configuration, rather than dropping that data. A down/up cycle with only legacy rows preserves original fields and frozen JSON text. Application rollback still needs a compatibility review once point workflows are active.

Next: coordinate mutable-draft opt-in/defaults, create/PATCH/duplication semantics, publication checks and finalization/projection compatibility. Keep historical publications in legacy mode, require complete valid allocations for point-scored publication and apply the existing independent grade-release rules before exposing score data. Instructor controls follow the validated workflow.

### Slice 2 verification — October 30, 2026

`npm run check` passed type checks, 958 tests (104 engine, 627 API, 227 web) and production builds. `npm run db:test` passed 209 PostgreSQL checks (156 database, 53 API/workflow), including 17 new scoring persistence cases and existing schema/migration, retention, demo reset/cleanup and application workflows. Coverage includes null legacy fields, repeated-item allocations, pending snapshot round-trips, invalid bounds/modes/score states, immutable submitted scores, legacy down/up preservation and rollback refusal. Formatting, whitespace and local Markdown targets checked. No browser walkthrough, active scoring endpoint/UI change or user development-database migration is claimed; only disposable test databases were migrated. The snapshot was generated from entity metadata without a database connection and limited to the new columns/checks.
