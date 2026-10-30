# Propositional proof checker

Status: fourth slice of `020-feat-propositional-proof-checker`. The user confirmed the classical catalog and accepted the starting foundation. Version-1 rule identities/labels/citation arities now have bounded proof/report contracts and proof-only contradiction parsing alongside structural equality. All 19 rule obligations below have local application checks over parsed formulas. Fitch layout/reference analysis is now implemented; no complete proof checker is available yet.

No proof-validation entry point, authoring/student UI, grading operation or endpoint is enabled yet. The new contracts are standalone foundations; existing problem-definition schemas still reject derivations. The catalog itself does not grant permission or certify a proof; local rule checks require explicit permissions and do not establish whole-proof validity. The [derivation plan](logical-derivations.md) remains the delivery sequence.

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

## Fitch structural conventions

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

Flat lists make transport validation independent of recursion through untrusted nested objects. A self-parent cycle, duplicate ID, unknown referenced UUID, blank formula or malformed logical formula can remain bounded draft work. Schema success is **not** proof validity. Fitch analysis now rejects malformed structure and enforces the depth budget; the whole-proof checker must still parse formulas, combine local rule/discharge obligations with valid dependencies and establish the target before accepting anything. IDs normalize to lowercase while formula source is retained verbatim; refs are never remapped by display position. Extra fields, malformed UUIDs, unsupported versions/formats and oversized values fail transport validation.

Budgets: 200 steps, 64 blocks, 50 premises, 64 permitted-rule entries, 256 characters per formula, at most two line and two subproof references per inference, and 500 total diagnostics per report. The Fitch layer enforces `maxBlockDepth: 16` and detects parent cycles iteratively. The schema itself does not follow block links or enforce depth. Whole-proof input preflight and the formula/rule/dependency work budget remain next-slice tasks.

`proofCheckReportSchema` pins `checkerVersion: 1` and `ruleCatalogVersion: 1`. Overall status is `accepted`, `needs_review` or `unassessable`; target status is separately `established`, `not_established` or `unknown`. Per-step reports carry both the incoming UUID and zero-based `stepIndex`, local validity and dependency validity. The index distinguishes malformed duplicate-ID submissions without inventing new identities. A locally valid step may still have invalid upstream dependencies.

Diagnostics carry a stable category, bounded message and optional step index, block ID or UTF-16 formula position. Categories distinguish version/limit failures, structure, formula syntax, unknown/disabled rules, references, rule mismatch, dependencies, incomplete work and target failure. An accepted report must have an established target, nonempty uniquely identified/in-order step results, valid local/dependency states and no diagnostics. An unassessable report must explain the failure. Reports carry no awarded points; grade/review/release policy remains outside the engine.

These guards validate report consistency, not the truth of a caller-supplied acceptance claim. Only a future engine evaluation over authoritative input can produce trusted validation evidence. No report producer or public checking endpoint is enabled in this slice.

## Local rule application (slice 3)

`checkLocalRule` is available from `@logiclab/logic-engine/proof`. Its input contains:

- `ruleCatalogVersion`, nullable `ruleId` and explicit `permittedRuleIds`.
- A parsed conclusion, an ordered array of parsed cited line formulas, and subproof obligations as `{ assumption, conclusion }` parsed formula pairs.

The input is a trusted, resolved local application, not raw proof JSON. Parse formulas and resolve IDs before calling it. `local-rule.ts` checks the catalog version, known identity, permission and exact citation counts before calling the private pattern functions in `rule-patterns.ts`. The pattern table covers every catalog rule ID at compile time. Matching is structural and does not mutate inputs or reference order.

Local results are deliberately different from whole-proof reports:

| Status         | Meaning/code                                                                             |
| -------------- | ---------------------------------------------------------------------------------------- |
| `valid`        | This rule's formula pattern matches the supplied local obligations.                      |
| `invalid`      | `UNKNOWN_RULE`, `RULE_DISABLED`, `INVALID_REFERENCE` (wrong counts), or `RULE_MISMATCH`. |
| `unassessable` | `UNSUPPORTED_VERSION` or `INCOMPLETE_PROOF` (no rule selected).                          |

There are no default permissions, label-to-ID guessing or implied extra rule applications. The version check precedes rule lookup, then permission, citation counts and formula matching. Code categories match the shared diagnostic contract; no local result is itself an accepted proof report or grade.

