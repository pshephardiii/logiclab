# Instructor-controlled results release

Status: agreed future feature branch, October 28, 2026. Provisional name: `019-feat-instructor-results-release`; verify the next unused number and priority before starting. This feature branch must be completed and verified before initial deployment, including the initial public demo deployment. Its provisional number does not imply it comes after the currently numbered deployment branch. Resolve the answer-key release decision within this branch before implementation is finalized. No instructor-release functionality or new release policy is implemented by this planning note.

## Problem and agreed direction

The current authoring UI mixes official result timing with pre-submission practice checks. Additional explanatory copy did not resolve the instructor's confusion. Redesign these concepts in a dedicated branch rather than silently changing saved assignment policies during QA.

For graded and completion-only assignments, the intended official-results choices are:

- **At submission:** results become available after final submission.
- **When the instructor releases results:** retain results privately after submission until an authorized instructor explicitly releases them, for example after all students have submitted.

Completion-only results remain score-free: completion status must not silently become a correctness grade. Decide separately whether and when such assignments offer practice assistance before submission. Ungraded practice has no final submission or official grades; its checking/reveal controls should be described as practice assistance, not official results timing.

This is a future direction, not an assertion that both choices are currently supported.

## Current QA decision: preserve behavior

Graded feedback is already restricted to `on_submission`; keep that control locked and label its sole option **At submission**. Do not introduce a selectable instructor-release option before server-side enforcement exists.

The user explicitly deferred completion-only policy changes after clarification. Completion-only currently supports `on_check` or `immediate`, not `on_submission`. Keep those behaviors and existing saved/published policies unchanged in the QA branch; do not display a false At submission value, coerce policies on read/save, backfill assignments or weaken database checks to simulate the requested model. Implement submission-only completion policy deliberately in this future feature branch.

Existing solution-access choices remain unchanged for now. Graded feedback timing being fixed does not currently prohibit Anytime solution access; the future branch must settle that interaction rather than imply a new restriction is already enforced.

## Open decision: release grades and answers together?

Before implementation, decide whether an instructor release:

1. Always releases correct answers/explanations alongside grades or completion status; or
2. Can release grades/completion status while keeping the answer key hidden, with a separately controlled answer release.

No choice has been made. Consider whether per-cell correctness itself effectively reveals a binary answer, what completion-only should disclose, and how the controls are explained to instructors/students. Distinguish acknowledging receipt of a submission from disclosing results or answers.

## Implementation boundaries

- Store final results independently of their release state. Submission may compute/persist a frozen result while student-facing responses withhold it until authorized release.
- Enforce withholding on every relevant server response: submission, attempt reads, summaries, checking/solution endpoints and any progress views. UI hiding alone is insufficient. Retain ownership, enrollment and normal/demo isolation.
- Add an explicit owner-authorized, idempotent release action and durable release metadata. Decide whether release is assignment-wide, how late submissions are treated, what happens after archive/restore, and whether release can be reversed once students have seen results. Do not assume all-students-submitted detection or automatic release is in scope.
- Define a student submitted-but-unreleased state that confirms work was received without exposing withheld grades, correctness, counts, answers or explanations. Keep final work immutable and instructor review available under its existing authorization.
- Specify policy defaults, published locks, compatibility and migration/backfill for existing data. Preserve historical result snapshots and avoid retrospectively withholding results already released under old behavior.
- Keep practice assistance, official results release and answer-key disclosure conceptually clear even if some controls are combined after the open decision. Preserve existing ungraded practice unless explicitly changed in that design.

## Suggested slices and verification

1. Settle release/answer-key semantics, completion-only/practice assistance behavior and late-submission rules; document contracts and compatibility.
2. Add persistence and policy support, preserving existing assignments, with migration and rollback tests.
3. Add server withholding/release workflows and tests for every disclosure path, owner/enrollment/isolation, concurrent submission/release, idempotency and archived work.
4. Add instructor release controls and student pending/released views with readable terminology and recoverable failures; test normal/demo flows and update fixtures deliberately.
5. Verify old/new assignments, score-free completion and private practice, then update runbook/evidence and prepare the local PR draft.

Delaying result disclosure can reduce answer sharing through LogicLab; it cannot prevent external solvers or assistance. The separate [controlled assessment investigation](controlled-assessment.md) still applies.
