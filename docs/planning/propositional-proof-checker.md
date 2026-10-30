# Propositional proof checker

Status: first slice of `020-feat-propositional-proof-checker`. The user confirmed a classical propositional catalog with separately selectable rules. This slice declares version-1 rule identities, suggested labels and citation arities, and adds structural equality for existing parsed formulas. Exact variants below are the concrete specification for review before their application checks are implemented.

No proof-validation entry point, proof serialization contract, contradiction parser, authoring/student UI, grading operation or endpoint is enabled yet. A catalog entry is not an implemented checker or permission to use a rule. The [derivation plan](logical-derivations.md) remains the delivery sequence.

## Catalog and permissions

The public `@logiclab/logic-engine/proof` entry point owns `PROPOSITIONAL_RULE_CATALOG_VERSION = 1` and the immutable `PROPOSITIONAL_RULE_CATALOG`. Steps will cite stable rule IDs; labels/aliases never identify or enable rules. Instructor profile/per-problem permissions and effective labels will be pinned at publication in branch 021. Each listed classical rule remains independently selectable; enabling one does not enable the others or permit their direct citation. A student may still derive an equivalent principle using other permitted rules.

The categories core, derived and classical describe this chosen starting calculus, not a universal textbook taxonomy. “Core” is not mandatory permission. There are no arbitrary instructor-defined rules, axiom schemas or semantic-entailment escape hatches. Premise declarations and assumption openings are structural proof entries rather than selectable inference rules.

## Concrete version-1 variants

A, B and C below stand for arbitrary formulas. They are not literal propositional variables. Every formula match is structural after parsing. An application must use exactly its stated number of line and subproof references; no ignored extra citations. Line-reference order may be matched to the stated roles, rather than requiring the smaller displayed line number first. That does not license rewriting the cited formulas.

| Stable ID                      | Exact obligation                                                                                                                                                  | Line / subproof citations |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `reiteration`                  | From accessible A, repeat A.                                                                                                                                      | 1 / 0                     |
| `and_introduction`             | From A and B, infer A ∧ B. The two conjunct roles may be assigned to the cited lines in either order.                                                             | 2 / 0                     |
| `and_elimination`              | From A ∧ B, infer exactly A or B.                                                                                                                                 | 1 / 0                     |
| `or_introduction`              | From A, infer exactly A ∨ B or B ∨ A.                                                                                                                             | 1 / 0                     |
| `or_elimination`               | From A ∨ B, a closed A-assumption subproof ending C and a closed B-assumption subproof ending the same C, infer C. Discharge both assumptions.                    | 1 / 2                     |
| `implication_introduction`     | From a closed subproof assuming A and ending B, infer A → B, discharging that assumption.                                                                         | 0 / 1                     |
| `implication_elimination`      | From A → B and A, infer B. Suggested labels include Modus ponens and Conditional elimination.                                                                     | 2 / 0                     |
| `negation_introduction`        | From a closed subproof assuming A and ending ⊥, infer ¬A, discharging that assumption.                                                                            | 0 / 1                     |
| `contradiction_introduction`   | From A and ¬A, infer ⊥. The suggested Negation elimination label denotes this exact variant.                                                                      | 2 / 0                     |
| `contradiction_elimination`    | From ⊥, infer any formula A. Also called Explosion or Ex falso.                                                                                                   | 1 / 0                     |
| `biconditional_introduction`   | From A → B and B → A, infer A ↔ B. This variant cites conditional lines, not two subproofs directly.                                                              | 2 / 0                     |
| `biconditional_elimination`    | From A ↔ B, infer A → B or B → A. This variant produces a conditional, rather than directly applying the biconditional to another cited line.                     | 1 / 0                     |
| `double_negation_introduction` | From A, infer ¬¬A.                                                                                                                                                | 1 / 0                     |
| `modus_tollens`                | From A → B and ¬B, infer ¬A.                                                                                                                                      | 2 / 0                     |
| `disjunctive_syllogism`        | From A ∨ B and ¬A infer B, or with ¬B infer A. No implicit double-negation removal.                                                                               | 2 / 0                     |
| `hypothetical_syllogism`       | From A → B and B → C, infer A → C.                                                                                                                                | 2 / 0                     |
| `double_negation_elimination`  | From ¬¬A, infer A. Separately selectable classical rule.                                                                                                          | 1 / 0                     |
| `proof_by_contradiction`       | From a closed subproof assuming ¬A and ending ⊥, infer A, discharging that assumption. Separately selectable classical rule; distinct from negation introduction. | 0 / 1                     |
| `excluded_middle`              | Infer exactly A ∨ ¬A, with no citations. Separately selectable classical schema.                                                                                  | 0 / 0                     |

The two biconditional variants intentionally separate equivalence construction from its application. A direct two-subproof introduction or two-line biconditional application would need its own supported identity/requirements if added later, rather than silently changing the meaning of these IDs. Within this catalog, derive conditional lines first and use ordinary implication elimination for application.

De Morgan replacements, arbitrary subformula replacement, commutativity/associativity shortcuts, material implication and other textbook equivalences are not direct rules in this first catalog. They can be derived through enabled inferences. We can add precisely defined variants later when there is a teaching need. A profile must not present an unsupported shortcut as enabled.

