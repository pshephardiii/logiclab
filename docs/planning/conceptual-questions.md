# Instructor-authored conceptual questions

Status: agreed near-term feature direction, recorded during QA on October 27, 2026. Implement on a separate feature branch after the current QA work, before undertaking derivations. No implementation starts in the QA branch. Keep the audit/deployment follow-ups visible; decide the exact ordering when QA closes.

Provisional branch: `017-feat-conceptual-questions`, following the currently planned 015 audit / 016 deployment numbers. Confirm the next unused number against branch/PR history when starting; this note does not create or start a branch.

## Teaching goal and initial scope

Let instructors assess conceptual understanding without requiring a new logic reasoning engine. For example: “A proposition false under every interpretation is a tautology, contradiction, or contingency?” The instructor supplies the correct answer; LogicLab validates the question structure and compares student responses to that key, rather than verifying the instructor's logic.

Support initially:

- **True/false:** plain-text question and one instructor-selected correct truth value.
- **Single-answer multiple choice:** plain-text question, a bounded list of plain-text options, and exactly one correct option.
- An optional instructor explanation released through the existing assignment feedback/solution policy rather than included in unreleased student content.

Leave multiple correct answers, partial credit, rich text/media, randomized options and automated question generation outside this branch. Derivations remain a separate later problem type. Keep independent truth-table practice working.

## Fit with the existing model

Use the existing Problem → immutable published ProblemVersion → AssignmentItem structure, extending the discriminated problem definition and student answer formats for each type. Do not force choice questions into truth-table formula/cell fields or create separate ownership/publication systems.

Published versions freeze the question, options, key and explanation. Later draft edits must not alter an assigned version's grading. Multiple-choice options need stable identifiers; save selections by identity rather than by editable labels or array position. Distinguish an unanswered true/false item from a false answer.

The backend must validate definitions and responses, enforce owner/enrollment/workspace access, and grade from the stored version's answer key. Ordinary student question and draft-save responses must omit the key and unreleased explanation. Apply existing feedback/solution-release rules on every disclosure path; hiding UI alone is insufficient.

Carry the types through graded, completion-only and private-practice workflows deliberately. Completion measures whether a required question is answered, independently of correctness. Preserve explicit saves, revision/conflict handling, unsaved-work protection, immutable final results and private-draft exclusions from instructor review. Assess result-format/backward-compatibility changes before altering stored snapshots.

## Suggested small slices

1. Define type-specific contracts, persistence representation and version/snapshot compatibility. Test valid/invalid keys, stable option identity, unanswered versus false and unchanged truth-table data.
2. Add type-specific server validation, grading, response redaction and policy handling through existing authoring/student/review flows. Test authorization and normal/demo isolation as well as grading.
3. Add instructor editors/previews and student choice controls with explicit save/check/submit behavior, accessible labels, retained inputs after failures and unsaved-work protection. Support mixed-type assignments.
4. Add a small synthetic demo example if appropriate; verify all supported modes, published-version immutability, feedback/solution release, instructor review and existing truth-table regressions. Update setup/API/QA evidence and prepare the local PR draft.

Before implementation, settle the option-count/text limits, how explanations appear for each feedback policy, and the result-format transition. Do not silently expand scope into attempt retries, option shuffling or an exam-security feature.

## Assessment limitation

These questions broaden assessment beyond mechanical table completion; they do not guarantee independent work or prevent external assistance. Controlled assessment remains a separate [Safe Exam Browser investigation](controlled-assessment.md).