Citation roles can be matched in either order where the exact rule allows it. Either conjunct can be eliminated, disjunction can be introduced on either side, either biconditional direction can be extracted, and disjunctive syllogism handles either explicitly negated disjunct. Metavariables accept arbitrary compound formulas, including falsity. Reusing a line formula can support A ∧ A; reference identity/accessibility still belongs to the next layer.

The exact variant boundaries remain enforced. Biconditional introduction consumes two conditional lines, while elimination produces a conditional rather than applying it directly. Negation introduction and proof by contradiction require explicit ⊥ endpoints, not merely a formula of the form A ∧ ¬A. Excluded middle directly produces A ∨ ¬A, not its commuted spelling. Disjunctive syllogism does not silently perform double-negation introduction/elimination. Such transformations need their own permitted steps.

A local match cannot certify that a line is accessible, a subproof is closed, two disjunction cases are distinct blocks, an assumption has actually been discharged, or any upstream reasoning is valid. Identical case formulas may match locally while duplicate block IDs must fail the future structural check. Likewise, a correct modus-ponens shape can depend on an earlier invalid line. The Fitch layer must preserve local validity separately from dependency failure, validate all structure, check the root target and include unused erroneous work before reporting acceptance. These obligations are not relaxed by this slice.

## Fitch structure and references (slice 4)

`analyzeFitchStructure` takes an already transport-validated `FitchProof`, using the shared contract types/limits. It is not a raw-JSON validator. It additionally rejects unsupported runtime headers and excessive step/block counts before layout work. The engine declares its existing contracts-workspace dependency explicitly; its test command builds that dependency first. No new external library was installed.

The implementation separates layout construction, citation resolution, bounded diagnostics and public result types:

- `fitch-layout.ts` rejects duplicate step/block identities and cross-kind collisions, missing/cyclic parents, wrong or undeclared assumptions, missing/backward/non-direct endpoints and unknown step scopes. An iterative stack validates contiguous nesting, declared current parents and explicit closure. A block cannot silently close or reopen when a later line switches scope. Single-line assumption blocks and vacuous discharge remain structurally representable.
- `fitch-references.ts` permits earlier lines only in the current or ancestor scope. It rejects self/forward/unknown/wrong-kind references and closed sibling/descendant interiors. Subproof citations must identify earlier closed direct children of the current scope; a pair must identify distinct blocks. Repeated accessible line references are retained because a rule such as conjunction introduction may reuse A to derive A ∧ A.
- `structure-diagnostics.ts` caps reports at 500 diagnostics. Overflow returns an explicit `RESOURCE_LIMIT` and no resolved output, rather than treating a partial analysis as successful. Parent walking is bounded by the 64-block input limit, scope stacks by depth 16 and step processing by 200 entries; no recursive graph traversal is used.

Result status is `resolved`, `invalid` or `unassessable`. Invalid layout and resource/version failures provide diagnostics without citation outputs. A resolved layout provides fresh block-span values and per-inference reference checks. Each check is either resolved with original step indices/closed child spans, invalid, or unassessable; unsafe checks expose no partial citation lists. A closed child span has a non-null end index, ready for resolving its assumption and endpoint formulas.

`resolved` does not mean complete or logically correct. An open block at the end of coherent draft work has `INCOMPLETE_PROOF` diagnostics; earlier accessible current-scope citations can still resolve. Invalid citations do not destroy safe resolution for unrelated inferences. Consumers must examine diagnostics and individual checks. Empty work can have coherent structure without proving any target. The original UUIDs/formulas are preserved; changing displayed positions cannot retarget a citation silently.

This layer checks where cited material comes from and whether a child block is closed. The local matcher checks formula-level discharge obligations. The future whole-proof checker must still validate premise declarations against the supplied statement, parse every formula, check enabled rules and endpoints, propagate invalid/unresolved dependencies, include unused errors and determine whether the final root line establishes the target. Neither structural resolution nor a local rule match is a grade or an accepted report.

## Remaining work on 020

1. Add the whole-proof entry point over unknown input with safe preflight/schema/version handling, authoritative premise/configuration validation and bounded formula/rule/dependency work.
2. Parse all formulas and connect resolved Fitch citations to local rule matching. Preserve local validity separately from invalid/unresolved dependencies and verify discharge obligations under the actual block context.
3. Add the Fitch traversal, stable-reference resolution, dependency propagation and deterministic whole-proof report. Keep incomplete/unassessable distinct from accepted.
4. Verify alternate correct proofs, locally correct work downstream of errors, unused errors, inaccessible references, nesting/limits and malformed inputs. Finish branch evidence and PR notes then.

