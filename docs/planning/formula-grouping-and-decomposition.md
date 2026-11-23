# Formula grouping and decomposition

Status: in progress on `036-feat-formula-grouping-and-decomposition`. Branch 035 is merged. The first slice adds source-derived grouping metadata without changing current evaluation/validation behavior. Later behavior and compatibility decisions below are still planned.

## Shared author intent

Explicit grouping must constrain formula construction and rule application consistently in truth trees, derivations and truth tables. Parentheses and square brackets express the same boundaries. The current parser discards grouping nodes and uses precedence/associativity to build a binary AST; the current display makes that inferred structure explicit. Branch 035 does not change those semantics.

Preserve a distinction between author-entered boundaries and parser-imposed association. Redundant grouping around an atom, such as `(P)`, need not impose another operation. A group may itself contain an ungrouped chain: in `(P ∨ Q ∨ R) ∨ S`, the outer disjunction is fixed, but the chain inside the left group remains flexible.

Apply the policy to actual formula fields throughout anonymous practice, instructor statements/references, generated tree sources and student proof/tree entries, under normal/demo scopes. Do not parse free-text conceptual questions or explanations as formulas.

## Agreed formula behavior

| Input             | Intended behavior                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `P ∨ Q ∨ R ∨ S`   | Ungrouped disjunction chain; allow a split at any connecting disjunction.                                                    |
| `(P ∨ Q) ∨ R`     | Explicit outer split into `P ∨ Q` and `R`; respect the left group.                                                           |
| `P ∧ Q ∧ R ∧ S`   | Ungrouped conjunction chain; allow individual conjunct extraction in truth trees.                                            |
| `(P ∧ Q) ∧ R`     | First decompose into the grouped conjunction and `R`; do not extract `P` across the boundary.                                |
| `(P ∧ Q) ∧ R ∧ S` | The grouped conjunction is a unit of the outer chain; its internal conjuncts require their own decomposition.                |
| `P ∨ Q → R ∨ Y`   | Reject new input relying on mixed-operator precedence; request `(P ∨ Q) → (R ∨ Y)`, or another explicitly intended grouping. |
| `P ∧ Q ∨ R`       | Require grouping that identifies the intended main operator.                                                                 |
| `¬(P ∨ Q)`        | Retain the negated-disjunction rule; do not apply positive-chain shortcuts through negation.                                 |

Negation continues binding directly to the following atom/group. Homogeneous-chain shortcuts are specifically for conjunction/disjunction; they do not authorize reassociation of conditionals or biconditionals. Settle any additional chained-operator restrictions explicitly before changing validation. Alias spelling (`&`, `^`, `∧`; `v`, `|`, `∨`) must not change the grouping policy.

## Method-specific consequences

### Truth trees

For an ungrouped conjunction, allow the student to extract an individual conjunct without copying a long remainder. If the branch then closes, unused conjuncts need not be entered. An open path cannot qualify as a completed counterexample until every required conjunct and subsequent compound decomposition is accounted for. Track partial versus complete source use per path, including repeated conjuncts, explicit grouped conjuncts and formulas inherited across forks. A single extraction must not prematurely mark a conjunction fully decomposed.

For `P ∨ Q ∨ R ∨ S`, allow two-child alternatives `P | Q ∨ R ∨ S`, `P ∨ Q | R ∨ S`, or `P ∨ Q ∨ R | S`. Preserve every disjunct and their order. Each resulting compound remains subject to decomposition. Do not silently drop an alternative, distribute mixed operators or flatten across explicit grouping boundaries. Existing negative, conditional and biconditional rules retain their exact obligations unless separately specified.

### Derivations

Apply the same grouping boundaries to statements and rule matching. Direct extraction from an ungrouped conjunction must be an explicitly modeled rule variant/permission, not a silent relaxation of every existing conjunction-elimination rule. Keep the curated catalog, effective labels, instructor rule selection, scope/dependency/discharge checks and feedback timing authoritative. Support both enabled Fitch and dependency formats. Preserve retained natural-deduction tree history without re-enabling new work for that method.

### Truth tables

Explicit grouping determines the intermediate expression structure/columns. An ungrouped chain still needs a deterministic construction policy; retaining left-to-right intermediate columns is a candidate, not an author-imposed boundary. Settle the visible columns and interaction before implementation. Preserve stable occurrence/column identities or deliberately version their replacement; do not equate a display simplification with permission to reinterpret retained answers.

