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
