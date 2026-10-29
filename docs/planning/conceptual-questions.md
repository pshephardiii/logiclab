# Instructor-authored conceptual questions

Status: in progress on `017-feat-conceptual-questions`, October 29, 2026. Results release (`015`) and biconditional support (`016`) are merged. This feature precedes the UI/visual audit and initial portfolio sandbox. Slice 1 stages conceptual contracts/validation; slice 3 enables private conceptual library authoring/publication. Slice 6 connects mixed student storage, grading and disclosure. Slice 7 adds student choice controls and final review. Slice 8 adds instructor editors/previews and enables conceptual assignment creation/selection. The per-slice notes below record the rollout state at that point; demo examples and final browser verification remain pending.

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

Keep definition JSON in the existing Problem/ProblemVersion JSONB fields. Publishing freezes type, question, option identities/order/text, key and explanation; later edits cannot alter an assigned snapshot. Slice 1 staged the contracts. Slice 2 widens the database definition union and ProblemType enum without changing JSONB columns or enabling new authoring/student routes. Formula-only callers explicitly narrow through a guard; unsupported definitions map to a sanitized HTTP 409 instead of reaching the engine or exposing authored keys. No migration or data rewrite is needed. Runtime authoring validation, grading and complete student projection must be wired before these definitions are enabled through the API.

The workflow slice will extend saved answer JSON by assignment-item identity: retain existing truth-table arrays unchanged, and store tagged conceptual answer objects for conceptual items. Do not encode conceptual selections as fake rows/columns or infer their type from editable labels. Preserve revision/conflict handling and immutable submitted attempts.

Keep historical `truth_table_v1` and `completion_v1` snapshots readable and unchanged. For assignments containing conceptual items, introduce explicitly versioned mixed results: typed per-item feedback and a correctness summary for graded work, and completed/total response-unit counts without correctness for completion-only work. Each truth-table cell remains one response unit; each conceptual question contributes one unit. No partial credit within a conceptual question. Result format contracts and database types must land together with evaluation/projection before enabling these assignments; no silent conversion or regrading of historical finals. Private practice creates no final result and stays excluded from instructor review.

Do not expand this branch into repeat submissions, option shuffling, rich text or exam security.

## Assessment limitation

These questions broaden assessment beyond mechanical table completion; they do not guarantee independent work or prevent external assistance. Controlled assessment remains a separate [Safe Exam Browser investigation](controlled-assessment.md).

## Slice 1 verification — October 29

`npm run check` passed type checks, 843 tests (104 engine, 543 API, 196 web) and production builds. The 27 foundation tests cover valid/invalid keys, field/option limits, normalized UUID identity, reordering/text edits, unknown/mismatched responses, null versus false, strict student redaction and independent response allocations. Existing truth-table contracts remain unchanged and reject these staged question types on active routes. Formatting, whitespace and local Markdown targets checked. No database/browser tests were run for this contract-only foundation; no migration, active endpoint acceptance, grading or UI controls were added in this slice.

## Slice 2 persistence and verification — October 29

The existing Problem/ProblemVersion definition type now includes named truth-table, true/false and multiple-choice variants. Database and transport conceptual shapes are checked for mutual assignability and JSON round-trip compatibility. No separate problem entities, tables or snapshot migration were introduced. JSONB is not itself a question validator: route contracts must validate keys/limits when authoring is enabled.

At slice 2, library, assignment and student formula paths used `requireTruthTableDefinition`; other definitions or format versions fail closed with `PROBLEM_DEFINITION_UNSUPPORTED`. Owner/enrollment checks still precede projection. A rejected publication or attempt operation rolls back fully; it does not create a partial version or attempt. Shared route mapping never includes the private definition or explanation.

`npm run check` passed type checks, 848 tests (104 engine, 548 API, 196 web) and production builds. `npm run db:test` passed 187 PostgreSQL checks (139 database, 48 API/workflow), including six new snapshot/immutability checks and unsupported-flow rollback/isolation coverage. Schema comparison remains unchanged. Formatting, whitespace and local Markdown targets checked. No browser run, conceptual API acceptance, grading or editor controls are claimed in this slice; type-specific server workflows follow next.

## Slice 3: private authoring and publication

The active Problem definition contract now includes all three definition types. Existing instructor routes validate conceptual keys and plain-text content without sending questions through the formula parser. Create/read/list/update/publication/history/archive/restore reuse the existing ownership, transaction and snapshot model. Invalid updates preserve the saved draft; retained versions freeze their original keys, option identities and explanations.

A small frontend compatibility guard renders conceptual definitions as instructor-only read views, prevents formula-form replacement and disables premature assignment selection. This is not the full conceptual editor. The assignment store also rejects conceptual version IDs transactionally, so direct client requests cannot bypass the staged restriction. Existing student paths continue failing closed; no conceptual grading, answer-save endpoint acceptance or student content disclosure is enabled by this authoring slice.

### Slice 3 verification — October 29