## Implementation boundaries and compatibility

- Retain grouping/source-span information alongside the semantic representation, or use an equivalent explicit syntax representation. Do not infer author intent from a binary AST after parentheses have been discarded.
- Keep formula meaning/equality, author grouping constraints and display formatting separate. Decide where associative equivalence is permitted rather than globally replacing structural equality with logical equivalence.
- Derive/check syntax metadata from the authoritative formula text on the server. Pin the instructor's original constraints with published definitions; a student must not bypass them by removing parentheses or submitting invented metadata. Student-created assumptions/inferences also need a defined grouping policy.
- Audit current definition/checker/catalog/report versions, reference publication checks, student payloads, completion tests and partial-use markers. Version changed obligations where needed; existing fixed binary expansion/result shapes must not be stretched without validation.
- Resolve existing published definitions, saved work and immutable results before rollout. Do not silently reinterpret or regrade them. Decide on versioned retention versus a documented, explicitly authorized disposable-data reset; this plan does not authorize deleting a database.
- Apply consistent display/help and actionable grouping errors across all formula entry points. Highlight the relevant part without exposing correctness before the configured check/submission/release point.
- Keep explicit save/check/submit, instructor grading/release, answer privacy, normal/demo isolation, resource bounds and unsaved-work protection intact. No proof search, arbitrary custom rules, predicate logic or general equivalence rewriting.

## Suggested implementation slices

1. Inventory formula entry points/identities and settle the syntax representation, compatibility policy, mixed-operator restrictions and truth-table column convention. Add contract/parser cases for explicit boundaries versus implicit chains.
2. Implement shared syntax metadata and authoring validation without changing retained evaluation meanings. Preserve aliases, positions and grouping delimiters; add bounded parsing and round-trip coverage.
3. Implement versioned truth-tree extraction/partition checks and per-path completeness. Cover early closure, unfinished open paths, partial expansions, duplicates and regrouped results.
4. Integrate permitted derivation behavior and truth-table columns under the agreed policy; update authoring/publication/assigned evaluation and retained reads as needed.
5. Refine formula display and construction controls, refresh demo fixtures where necessary, and verify cross-method journeys. Split the branch further if these changes exceed a reviewable scope.

Acceptance examples must cover both explicit and omitted grouping, mixed operators, negation, repeated conjuncts/disjuncts, compound members, invalid shortcuts, API privacy, immutable retries and resource boundaries. A complete valid tree plus correct selected verdict still earns full automatic credit; other graded outcomes remain reviewable. Completion-only work remains score-free with finished-attempt requirements and verification flags.

## Following sequence

After this feature, run a brief practice UI scan, add explicit practice-only exposure guards, then prepare the inexpensive hosted practice sandbox. Full account/demo/instructor/student/billing workflows remain local until their UI audits are ready. Follow with a separate portfolio project. See the [practice-first release plan](practice-first-release.md), including deliberate promotion from main to a deployment branch. Keep later numbers unassigned. No exposure guard, deployment branch or infrastructure is created by this slice.

## Slice 1 — source-derived syntax foundation

Added `parseFormulaWithSyntax`, `parseProofFormulaWithSyntax` and `parseTruthTreeFormulaWithSyntax` alongside the existing entry points. Each returns the original source, the unchanged semantic formula and a node-identity map of half-open UTF-16 source spans, operator positions and explicit group ranges/delimiters in inside-out order. Parentheses around atoms are retained as syntax without creating an AST operation. The map is engine-derived runtime data, not a new transport contract, persistent ID or trusted student field.

No existing caller switches to stricter validation in this slice: mixed operators still follow current precedence, conjunction/disjunction shortcuts are not enabled, and saved definitions/results are not rewritten or regraded. Existing bounded parsing, aliases, structural equality and column identifiers remain intact. The new metadata provides the distinction needed by the next policy/checker slices.

Validation: all 863 engine tests, the engine type check/production build and built root/proof/truth-tree public-export smoke passed. Formatting, whitespace and changed Markdown file targets passed. The 24 new cases cover AST identity/equivalence, every-node coverage, explicit versus implicit association, chains within groups, nested delimiter/source ranges, atom/negation/falsity metadata, shared proof/tree parsing, unchanged errors/positions/limits and table values/IDs. No database, API or frontend flow was changed.
