# Instructor-authored conceptual questions

Status: in progress on `017-feat-conceptual-questions`, October 29, 2026. Results release (`015`) and biconditional support (`016`) are merged. This feature precedes the UI/visual audit and initial portfolio sandbox. Slice 1 stages conceptual contracts/validation; existing authoring, persistence entity types and student routes still accept truth tables only until the workflow slices wire the union safely.

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

## Definition and disclosure decisions — October 29

- Type tags: `true_false` and `multiple_choice`, each with `definitionVersion: 1`. They remain variants of existing problem definitions, not separate ownership/publication entities.
- Initial bounds: question text 1–2,000 characters; 2–6 choices, each 1–500 characters; optional nullable explanation up to 5,000 characters. Trim text before validation. Reject duplicate option IDs and exact duplicate trimmed labels; preserve option order. Case-distinct labels remain possible.
- Option IDs are UUIDs created once per option and normalized to lowercase. Reordering or editing text retains the ID; replacing an option uses a fresh ID. The single `correctOptionId` must reference a current option. True/false requires an explicit boolean key, including false.
- Responses are type-specific: `{ type: 'true_false', answer: boolean | null }` or `{ type: 'multiple_choice', optionId: UUID | null }`. Null means unanswered; false is answered. Reject mismatched answer types and selections not present in the pinned definition. Omission of an entire item means unanswered; explicit response objects require their value field.
- User decision: explanations appear **only with authorized answer reveal**, never ordinary question content, draft-save responses, transient correctness checks or grade release by itself. Correctness can still reveal a binary answer by inference; that existing limitation applies here too.
- Student content is an explicit projection of question/type/version/options. It never spreads the authored definition, key or explanation. Instructor authoring/review retains appropriate privileged access.

## Persistence and snapshot compatibility

Keep definition JSON in the existing Problem/ProblemVersion JSONB fields. Publishing freezes type, question, option identities/order/text, key and explanation; later edits cannot alter an assigned snapshot. Slice 1 does not widen the active database entity or route definition union, so new questions cannot accidentally reach formula-only handlers before type dispatch/redaction is ready. No migration or data rewrite is needed for these staged contracts.

The workflow slice will extend saved answer JSON by assignment-item identity: retain existing truth-table arrays unchanged, and store tagged conceptual answer objects for conceptual items. Do not encode conceptual selections as fake rows/columns or infer their type from editable labels. Preserve revision/conflict handling and immutable submitted attempts.

Keep historical `truth_table_v1` and `completion_v1` snapshots readable and unchanged. For assignments containing conceptual items, introduce explicitly versioned mixed results: typed per-item feedback and a correctness summary for graded work, and completed/total response-unit counts without correctness for completion-only work. Each truth-table cell remains one response unit; each conceptual question contributes one unit. No partial credit within a conceptual question. Result format contracts and database types must land together with evaluation/projection before enabling these assignments; no silent conversion or regrading of historical finals. Private practice creates no final result and stays excluded from instructor review.

Do not expand this branch into repeat submissions, option shuffling, rich text or exam security.

## Assessment limitation

These questions broaden assessment beyond mechanical table completion; they do not guarantee independent work or prevent external assistance. Controlled assessment remains a separate [Safe Exam Browser investigation](controlled-assessment.md).

## Slice 1 verification — October 29

`npm run check` passed type checks, 843 tests (104 engine, 543 API, 196 web) and production builds. The 27 foundation tests cover valid/invalid keys, field/option limits, normalized UUID identity, reordering/text edits, unknown/mismatched responses, null versus false, strict student redaction and independent response allocations. Existing truth-table contracts remain unchanged and reject these staged question types on active routes. Formatting, whitespace and local Markdown targets checked. No database/browser tests were run for this contract-only foundation; no migration, active endpoint acceptance, grading or UI controls were added in this slice.