`npm run check` passed type checks, 851 tests (104 engine, 549 API, 198 web) and production builds. All 49 API PostgreSQL integration checks passed, including normal/demo create/edit/publish/history/archive/restore, unchanged snapshots after key edits, invalid-update rollback, role/ownership/cross-namespace denial and rejected assignment creation without partial drafts. UI tests verify conceptual records cannot be overwritten by the formula editor and unsupported publications cannot be added to assignments. Formatting, whitespace and local Markdown targets checked. No browser run, new migration, conceptual student saves/evaluation or full conceptual editor is claimed here. Next: typed answer/result formats and evaluation, then student/review workflow integration.

## Slice 4: typed responses and evaluation

New staged contracts represent saved responses by occurrence ID: legacy truth-table arrays remain unchanged, while conceptual values are tagged boolean/option-ID objects. The evaluator rejects foreign occurrence IDs, duplicate assigned IDs, mismatched response types and unknown options; null/omission is unanswered and false is a filled true/false response.

`evaluateAssignmentSubmission` and `evaluateAssignmentCompletion` dispatch across pinned definitions. Truth-table-only work returns the exact legacy `truth_table_v1` / `completion_v1` formats. Work containing conceptual items returns `mixed_v1` correctness results or score-free `mixed_completion_v1` completion results. A table cell contributes one unit; a conceptual question contributes one unit. Repeated occurrences are independent even if their published question is shared. Existing legacy evaluators remain reusable, preserving cell-reference and duplicate-cell validation.

Mixed correctness feedback contains only status/cell summaries, never keys or explanations. Completion validates filled responses without comparing conceptual answers with keys and stores only completed/total response counts. The new database types mirror these JSON formats, but active attempt fields/response unions and routes are not widened yet. No mixed results are persisted or exposed by this slice; assignment selection remains guarded until student saves/reads, finalization, review and release/redaction are wired together. This separation avoids enabling a question type before all student disclosure paths support it.

### Slice 4 verification — October 29

`npm run check` passed type checks, 877 tests (104 engine, 575 API, 198 web) and production builds. All 26 mixed-evaluation tests passed, including legacy result equality, repeated occurrence identity, mixed totals, null versus false, forged/unknown responses, invalid table cells, completion independent of correctness and exclusion of keys/explanations. Compile-time equality guards verify the staged database/contract JSON shapes match. Formatting, whitespace and local Markdown targets checked. No database integration or browser checks were repeated for these pure/staged format changes; no migration, active endpoint acceptance, new persisted final result or UI behavior is claimed. Next: wire mixed storage/finalization and student/review projections with release enforcement before removing assignment guards.

## Slice 5: per-item response dispatch and answer-reveal projection

`application/student-work/item-response.ts` now provides one type-specific entry point for save validation, transient checking and solution projection. Save validation returns parsed responses without calculating correctness; transient checks return statuses without keys or explanations. Conceptual solution contracts explicitly carry the pinned boolean/option identity and nullable explanation. Only the separate privileged solution projection returns those fields; its callers must enforce enrollment and answer-release permission first.

The existing student persistence store uses this helper for truth-table saves, checks and solutions after its existing authorization checks. This retains current HTTP shapes, revision/transaction behavior and solution-release enforcement. Tests compare legacy solution/check payloads with the existing engine/schema output and cover false/null, stable choice identity, malformed/foreign answers, strict solution fields and unsupported definitions.

This remains a deliberately bounded integration step: active student contracts, attempt fields, mixed result projection and assignment acceptance are not widened yet. Conceptual assignment selection remains guarded. Next, connect mixed student/review contracts and storage/finalization together, then remove those guards once every disclosure path supports conceptual work. No migration or new UI behavior is introduced here.

### Slice 5 verification — October 29

`npm run check` passed type checks, 897 tests (104 engine, 595 API, 198 web) and production builds. Fifteen new per-item tests cover save/check/solution separation and legacy payload equality. All 49 API PostgreSQL integration checks passed, including existing release, authorization/isolation and student work workflows. Formatting and whitespace checks passed. The checks required access outside the sandbox for local PostgreSQL and the native watcher regression. No browser checks or database-package suite were repeated; no migration, conceptual assignment acceptance or student choice UI is claimed in this slice.

## Slice 6: mixed student persistence, finalization and disclosure

Active attempt entity/transport unions now support tagged conceptual responses and mixed frozen results in the existing JSONB columns. Student reads project pinned questions/options without keys or explanations. Save/check operations dispatch by definition type and retain existing enrollment, assignment locks, revision checks, rollback and transient-check rules. Finalization dispatches to mixed evaluation, preserving exact legacy formats for table-only assignments. Completion-only work remains score-free and immediate; graded submit/retry/read results remain withheld until the independent grade-release policy permits them.

Authorized solutions now return the pinned conceptual key and nullable explanation. Releasing grades never releases that payload; revealing answers never releases a pending grade. Instructor final-review contracts support both formats without exposing practice drafts. Historical snapshots are not converted or regraded, and no migration is needed.