No database migration, frontend flow, assigned derivation acceptance, automatic grade or reference-proof publication is introduced by these foundations. Graded derivation availability remains guarded until the planned authoring/student/review branches are complete.

## Background and verification

The natural-deduction rules and discharge discussion use [Logic and Proof: natural deduction](https://leanprover-community.github.io/logic_and_proof/natural_deduction_for_propositional_logic.html) as background. The distinction between constructive rules, proof by contradiction, double-negation elimination and excluded middle is discussed in [Logic and Proof: classical reasoning](https://leanprover-community.github.io/logic_and_proof/classical_reasoning.html). Our exact variants and catalog are product choices, not a claim of textbook-wide uniformity.

Foundation tests exercise notation/grouping identity, distinctions between equivalent formulas, input immutability, stable rule identities versus display aliases, citation requirements and frozen catalog metadata. Slice 1: `npm run check` passed type checks, 994 tests (123 engine, 632 API, 239 web) and production builds. This includes 19 new foundation cases. Built Node ESM imports of both the existing root package and the new proof subpath passed. The frontend entry remains 496.69 kB with no chunk-size warning; catalog metadata is excluded from existing root imports. Formatting, whitespace and local Markdown file links passed. No database checks or browser walkthrough were run: this slice changes no persistence, active proof workflow or browser UI. Existing Jest VM-module advisories remain.

### Slice 2 verification — October 30, 2026

`npm run check` passed type checks, 1,047 tests (150 engine, 658 API, 239 web) and production builds. The 53 additional cases cover proof-only falsity/aliases, compound use, positioned syntax errors, unchanged ordinary ASTs/table identifiers/limits, bounded incomplete transport, strict versions/fields, normalized IDs, acceptance consistency, local-versus-dependency reports and continued rejection of authored derivation definitions. Built Node ESM imports of root parsing, proof parsing and proof contracts passed. Formatting, whitespace and local Markdown file links passed. The frontend entry remains under the existing chunk threshold (499.23 kB); no size threshold was raised.

No database checks, migration, browser walkthrough, proof rule application or whole-proof validation is claimed. Existing Jest VM-module advisories remain. Only standalone foundations are enabled; report consistency validation does not certify a user-supplied proof or award points.

### Slice 3 verification — October 30, 2026

`npm run check` passed type checks, 1,162 tests (264 engine, 659 API, 239 web) and production builds. The 114 new engine cases cover every rule's valid pattern, reversed citation roles, arbitrary compound substitutions, an invalid near-miss, exact reference counts and explicit permissions, plus alternate variants, forbidden implicit rewrites, identity/label/version distinctions and input immutability. Catalog coverage checks require valid and invalid examples for every supported ID. An API contract-boundary test verifies local diagnostic-code compatibility and rejects a local success as a whole-proof report. Built public-module smoke and formatting/whitespace/local Markdown file-link checks passed.

No database checks or browser walkthrough were run: there is no persistence, route or UI change. Existing parser/table behavior remains covered, and the frontend entry remains 499.23 kB without changing its warning threshold. Existing Jest VM-module advisories remain. Scope/accessibility, actual subproof closure/discharge, dependency propagation, root-target acceptance and whole-proof resource handling are still unimplemented; no local result can award a grade or enable derivation publication/submission.

### Slice 4 verification — October 30, 2026

`npm run check` passed type checks, 1,204 tests (305 engine, 660 API, 239 web) and production builds. The 41 new engine cases cover resolved inputs feeding local rules, single-line/nested/sibling subproofs, current/ancestor access, inaccessible/forward/self/wrong-kind citations, distinct cases versus reusable lines, open drafts, duplicate/malformed/cyclic layouts, exact depth boundaries, step/block/diagnostic limits, stable IDs through insertion and input/result isolation. API contract coverage confirms that structural diagnostics match the shared schema and resolved structure is not an accepted report. Public-module smoke, formatting, whitespace and local Markdown file-link checks passed. The lockfile change records only the existing workspace dependency; the offline metadata update added no external packages. The frontend entry remains 499.23 kB with no raised warning threshold.

No database check, migration, browser walkthrough, whole-proof acceptance or grading workflow is claimed. Premise authority, formula checking, actual dependency propagation and target/report orchestration remain the next slice. Existing Jest VM-module advisories remain.
