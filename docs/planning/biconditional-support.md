# Biconditional and tilde notation

Branch: `016-feat-biconditional-support`. Started October 29, 2026.

## Grammar decisions

- Accept Unicode `↔` and contiguous ASCII `<->`, represented by binary AST operator `iff`. Evaluate true exactly when both operand values agree.
- Precedence, tightest to loosest: negation, conjunction, disjunction, implication, biconditional. Existing conjunction/disjunction left associativity and implication right associativity are unchanged.
- Reject ungrouped repeated biconditionals with a positioned grouping hint. Explicit parentheses/square brackets permit either nesting. Do not silently choose a convention for textbook chains.
- Accept `~` as an alias of `!`/`¬`. Keep the existing negation node and canonical `¬` label. Preserve all existing structural identifiers, variable/length/nesting bounds and matching-delimiter rules.

## Slices

1. Shared engine: tokenizer, AST, precedence/grouping parser, evaluator, canonical truth-table columns and focused regression tests. Update the engine grammar documentation. No database change.
2. Carry the notation through API validation/preview/check/submission tests and browser guidance/local validation tests. Implemented in slice 2: updated keyboard guide/help, shared local validation cases, stateless and authoring HTTP coverage, and a persisted demo workflow across publication, assigned checking, graded and completion-only finalization. Public docs and QA examples reflect the grammar.
3. Verify the branch, document evidence/limitations and prepare local PR notes. Follow with conceptual questions, then the UI/visual audit and portfolio sandbox.

This branch does not implement derivation rules or alter existing published content, saved answers, release policy or grading snapshots.

## Slice 1 verification — October 29

All 104 engine tests passed, along with engine typechecking and build. Existing parser/evaluator/table tests remain in the suite, with explicit new cases for both aliases, precedence, grouped/rejected chains, positioned malformed input, equality truth values, canonical IDs, intermediate-column ordering and existing resource bounds. Formatting and whitespace checked. No API/UI/browser or PostgreSQL verification in this slice; those integration checks follow separately.

## Slice 2 verification — October 29

`npm run check` passed type checks, 816 tests (104 engine, 516 API, 196 web) and production builds. All 47 API PostgreSQL integration checks passed, including authored ASCII/Unicode snapshots, preview ID equivalence, rejected ambiguous edits without mutation, practice checking without attempt creation, graded scoring, score-free completion, assigned solutions and frozen final-result retries. The frontend uses the shared parser for valid grouped formulas and disabled creation/grouping hints for ambiguous chains; the keyboard guide now displays both inputs. Formatting, whitespace and local Markdown links checked. No database migration or browser walkthrough in this slice; focused browser/final branch verification follows separately.
