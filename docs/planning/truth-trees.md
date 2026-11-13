# Truth trees (semantic tableaux)

Branch: `034-feat-semantic-tableaux`. Use **truth trees** in the product; semantic tableaux is the technical synonym. This is a separate method from the retained, unavailable natural-deduction tree implementation. See the [availability decision](proof-method-availability.md).

## Starting conventions

Use classical propositional **unsigned** trees: each formula on a branch is asserted true. Argument testing starts with the supplied premises and the negation of the supplied conclusion. Decomposition extends or splits downward. There are no temporary-assumption discharge rules or final-line target requirements.

A branch can close on an exact complementary pair `A` and `¬A`, including compound formulas, or on explicit falsity `⊥`. Complement matching uses parsed structure rather than logical equivalence. Thus `P ∧ Q` and `¬(Q ∧ P)` do not directly match. Formula order within a branch must not be confused with which branches a formula belongs to. A closure checker must establish that both cited occurrences actually lie on the same path.

Every branch closed establishes argument validity. A fully decomposed open branch can supply a counterexample. An unfinished open branch alone establishes neither invalidity nor unsolvability. Later validation must distinguish bad construction, incomplete work, closure and completed-open outcomes; a client-supplied checkmark is not evidence that a formula was expanded everywhere necessary.

