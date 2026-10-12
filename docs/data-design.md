# LogicLab — Data Design

Initial direction · October 12, 2026

This document records the agreed storage direction and reusable problem library. It complements [Product Direction](product-direction.md) and the [Implementation Plan](initial-implementation-plan.md). It is a conceptual model, not a finalized database schema or migration specification.

## Core decisions

- Instructors have a reusable problem library. A problem can appear in multiple problem sets; the first interface may create problems while composing a set.
- Keep problem definitions, assignment policy, and student work separate because they have different owners and lifecycles.
- Save a formula and exercise configuration, then generate its truth table. Do not store a duplicate complete table for every student.
- Store student answers separately from definitions and reference the exact problem version used.
- Assigned work uses immutable problem versions. Editing a problem creates a new version rather than changing the meaning of existing attempts.
- Independent practice uses the same exercise model without an assignment. Instructor access comes through their assignments, not through unrestricted access to a student's records.

Library reuse does not imply a publicly shared library or permission to browse another instructor's problems. Library sharing and ownership transfer remain undecided.

## Proposed records

Names and fields below are provisional; introduce them as persistence is needed rather than creating every table upfront.

| Record | Responsibility |
| --- | --- |
| Problem | Stable identity, creator/owner, title, exercise type, and current version reference |
| Problem version | Immutable exercise definition and its definition-format version |
| Problem set | Instructor-owned collection of problems |
| Problem-set item | Reference to a specific problem version, with its position in the set |
| Assignment | Problem set, recipients, dates, and practice/graded, feedback, and solution-access policy |
| Attempt | Student work against a particular problem version, with assignment context when applicable, status, timestamps, and grading result |

A problem has multiple versions. Multiple set items can reference the same version, enabling reuse. Attempts must retain enough context to identify the assigned item when a problem appears more than once or is reused across assignments; a problem ID alone is insufficient.

## Truth-table definitions and answers

Store the authored formula, variable order, and which expression columns students must complete. Generate variable combinations and expected answers with the logic engine.

Illustrative definition, not the final API/storage contract:

```json
{
  "type": "truth_table",
  "definitionVersion": 1,
  "formula": "(P ∧ Q) → R",
  "variableOrder": ["P", "Q", "R"],
  "answerColumns": ["P ∧ Q", "(P ∧ Q) → R"]
}
```

`definitionVersion` identifies the data format; it is distinct from a problem's content revision. The final representation needs stable column identifiers rather than display text. Specify a deterministic row order and stable cell addressing so saved answers continue to map to the same cells.

An attempt stores the student's T/F entries, preserving blanks distinctly from false. Given variable values and correct answers are derived, not student-authored data. Checking and grading occur on the backend for assigned work. Student-facing responses expose solutions and feedback only when the assignment policy permits them; a shared schema does not mean every stored field is sent to the browser.

## Versioning and publication

When an instructor edits a problem, existing assignments and attempts continue to reference their original version. New work can select the new version. Updating a library problem must not silently update every set that reuses it.

Published set membership, ordering, and assignment settings also need change rules so student work remains interpretable. Whether to snapshot published sets or introduce set versions is still open. Define those rules before implementing assignments.

Engine/parser changes can also affect historical interpretation. Decide how to preserve reproducibility, such as retaining an engine/grammar version, before relying on saved definitions for graded work.

## Storage direction

Use PostgreSQL relational columns, foreign keys, and constraints for identity, ownership, relationships, status, and timestamps. Use validated `JSONB` for exercise-specific definitions and potentially answer payloads. Validate the payload shape by exercise type and format version; JSONB is not a substitute for validation or authorization.

Derivations will eventually need premises, a conclusion, and a proof-system identifier in their definitions, with proof lines in student answers. Their exact representation depends on the chosen axioms/rules and is deferred.

Local PostgreSQL will run in Docker, with documented DBeaver connection settings. No migrations or database setup are required for the current truth-table vertical slice.

## Remaining decisions

- Class versus individual assignment targets and the related membership model.
- Library organization, search, sharing, copying, and archive/deletion behavior.
- Published problem-set snapshots or versions, and allowed assignment-policy changes.
- Stable expression/row/cell identifiers, grammar versions, and complexity limits.
- Attempt counts, autosave, submission finality, retries, grading, and retained grading evidence.
- Whether independent practice is persisted, and whether anonymous practice exists.
- Data retention and how archived problems remain available to historical submissions.

Resolve these when their workflows enter scope. Keep this document current as decisions become concrete; use separate architecture decision records only when a consequential choice needs its alternatives and rationale preserved.