Assignment creation and browser problem selection remain guarded until conceptual choice controls are implemented. The student browser explicitly refuses conceptual work for now, rather than replacing responses with table maps; small compatibility changes keep legacy tables and mixed summaries type-safe. Tests pin fixtures directly to exercise the server independently of this intentional rollout guard. Next slice: student choice editing/save/check/reveal and instructor review controls, then enable assignment acceptance when the complete flow is ready. Full instructor authoring editors and demo examples remain subsequent work.

### Slice 6 verification — October 29

`npm run check` passed type checks, 900 tests (104 engine, 595 API, 201 web) and production builds. PostgreSQL checks passed: 139 database tests plus all 52 API integration tests. New HTTP/database coverage exercises mixed saves and invalid-response rollback, false versus null, independent repeated occurrences, revision conflicts, retained final/retry results, both release orders, pinned keys after draft edits, completion independent of correctness, private practice exclusion, demo save/final/review and normal/demo/cross-visitor denial. Three browser-unit checks cover explicit unsupported-choice handling and mixed summary/table-feedback compatibility. Formatting and whitespace checks passed. No real-browser walkthrough or new migration is claimed; assignment acceptance and conceptual browser controls remain guarded.

## Slice 7: student choice controls and instructor final review

Student assigned work now renders true/false and single-choice questions using labeled native radio groups, alongside existing tables. Option identity drives selections; false remains filled and Clear answer produces explicit null. Choice drafts and saved baselines remain separate from table maps, while dirty-work protection aggregates both. Changing problems preserves local edits. Successful saves advance only that occurrence's baseline; failures retain inputs and protection. Completion readiness counts all cells and conceptual occurrences, independently of correctness.

Manual and debounced immediate checking use the existing cancellation/late-result guards. Feedback uses textual Correct/Incorrect/Unanswered signals plus symbols; immediate blanks stay neutral. Explicit saving and final confirmation remain required. Authorized solutions display the pinned answer text and optional explanation without overwriting entries; hiding solutions removes the explanation. Pending grades expose no conceptual status, and final submissions are read-only. Instructor review renders frozen conceptual selections/statuses alongside mixed summaries, with no editable controls or automatic solution/explanation fetch.

Assignment creation/selection remains guarded for this bounded frontend slice. Next: instructor conceptual editors and previews, then coordinated enablement of mixed assignments. Synthetic demo additions and full workflow/browser verification follow. No API, database or migration change is introduced here.

### Slice 7 verification — October 29

`npm run check` passed type checks, 919 tests (104 engine, 595 API, 220 web) and production builds. Frontend tests cover stable option identity, independent blanks/false, mixed table/choice baselines and completion readiness, explicit saves and failed-save retention, Stay with dirty choices, latest-snapshot debouncing/manual bypass, late-response cancellation, solution show/hide without overwriting entries, pending-grade redaction and read-only final review. Formatting and whitespace checks passed. No real-browser walkthrough or database suite rerun was performed for these frontend-only changes. Native keyboard/focus behavior and mobile visual review remain for the later browser/QA pass; conceptual authoring/assignment enablement and demo fixtures are still pending.

## Slice 8: instructor editors, previews and assignment enablement

The library editor now creates/edits all three types. Conceptual controls require an explicit true/false key or one keyed option, bound question/option/explanation text, validate shared contracts locally, and retain edits on failure. Option text/moves preserve UUIDs; removing a selected option clears the key, and new options receive fresh IDs. The editor retains local values across type switches, while only the selected definition contributes to saving/dirty comparison. Archived drafts remain read-only. Conceptual previews reuse the student question controls with local state and an explicit preview answer toggle; they create no student work and show explanations only on request. Published-version previews use the immutable snapshot rather than the open edited draft.

The server's temporary truth-table-only assignment guard and the picker restriction are removed together. Create/update/publication accept validated supported definitions with existing ownership, coverage, policy and snapshot checks. Repeated occurrences receive independent item identities. Tests cover normal/demo authoring through assignment creation, replacement with retained versions, publication and redacted student read/finalization. Student controls and mixed persistence/release were completed in slices 6–7.

Next: synthetic conceptual demo examples/template upgrade and focused end-to-end browser verification, followed by final branch checks and PR notes. No migration is needed; old truth-table snapshots and final results remain unchanged. A rollback to older application code cannot read new conceptual definitions/mixed results and must be coordinated.

### Slice 8 verification — October 29

`npm run check` passed type checks, 926 tests (104 engine, 595 API, 227 web) and production builds. All 52 API PostgreSQL integration checks passed. New/updated frontend coverage exercises explicit false keys, option identity through text/moves/removal, fresh replacement identities, duplicate-label validation, option bounds, type-switch retention, failed-save/archived behavior, unsaved-work protection, immutable version preview and conceptual assignment selection. Expanded database workflows cover normal/demo conceptual authoring through assignment create/update/publication and redacted student finalization. Formatting and whitespace checks passed. No real-browser walkthrough or database-package suite rerun was performed; no migration, seeded demo change or deployment is claimed. Focused browser journeys and final verification remain pending.
