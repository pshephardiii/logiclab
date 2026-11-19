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

## Slice 3 — structural checking

`analyzeTruthTreeStructure` is exposed through `@logiclab/logic-engine/truth-tree`. It accepts raw input, bounds known collections before transport parsing, normalizes references through the contracts, then resolves identities, parent/child relationships, ordered ownership and reference paths in stages. It does not parse formulas or issue argument-validity verdicts.

The stage checks:

- Globally unique branch/occurrence/expansion identities, one initial branch, reciprocal split-child parents, connected acyclic ancestry and exclusive occurrence membership. Initial premise/conclusion occurrences must precede generated formulas in the root segment.
- Each result occurrence's originating expansion, correct owning segment, distinct results and exact split-child coverage. A nonbranching expansion inserts adjacent results in its current segment; a splitting expansion starts each child segment with its results. Component order and left/right alternative order remain free.
- Earlier accessible sources, excluding self, forward, descendant and sibling citations. An ancestor may be expanded separately on different descendant branches using distinct events. Event table order does not determine chronology.
- Distinct closure witnesses on the closing branch's ancestor path. Whether their formulas are complementary or falsity remains a subsequent logical check.

Results distinguish `resolved`, `incomplete`, `invalid` and `unassessable`. Missing selections and partial splits/closure claims produce incomplete diagnostics; malformed references/graphs produce invalid diagnostics. Unsupported transport/versions and exceeded resource limits remain unassessable. Only resolved results expose normalized data, reference maps, ordered branch traversal and inherited paths. Shared structural diagnostics are bounded contracts with optional branch/occurrence/expansion identities; they contain neither points nor a truth-tree validity verdict.

Traversal is iterative, with a 32-level branch-depth bound, 200-diagnostic bound and deterministic 100,000-work-unit budget. Resource exhaustion returns an explicit failure without partial resolved maps or silently truncated evidence. The same internal budget can be carried into the subsequent logical stages. These work units are implementation bounds, not elapsed-time guarantees or an authorization boundary.

No authoritative argument comparison, formula/rule matching, complete-open-branch check, counterexample, grading, API workflow or UI is enabled by this slice. A structurally resolved tree can still contain a syntax error, unknown rule or false closure claim; tests explicitly preserve this distinction.

Validation: workspace type checks and required package builds, all 697 engine tests (63 new structural cases), 64 focused API contract tests, built CommonJS/ESM entry smoke and changed-file formatting/whitespace passed. Tests cover inherited paths, ordering freedom, duplicate/wrong-kind identities, disconnected cycles, ownership, forward/self/sibling references, partial work and raw/depth/work/diagnostic limits. No database or browser run was needed; no live tree workflow is exposed yet.

## Slice 4 — initial formulas, decomposition and closure evidence

`checkTruthTreeSteps({ problem, tree })` now composes argument validation, structural resolution, formula parsing, initial correspondence, rule matching and logical closure-witness checks. Its bounded `TruthTreeStepReport` is available from the truth-tree contracts entry. Status `checked` means that the initial formulas and entered local steps passed these checks; it is **not** an argument-validity verdict and does not establish branch completeness.

The initial segment must contain each authoritative premise once under its own identity and exactly one explicit negation of the authoritative conclusion. Premise order is free; equal-text premises with different identities remain separate. Notation/grouping aliases match parsed structure, but double-negation removal, commutation and other equivalences are not implicit rewrites. Missing initial formulas are incomplete; substitutions, extra initial sources and repeated identities are invalid. Invalid authoritative configuration, including duplicate premise IDs, is unassessable rather than a student error.

All entered formulas are parsed, including unused occurrences. Every expansion must select the matching catalog rule and produce its complete alternatives with exact formula multiplicity. Multiset matching allows reversed component/alternative order while preserving separate occurrences for repeated components such as `P ∧ P`. Literal/constant sources cannot be expanded as compound formulas. Unknown rules, malformed formulas and wrong results produce targeted diagnostics; dependent checks remain unknown when their formulas cannot be parsed.

Closure claims now require actual complementary formulas or explicit falsity after structural checking has established accessible, distinct witnesses. Compound complements are allowed; logically equivalent rearrangements are not matched implicitly. `¬⊥` and ordinary variable `F` cannot serve as falsity witnesses.

The report separates initial correspondence, occurrence syntax, local expansion correctness and local closure correctness. Correct local work may remain visible alongside an initial mismatch or unused error, but the overall report cannot become `checked` while any error remains. This report does not yet certify upstream support or branch completion. Contracts reject fabricated checked reports with invalid/unknown evidence, duplicate evidence identities, unexplained failures and partial certification on unassessable results. They also reject added argument-verdict fields. An assigned-work caller must supply the authoritative pinned argument and enforce disclosure; a client-supplied report is never grading evidence.

