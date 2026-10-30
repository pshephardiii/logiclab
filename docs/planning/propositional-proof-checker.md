# Propositional proof checker

Status: second slice of `020-feat-propositional-proof-checker`. The user confirmed the classical catalog and accepted the starting foundation. Version-1 rule identities/labels/citation arities now have bounded proof/report contracts and proof-only contradiction parsing alongside structural equality. The rule obligations below remain the specification for application checks; no complete checker is available yet.

No proof-validation entry point, authoring/student UI, grading operation or endpoint is enabled yet. The new contracts are standalone foundations; existing problem-definition schemas still reject derivations. A catalog entry is not an implemented checker or permission to use a rule. The [derivation plan](logical-derivations.md) remains the delivery sequence.

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

`sameFormula` compares parsed ordinary/proof ASTs: connective, operand order and variable names must match. Whitespace, redundant grouping and accepted notation aliases disappear during parsing. For example, `~[P v Q]` matches `¬(P ∨ Q)`. Neither `P ∧ Q` versus `Q ∧ P`, `P ↔ Q` versus `Q ↔ P`, nor P versus ¬¬P matches automatically. Logical equivalence is not structural identity, even if both formulas have identical truth tables.

This equality helper accepts trusted parsed `ProofFormula` values (ordinary `Formula` values remain assignable); it is not a raw-input validator. Existing parser bounds, truth-table IDs and semantics remain unchanged.

Proof utilities use a separate public package entry point so existing truth-table clients do not load catalog metadata. The root engine exports remain unchanged; deep source imports are not needed.

`parseProofFormula` extends the existing connectives with a distinct falsity atom `{ type: "bottom" }`, accepting Unicode `⊥` or contiguous keyboard `_|_`. It works inside compound formulas, for example `~_|_ -> P`. F remains an ordinary variable; `FALSE`, separated `_ | _` and malformed aliases are not accepted spellings.

The proof parser shares the existing tokenizer/precedence grammar through an explicit internal atom/limit configuration. It preserves grouping, aliases, implication associativity, explicitly grouped biconditionals and zero-based UTF-16 error positions. Proof limits are 256 characters, 32 nested groups/negations/implications and all 26 uppercase variables. Ordinary truth-table parsing still rejects contradiction, retains its four-variable bound and keeps its error text, ASTs and structural IDs. No evaluator or truth-table generator accepts proof-only falsity.

## Fitch structural conventions for the next slice

Use logically ordered nested subproof blocks with stable UUIDs for lines, assumptions/blocks and premise declarations. The concrete transport uses flat tables described below, rather than recursive JSON. Displayed line numbers are derived from step order. References retain IDs through insertion/reordering; the future checker must diagnose invalidated references rather than silently retargeting them.

Proposed conventions:

- Premises come only from the supplied problem statement. A premise entry must refer to and structurally match one of those premises; students cannot declare new root premises. A premise's truth does not need semantic verification.
- Each subproof begins with one explicit assumption and has an explicit last direct line. The opening assumption is available inside that block and its descendants. A one-line assumption block can establish A → A; vacuous discharge is allowed, but the block still has to be explicit.
- A line can cite only an earlier line in its own block or an ancestor block. Later lines, descendants and closed sibling interiors are inaccessible. Copy an outer line with reiteration when it must be the direct endpoint of a subproof.
- An inference using a subproof cites an earlier, closed direct child of its current block. It can inspect that child's assumption and endpoint under the rule's discharge requirements, without making the interior lines generally accessible. Disjunction elimination cites two distinct sibling child blocks with matching case assumptions/endpoints; both are discharged.
- Local rule correctness and dependency validity are separate. A later step may match its cited formulas while depending on an earlier erroneous step. Reports must preserve both facts rather than mislabeling every downstream rule application as a new local error.
- The final root-level line must establish the exact target under allowed premises. Merely deriving it inside an undischarged assumption, or finding it earlier before an unrelated last line, does not complete the proof. A complete accepted proof must contain no errors or unresolved checks anywhere, including unused lines.
- Distinguish malformed structure, invalid formula, disabled/unknown rule, bad citation, local rule mismatch, invalid dependency and incomplete target. Failure or a resource limit must not become a successful validation or an invented numerical grade.

These conventions will become executable in small slices, with valid examples and invalid near-misses for scope/discharge. They do not prescribe the dependency-line or tree serialization; later adapters must establish their own structural validity over the shared rule obligations.

## Bounded proof and report contracts (slice 2)

`tools/contracts/src/proof.ts` exposes standalone Zod schemas/types. They are not an instructor-authored derivation definition or a route contract accepting live work.

`proofCheckInputSchema` contains `problem` and `proof`:

- Problem: `ruleCatalogVersion: 1`, ordered `{ id, formula }` premises, a conclusion formula and explicit `permittedRuleIds`. There is no permission default. Rule IDs are bounded identifiers; the checker will verify actual catalog membership, duplicates and permissions.
- Proof: `proofVersion: 1`, `format: "fitch"`, ordered `steps` and a `blocks` table. Root scope is `blockId: null`; subproof steps cite their block ID.
- A premise step has `id`, `formula`, root `blockId`, and nullable `premiseId`. An assumption step has `id`, `formula` and non-null `blockId`. An inference has `id`, `formula`, `blockId`, nullable `ruleId`, and line/subproof reference ID arrays. These roles are explicit; a null rule is unfinished work, not reiteration or permission to guess.
- Blocks have `id`, nullable `parentId`, `assumptionId` and nullable `endId`. An unfinished block has no endpoint. A complete one-line A-assumption block can cite that same assumption as its endpoint. Its occurrence in the ordered steps establishes its opening position; future traversal must validate contiguous nesting and its final direct endpoint.