## Formula identity and contradiction

`sameFormula` compares existing parsed ASTs: connective, operand order and variable names must match. Whitespace, redundant grouping and accepted notation aliases disappear during parsing. For example, `~[P v Q]` matches `¬(P ∨ Q)`. Neither `P ∧ Q` versus `Q ∧ P`, `P ↔ Q` versus `Q ↔ P`, nor P versus ¬¬P matches automatically. Logical equivalence is not structural identity, even if both formulas have identical truth tables.

This equality helper accepts trusted parsed `Formula` values; it is not a raw-input validator. Existing parser bounds, truth-table IDs and semantics remain unchanged.

Proof utilities use a separate public package entry point so existing truth-table clients do not load catalog metadata. The root engine exports remain unchanged; deep source imports are not needed.

The proposed proof language extends the existing connectives with a distinct falsity constant ⊥. Do not encode contradiction as the variable F (a valid ordinary proposition), an arbitrary false-looking formula, or an unchecked string sentinel. The proof parser/AST must handle ⊥ inside compound formulas too. Its implementation is a later slice, with an ASCII spelling and proof-specific bounds settled then. Existing public truth-table parsing must retain its current accepted language, limits and identifiers.

## Fitch structural conventions for the next slice

Use ordered nested subproof blocks with stable UUIDs for lines, assumptions/blocks and premise declarations. Displayed line numbers are derived from the current order. References retain IDs through insertion/reordering; an invalidated reference produces a diagnostic rather than silently pointing somewhere else. Precise transport fields, incomplete-entry representation and report schemas are next-slice work.

Proposed conventions:

- Premises come only from the supplied problem statement. A premise entry must refer to and structurally match one of those premises; students cannot declare new root premises. A premise's truth does not need semantic verification.
- Each subproof begins with one explicit assumption and has an explicit last direct line. The opening assumption is available inside that block and its descendants. A one-line assumption block can establish A → A; vacuous discharge is allowed, but the block still has to be explicit.
- A line can cite only an earlier line in its own block or an ancestor block. Later lines, descendants and closed sibling interiors are inaccessible. Copy an outer line with reiteration when it must be the direct endpoint of a subproof.
- An inference using a subproof cites an earlier, closed direct child of its current block. It can inspect that child's assumption and endpoint under the rule's discharge requirements, without making the interior lines generally accessible. Disjunction elimination cites two distinct sibling child blocks with matching case assumptions/endpoints; both are discharged.
- Local rule correctness and dependency validity are separate. A later step may match its cited formulas while depending on an earlier erroneous step. Reports must preserve both facts rather than mislabeling every downstream rule application as a new local error.
- The final root-level line must establish the exact target under allowed premises. Merely deriving it inside an undischarged assumption, or finding it earlier before an unrelated last line, does not complete the proof. A complete accepted proof must contain no errors or unresolved checks anywhere, including unused lines.
- Distinguish malformed structure, invalid formula, disabled/unknown rule, bad citation, local rule mismatch, invalid dependency and incomplete target. Failure or a resource limit must not become a successful validation or an invented numerical grade.

These conventions will become executable in small slices, with valid examples and invalid near-misses for scope/discharge. They do not prescribe the dependency-line or tree serialization; later adapters must establish their own structural validity over the shared rule obligations.

## Remaining work on 020

1. Define bounded/versioned proof input/report contracts and the proof-only formula representation/parser, including contradiction notation. Set explicit line, nesting and work budgets without relaxing existing table limits.
2. Implement/test local line-rule checks and subproof/discharge checks against the catalog above; reject unknown versions, unsupported rules and disabled citations.
3. Add the Fitch traversal, stable-reference resolution, dependency propagation and deterministic whole-proof report. Keep incomplete/unassessable distinct from accepted.
4. Verify alternate correct proofs, locally correct work downstream of errors, unused errors, inaccessible references, nesting/limits and malformed inputs. Finish branch evidence and PR notes then.

No database migration, frontend flow, assigned derivation acceptance, automatic grade or reference-proof publication is introduced by this foundation. Graded derivation availability remains guarded until the planned authoring/student/review branches are complete.

## Background and verification

The natural-deduction rules and discharge discussion use [Logic and Proof: natural deduction](https://leanprover-community.github.io/logic_and_proof/natural_deduction_for_propositional_logic.html) as background. The distinction between constructive rules, proof by contradiction, double-negation elimination and excluded middle is discussed in [Logic and Proof: classical reasoning](https://leanprover-community.github.io/logic_and_proof/classical_reasoning.html). Our exact variants and catalog are product choices, not a claim of textbook-wide uniformity.

Foundation tests exercise notation/grouping identity, distinctions between equivalent formulas, input immutability, stable rule identities versus display aliases, citation requirements and frozen catalog metadata. `npm run check` passed type checks, 994 tests (123 engine, 632 API, 239 web) and production builds. This includes 19 new foundation cases. Built Node ESM imports of both the existing root package and the new proof subpath passed. The frontend entry remains 496.69 kB with no chunk-size warning; catalog metadata is excluded from existing root imports. Formatting, whitespace and local Markdown file links passed. No database checks or browser walkthrough were run: this slice changes no persistence, active proof workflow or browser UI. Existing Jest VM-module advisories remain.