These conventions follow the familiar truth-tree approach. The [Open Logic Project's tableau chapter](https://builds.openlogicproject.org/content/first-order-logic/tableaux/tableaux.pdf) describes path-local decomposition, complementary closure and the need to expand formulas on every relevant open branch, using signed notation. LogicLab's unsigned notation represents false assertions by explicit negation. The [Tree Proof Generator](https://www.umsu.de/trees/) also uses “tree proof” and “semantic tableau” for this method; it is background context, not an integration dependency.

## Version-1 propositional decomposition catalog

Commas mean formulas on the **same** branch. A vertical bar separates alternatives on **different** branches. `A` and `B` can stand for arbitrary compound formulas, not just atomic letters.

| Source     | Result             | Rule ID                 |
| ---------- | ------------------ | ----------------------- |
| `¬¬A`      | `A`                | `double_negation`       |
| `A ∧ B`    | `A, B`             | `conjunction`           |
| `¬(A ∧ B)` | `¬A` \| `¬B`       | `negated_conjunction`   |
| `A ∨ B`    | `A` \| `B`         | `disjunction`           |
| `¬(A ∨ B)` | `¬A, ¬B`           | `negated_disjunction`   |
| `A → B`    | `¬A` \| `B`        | `conditional`           |
| `¬(A → B)` | `A, ¬B`            | `negated_conditional`   |
| `A ↔ B`    | `A, B` \| `¬A, ¬B` | `biconditional`         |
| `¬(A ↔ B)` | `A, ¬B` \| `¬A, B` | `negated_biconditional` |

Positive/negative atomic literals do not expand. `⊥` is terminal falsity; `¬⊥` is terminal truth, not a closure witness. `F` remains an ordinary atomic letter. Double negation stays an explicit step, including for constants. No automatic equivalence rewriting, Cut, predicate/modal rules or natural-deduction rules are included.

## Slice 1 — formula/rule foundation

Implemented in `tools/logic-engine/src/truth-tree/`, exposed through `@logiclab/logic-engine/truth-tree`:

- A separate versioned, frozen rule catalog and named formula/decomposition types.
- Bounded parsing using the shared propositional grammar: all 26 uppercase letters, existing aliases/grouping/precedence, and `⊥` / `_|_`. The ordinary truth-table parser retains its existing bounds and restrictions.
- One-step decomposition returning alternatives with formulas grouped by branch, plus exact complement detection. Operations neither mutate the input nor construct/check a complete tree. Returned formula structures can share immutable input subtrees; editors must retain immutable-update conventions.
- Tests for exact expansions, every valuation of atomic/compound substitutions, constants, closure matching, malformed notation, input preservation and parser bounds, alongside the existing engine regression suite.

This slice does not add serialized tree/node/branch/report schemas, student-created structure, branch checking, counterexample extraction, proof search, authoring, persistence, grading, API routes or UI. Existing proof-method admission remains unchanged: only Fitch/dependency are offered. The new foundation is not itself a validation endpoint or a claim that a supplied tree is correct.

Validation: engine type checking, all 634 engine tests (47 new cases), production build, CommonJS/ESM package-entry smoke and changed-file formatting/whitespace passed. No browser or database run was needed for this pure engine slice; full application verification remains for the dependent workflow changes and branch closeout.

## Slice 2 — versioned structure and transport

Standalone contracts are exposed through `@logiclab/contracts/truth-tree` and the root contracts entry. `treeVersion: 1` and `format: 'truth_tree'` identify this representation; the retained natural-deduction `format: 'tree'` remains separate. These contracts are not yet included in problem-definition, answer or assignment unions.

The representation has three flat tables, avoiding recursively nested untrusted JSON:

- **Occurrences:** stable UUID, formula text and origin (supplied premise identity, negated conclusion, or expansion identity). Equal formula text does not merge occurrences. Blank formula text and unresolved source IDs are retained for draft checking.
- **Branches:** stable UUID, parent branch, ordered occurrence IDs and an open/closed/split ending. Each segment owns its formulas once; descendants inherit ancestor formulas along their path. `rootBranchId` identifies the initial segment independently of array order. A closed ending records a claim with either two complementary occurrence IDs or one falsity witness. A split records the responsible expansion and up to two child IDs; incomplete splits/closures remain representable.
- **Expansions:** stable UUID, branch where applied, cited source occurrence, rule ID and result groups. A nonbranching rule produces one group in the current segment. A branching rule produces two groups in its two child segments. Each group identifies its generated occurrences, preserving multiplicity when both components happen to be the same formula. Missing selections can be null/empty; syntactically valid unknown rule IDs survive transport for later diagnostics.

For example, the root segment can contain `P ∨ Q` and `¬P`. A disjunction expansion splits into child segments containing `P` and `Q`. The first child can claim closure using its `P` and the ancestor's `¬P`; that ancestor formula is not copied into the child. The second child's open ending is **not** a claim that a counterexample has been verified.

Only the per-segment occurrence order encodes formula sequence; occurrence/branch/expansion table array positions are not identities or display numbers. Subsequent checking must match result groups without requiring one left/right drawing order or one order of conjunction components. It must still enforce earlier accessible source references, ownership, exact output multiplicity, split/parent consistency and coverage on each relevant path. A repeated expansion of an ancestor on different branches needs distinct expansion identities.

Limits bound 200 occurrences, 127 branch segments, 200 expansion events, 50 argument premises and 256 characters per formula. Aggregate branch membership references are also capped at 200 to prevent per-array bounds from allowing quadratic payload growth. UUIDs normalize to lowercase at every identity/reference position. Strict objects reject injected fields and unsupported version/method tags. Transport validation deliberately leaves duplicate identities, cycles, unresolved references, formula syntax and logical correctness for the checker; a shape-valid payload is not an accepted tree.

The argument contract carries the original premises and **unnegated** conclusion. A future assigned-work caller must load these from the authorized pinned definition, not accept a student-supplied replacement. There is no stored grade, client-asserted valid/invalid verdict, counterexample or correctness report in this slice. Those need checker evidence and subsequent workflow decisions.

The engine catalog now uses the shared known-rule identity type. Its formula-level result is named `TruthTreeFormulaExpansion`, distinguishing it from the serialized `TruthTreeExpansion` event with occurrence/branch references. Root engine exports, natural-deduction contracts and app availability are otherwise unchanged.

Validation: workspace type checks and required package builds passed, along with all 634 engine tests and 64 focused API contract tests (35 new truth-tree cases plus existing proof contracts). CommonJS/ESM contract entry smoke, catalog parity and changed-file formatting/whitespace passed. No database, browser or full API regression run was repeated for this transport-only slice.

## Following slices and decisions

1. Structure/transport foundation is implemented above. Next add structural validation and diagnostics/report contracts, separately from natural-deduction proofs and without assuming a shape-valid draft is logically correct.
2. Validate initial premises plus negated conclusion, path ancestry, exact decomposition alternatives and occurrence-level expansion coverage. Reject cross-branch citations and malformed structures. Establish resource bounds before accepting untrusted trees.
3. Validate branch closure and completeness; extract and independently verify counterexamples against the authoritative original argument. Keep incomplete, erroneous and resource-limited work distinct from a verified validity/invalidity result.
4. Settle instructor reference requirements, allowed exercise goals and grading/review/completion semantics before integrating versioned authoring, assignments and student work. Reuse authorization, explicit saves, review and independent release where semantics agree; do not assume a natural-deduction report already fits.
5. Add practice and instructional UI/demo workflows, splitting into additional numbered branches if needed. Follow delivery with the dedicated truth-tree practice UI audit, then resume demo teaching-flow and genuine-account product audits. Confirm numbering when splitting; no additional branch or deployment is started by this plan.