Flat lists make transport validation independent of recursion through untrusted nested objects. A self-parent cycle, duplicate ID, unknown referenced UUID, blank formula or malformed logical formula can remain bounded draft work. Schema success is **not** proof validity. The checker must reject malformed structure, enforce the declared depth budget, parse formulas and validate exact scope/discharge before accepting anything. IDs normalize to lowercase while formula source is retained verbatim; refs are never remapped by display position. Extra fields, malformed UUIDs, unsupported versions/formats and oversized values fail transport validation.

Budgets: 200 steps, 64 blocks, 50 premises, 64 permitted-rule entries, 256 characters per formula, at most two line and two subproof references per inference, and 500 total diagnostics per report. The future traversal must additionally enforce `maxBlockDepth: 16` and bounded work/cycle detection. The schema does not recursively follow block links or pretend to enforce depth now.

`proofCheckReportSchema` pins `checkerVersion: 1` and `ruleCatalogVersion: 1`. Overall status is `accepted`, `needs_review` or `unassessable`; target status is separately `established`, `not_established` or `unknown`. Per-step reports carry both the incoming UUID and zero-based `stepIndex`, local validity and dependency validity. The index distinguishes malformed duplicate-ID submissions without inventing new identities. A locally valid step may still have invalid upstream dependencies.

Diagnostics carry a stable category, bounded message and optional step index, block ID or UTF-16 formula position. Categories distinguish version/limit failures, structure, formula syntax, unknown/disabled rules, references, rule mismatch, dependencies, incomplete work and target failure. An accepted report must have an established target, nonempty uniquely identified/in-order step results, valid local/dependency states and no diagnostics. An unassessable report must explain the failure. Reports carry no awarded points; grade/review/release policy remains outside the engine.

These guards validate report consistency, not the truth of a caller-supplied acceptance claim. Only a future engine evaluation over authoritative input can produce trusted validation evidence. No report producer or public checking endpoint is enabled in this slice.

## Remaining work on 020

1. Consume the bounded input/report contracts in the pure checker. Enforce identity/reference coherence, block depth, cycle and work budgets, including safe failure reporting for malformed/unsupported input.
2. Implement/test local line-rule checks and subproof/discharge checks against the catalog above; reject unknown versions, unsupported rules and disabled citations.
3. Add the Fitch traversal, stable-reference resolution, dependency propagation and deterministic whole-proof report. Keep incomplete/unassessable distinct from accepted.
4. Verify alternate correct proofs, locally correct work downstream of errors, unused errors, inaccessible references, nesting/limits and malformed inputs. Finish branch evidence and PR notes then.

No database migration, frontend flow, assigned derivation acceptance, automatic grade or reference-proof publication is introduced by these foundations. Graded derivation availability remains guarded until the planned authoring/student/review branches are complete.

## Background and verification

The natural-deduction rules and discharge discussion use [Logic and Proof: natural deduction](https://leanprover-community.github.io/logic_and_proof/natural_deduction_for_propositional_logic.html) as background. The distinction between constructive rules, proof by contradiction, double-negation elimination and excluded middle is discussed in [Logic and Proof: classical reasoning](https://leanprover-community.github.io/logic_and_proof/classical_reasoning.html). Our exact variants and catalog are product choices, not a claim of textbook-wide uniformity.

Foundation tests exercise notation/grouping identity, distinctions between equivalent formulas, input immutability, stable rule identities versus display aliases, citation requirements and frozen catalog metadata. Slice 1: `npm run check` passed type checks, 994 tests (123 engine, 632 API, 239 web) and production builds. This includes 19 new foundation cases. Built Node ESM imports of both the existing root package and the new proof subpath passed. The frontend entry remains 496.69 kB with no chunk-size warning; catalog metadata is excluded from existing root imports. Formatting, whitespace and local Markdown file links passed. No database checks or browser walkthrough were run: this slice changes no persistence, active proof workflow or browser UI. Existing Jest VM-module advisories remain.

### Slice 2 verification — October 30, 2026

`npm run check` passed type checks, 1,047 tests (150 engine, 658 API, 239 web) and production builds. The 53 additional cases cover proof-only falsity/aliases, compound use, positioned syntax errors, unchanged ordinary ASTs/table identifiers/limits, bounded incomplete transport, strict versions/fields, normalized IDs, acceptance consistency, local-versus-dependency reports and continued rejection of authored derivation definitions. Built Node ESM imports of root parsing, proof parsing and proof contracts passed. Formatting, whitespace and local Markdown file links passed. The frontend entry remains under the existing chunk threshold (499.23 kB); no size threshold was raised.

No database checks, migration, browser walkthrough, proof rule application or whole-proof validation is claimed. Existing Jest VM-module advisories remain. Only standalone foundations are enabled; report consistency validation does not certify a user-supplied proof or award points.
