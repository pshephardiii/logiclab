# Biconditional and tilde notation

Branch: `016-feat-biconditional-support`. Started October 29, 2026.

## Grammar decisions

- Accept Unicode `↔` and contiguous ASCII `<->`, represented by binary AST operator `iff`. Evaluate true exactly when both operand values agree.
- Precedence, tightest to loosest: negation, conjunction, disjunction, implication, biconditional. Existing conjunction/disjunction left associativity and implication right associativity are unchanged.
- Reject ungrouped repeated biconditionals with a positioned grouping hint. Explicit parentheses/square brackets permit either nesting. Do not silently choose a convention for textbook chains.
- Accept `~` as an alias of `!`/`¬`. Keep the existing negation node and canonical `¬` label. Preserve all existing structural identifiers, variable/length/nesting bounds and matching-delimiter rules.

## Slices

1. Shared engine: tokenizer, AST, precedence/grouping parser, evaluator, canonical truth-table columns and focused regression tests. Update the engine grammar documentation. No database change.
2. Carry the notation through API validation/preview/check/submission tests and browser guidance/local validation tests. Update the keyboard guide, public help and QA examples together; do not claim those integration checks from the engine slice alone.
3. Verify the branch, document evidence/limitations and prepare local PR notes. Follow with conceptual questions, then the UI/visual audit and portfolio sandbox.

This branch does not implement derivation rules or alter existing published content, saved answers, release policy or grading snapshots.

## Slice 1 verification — October 29

All 104 engine tests passed, along with engine typechecking and build. Existing parser/evaluator/table tests remain in the suite, with explicit new cases for both aliases, precedence, grouped/rejected chains, positioned malformed input, equality truth values, canonical IDs, intermediate-column ordering and existing resource bounds. Formatting and whitespace checked. No API/UI/browser or PostgreSQL verification in this slice; those integration checks follow separately.