The work budget is shared across structure, parsing and formula comparisons. Raw argument collections/text are bounded before schema parsing. Resource failure discards partial evidence and returns an explicit unassessable report. No grades, counterexamples, proof search, completion policy, application workflow or UI are added here.

Validation: workspace type checks and required package builds, all 746 engine tests (49 new local-check/report cases), 64 focused API contract tests, built CommonJS/ESM step-check/report smoke and changed-file formatting/whitespace passed. Coverage includes every decomposition rule and compound substitutions, free ordering, multiplicity, initial identities/negation, accessible but false closure claims, unused errors, malformed configuration and bounded failures. No database or browser run was needed for this pure checking slice.

## Slice 5 — branch completeness and argument outcomes

`checkTruthTree({ problem, tree })` now returns a versioned `TruthTreeCheckReport`. It reuses the local-check stage's parsed argument, resolved structure and shared work budget. `checkTruthTreeSteps` retains its existing narrower behavior; whole-tree checking does not parse/check everything twice.

Terminal branch outcomes are:

- `closed`: an explicit closure claim has passed reference and formula checks. Remaining compounds on that path do not require decomposition.
- `open_complete`: the path has no complementary pair or falsity and every compound occurrence has a valid expansion covering that path.
- `incomplete`: at least one compound occurrence still requires expansion on that path; the report identifies those occurrences.
- `needs_closure`: the open path already contains an exact contradiction or falsity. It must be explicitly marked closed with witnesses. It cannot supply a counterexample and is not silently treated as closed.

Coverage uses occurrence identities and inherited expansion sets. An expansion before a split covers both descendants. Expanding an inherited occurrence separately on one child does not cover its sibling. Equal-text occurrences remain separate obligations. Complement discovery uses canonical parsed syntax keys, avoiding quadratic pair comparisons while preserving exact structural matching.

If all entered work passes local checking and every terminal path is explicitly closed, the argument is verified **valid**. A completed consistent open path can verify the argument **invalid**, even if other branches still contain undecomposed formulas; one counterexample is sufficient. Every entered step still has to pass: an unused wrong step or an initial mismatch blocks overall verification. Other branches' incomplete/needs-closure states remain visible when a counterexample establishes invalidity. These are argument outcomes, not a settled grading/completion policy.

Counterexamples assign every original argument variable, including variables absent from the chosen path. Literal constraints determine their values; unconstrained variables use a deterministic false default. Direct classical evaluation independently confirms that every original premise is true, the original conclusion is false and every formula on the chosen path is true. This verification is separate from decomposition and coverage. Failure remains unassessable, not a guessed outcome or zero grade. Explicit falsity and all 26 uppercase variables are supported; `F` stays an ordinary variable.

The full report separates work status (`verified`, `incomplete`, `invalid`, `unassessable`) from argument status (`valid`, `invalid`, `undetermined`). Thus **verified invalid** means the student's tree has successfully refuted the argument; it does not mean their work is wrong. Report contracts link closed outcomes to checked closure evidence, pending formulas to occurrence evidence and counterexamples to complete open branches. Unverified work cannot claim an argument outcome or counterexample. Resource/verification failures discard partial certification.

This is deterministic checking of entered trees, not proof search. No application problem/answer unions, routes, persistence, UI, demo seeds or grading policies are enabled by this slice. Authoring/reference requirements and assignment-mode semantics still need their own agreed workflow slices before new admission.

Validation: workspace type checks and required package builds, all 813 engine tests (67 new whole-tree/model/report cases), 64 focused API contract tests, built CommonJS/ESM whole-tree/report round-trip smoke and formatting/whitespace passed. Forty generated completed-tree cases were compared with an independent exhaustive truth-value oracle. Other tests cover per-path occurrence coverage, sibling isolation, pending closure, incomplete versus erroneous work, constants, all 26 variables, independent premise/conclusion/path evaluation and resource/verification failures. Test-only tree construction is not a production solver. No database or browser run was needed for this checker-only slice.

## Following slices and decisions

1. The standalone truth-tree checker foundation is implemented above. Settle instructor reference requirements, allowed exercise goals and grading/review/completion semantics before integrating versioned authoring, assignments and student work. Reuse authorization, explicit saves, review and independent release where semantics agree; do not assume a natural-deduction report already fits.
2. Add practice and instructional UI/demo workflows, splitting into additional numbered branches if needed. Follow delivery with the dedicated truth-tree practice UI audit, then resume demo teaching-flow and genuine-account product audits. Confirm numbering when splitting; no additional branch or deployment is started by this plan.
