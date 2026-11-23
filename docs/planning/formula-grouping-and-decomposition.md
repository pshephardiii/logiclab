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

## Slice 2 — explicit grouping policy and chain boundaries

Added engine grouping policy version 1: `formulaGroupingIssues` identifies ungrouped boundaries between different binary operators, with source spans/positions and actionable messages; `requireExplicitGrouping` opts a caller into positioned `GROUPING_REQUIRED` errors. Parentheses around the entire mixed expression do not resolve its internal ambiguity. Unary negation keeps its existing binding. Repeated conditionals retain their current right-association and receive no chain shortcut; repeated biconditionals retain the parser's existing explicit-group requirement.

`formulaChainMembers` returns ordered conjunction/disjunction members, retaining repeated members as distinct nodes and stopping at explicit descendant groups, different operators and negation. Selecting a grouped subexpression opens only that group's own interior. This is boundary analysis, not a rule permission, decomposition checker or completeness judgment. Existing callers have not opted in: published references, current authoring/UI and saved evaluation meanings remain unchanged. Wiring authoring to a persisted/versioned policy and implementing extraction/partition completeness are the next integration work.

Validation: 905 engine tests (42 new policy cases), engine type check/build and the built public-policy export smoke passed. Tests cover all three syntax entry points, mixed/grouped examples, diagnostics/positions, chains and nested boundaries, duplicate identities, foreign-node rejection, unchanged precedence/table IDs and existing resource limits. No API/database/frontend changes.

## Slice 3 — pinned truth-table authoring policy

Truth-table library definitions now optionally retain `formulaGroupingVersion: 1`, with the version constant shared by contracts and engine. Omission identifies retained precedence-based data; unknown versions are rejected. New/replaced truth-table definitions and new publications enforce explicit grouping and pin version 1 on the server, even if the request omits the field. An invalid mixed formula cannot bypass the new policy by removing the tag. Ordinary reads/assignment admission retain the older untagged interpretation without rewriting prior versions or results. Metadata-only edits and archive/restore do not upgrade an old formula; replacing its definition or publishing it does.

Publishing upgrades the mutable draft and new snapshot together under the existing lock/transaction, so successful publication does not create a false unsaved-publication difference. Failed replacement/publication leaves the draft and older snapshots intact. The library editor validates saves/previews locally, retains invalid input, and emits the pinned field for corrected definitions. This slice is truth-table authoring only: anonymous practice and proof/truth-tree authoring/evaluation are not switched yet, and decomposition shortcuts remain ahead. Truth tables retain existing deterministic left-to-right intermediate columns and IDs in this slice.

Validation: 219 focused API tests, 88 library UI tests, 42 engine policy tests and three focused PostgreSQL cases passed, plus API type checking and the frontend type check/production build. Workspace type checks initially caught an unsupported ORM convenience method in the new test; correcting it to persist/flush separately passed the API rerun. Tests cover server enforcement, local failure retention/recovery, unknown policies, old-version readability, metadata-only edits, atomic upgrades, publication summaries and rollback. No schema migration, user development database change or browser walkthrough. Rebuild matching contracts/engine/database-package/API/frontend outputs; older applications may reject the new definition field, so coordinate rollback.

## Slice 4 — proof/truth-tree authoring and pinned checks

New/replaced Fitch, dependency and truth-tree statements now pin the same optional `formulaGroupingVersion: 1`. Explicit grouping is required for parsed mixed-operator statements; unfinished/malformed draft text and private reference attempts remain retainable for later checking. Saving, previewing and entering reference construction validate grouping locally. Publication rechecks the saved reference under the pinned policy. Older untagged definitions retain their original interpretation; metadata-only edits/lifecycle operations do not upgrade them, and unavailable natural-deduction trees remain unavailable for new work.

Shared contracts and explicit projections retain the policy through public statements, authorized reference reveal, assigned checks/finalization and completion checks. The engine checks tagged statements and submitted formulas with strict grouping, returning ordinary invalid-formula/review evidence rather than silently applying precedence. Student answer payloads cannot override the server's policy. The original one-argument parsers remain unchanged, including callback usage. A pure projection helper preserves the omission of policy fields in historical shapes. New policy parsing is charged within existing work budgets.

Filled-but-wrong completion-only tree attempts still retain review warnings; proof final targets must remain parseable under the pinned policy. No numerical partial-credit or release-policy change. Associative shortcuts, explicit-boundary-aware rule matching and per-conjunct decomposition completeness remain the next slice; existing rule catalogs still require their original binary patterns. In particular, future chain matching must use authoritative premise boundaries rather than trust student-written replacement grouping.

The database suite exposed unnecessary draft timestamp updates during publication when a definition was cloned despite no policy change. Publication now writes the draft only for an actual policy upgrade, preserving unchanged conceptual/other draft timestamps. Snapshot expectations now include the server-pinned policy.

Validation: 908 engine tests, 442 focused API tests, 182 focused library/student UI tests and all 138 API PostgreSQL workflows passed. The final reference-entry guard was rechecked with all 90 library UI cases. Workspace type checks and the frontend type check/production build passed. Coverage includes tagged/untagged statements and submissions, source positions, unknown versions, private/public projections, rejected policy overrides, reference publication, score-free warnings and normal/demo retained workflows. Formatting and whitespace passed. No migration, user development database change or real-browser walkthrough. Rebuild matching workspace outputs; older applications may reject the optional field. No demo template bump in this intermediate slice; final seed/version guidance will be settled with the remaining feature work.

## Slice 5 — staged positive-chain expansion matching

Added the typed engine helper `matchTruthTreeChainExpansion`, staged for truth-tree catalog 2. A selected conjunct is identified by its zero-based position among authoritative top-level chain members; its result does not need a copied remainder. Disjunction uses an explicit cut between members and exactly two ordered results, preserving every alternative. Explicit descendant groups, different operators and negation stop flattening. Duplicate conjuncts retain distinct indices. Only structural matching of each selected member/partition is performed; this is not general associative-equivalence rewriting.

Matched results include internal continuation text that retains inherited group boundaries and additional entered groups. If a student omits an inherited boundary while writing a structurally equal result, it is restored in that internal text; subsequent matching must use this authoritative continuation rather than the raw entered formula. Root-only wrapping remains redundant. Continuation data is not student feedback or an answer-reveal payload. Invalid authoritative formulas, unsupported versions and resource exhaustion remain unassessable; wrong results/choices are mismatches, never invented point scores.

The public full-tree catalog/checker remains version 1 in this slice and still rejects conjunct-extraction rule claims. No definition, saved tree, student route, editor or grading workflow opts into catalog 2 yet. Contract integration, authoritative occurrence tracking and per-path/per-member completeness follow next; a single extraction must not prematurely complete an open path. Existing closed-path and frozen-result behavior is unchanged.

Validation: all 946 engine tests passed, including 38 new cases for extraction, every disjunction cut, explicit boundaries, negative/invalid choices, missing/reordered alternatives, duplicate identities, inherited/student grouping, truth-value soundness, input preservation, compact length-boundary sources, oversized restored continuations, exhausted budgets and the unchanged catalog-1 guard. Engine type check/build, built public-export smoke, formatting and whitespace passed. No API/database/frontend change or browser run was needed for this staged engine-only slice.

## Slice 6 — catalog-2 full-tree checking and path completeness

Standalone tree/problem/report contracts now support an explicit catalog-2/tree-version-2 pair with grouping policy 1 and bounded component/cut choices. Catalog 1 remains the default and retains its old shapes/rules; mismatched versions cannot downgrade checking. Whole-tree and step report catalog versions must agree. Current application definitions/student answers still require catalog-1 trees through an explicit guard, so these contracts do not enable unsupported UI/API work.

Full-tree catalog 2 now processes expansions in source-dependency order, derives initial constraints from the pinned statement and carries grouping through both chain and ordinary binary rules. Internal authoritative sources preserve inherited and student-added groups even when entered spellings erase boundaries. Positive cuts follow graph child order rather than transport-array order. These internal continuations never enter public diagnostics.

Coverage tracks distinct conjunct positions per source and per path, deep-copying inherited partial sets at forks. Repeated extraction and sibling work cannot satisfy another member/path. A valid closed branch needs no copied remainder; an open path must finish every compound obligation. One complete open path can establish invalidity even when another path remains unfinished, while completion-only work still requires all paths finished. Filled wrong values/closures remain reviewable completion attempts; missing/out-of-range choices do not. Unused mistakes continue to prevent whole-tree verification.

Validation: all 970 engine tests, 107 focused API/contract cases, workspace type checks and production builds passed. Built-package smoke verified catalog-2 checking/completion and the application guard. Tests cover all cuts, early closure, partial/duplicate extraction, fork inheritance, original/derived boundaries, wrong-but-filled work, ordering, missing alternatives/choices, version/report mismatches and source-aware preservation of all nine binary rule patterns. Formatting/whitespace passed. No SQL migration, application rollout, database rerun or browser walkthrough was needed for this engine/contract slice.

Next: enable catalog 2 in authoring/assigned workflows together with component/cut editor controls, update completeness/markers and preserve implicit-versus-explicit grouping in display (do not invent left-fold parentheses for an ungrouped chain). Keep older published/frozen work on catalog 1. Derivation rule variants and remaining practice integration still require their planned work; this is not branch closeout.

## Slice 7 — pinned catalog-2 application workflows

Authoring/content/solution contracts now accept catalog 2 with grouping policy 1, and reference trees must match their definition's catalog. Student transport can retain either tree version, but save/check/final evaluation requires the version pinned by the assigned problem. Wrong-version writes fail without creating an attempt or advancing its revision. Incorrect or unfinished same-version drafts remain saveable; checks remain transient. Publication and answer reveal reverify the exact saved reference, preserving private explanations and existing independent release rules.

Normal/demo workflows now cover catalog-2 extraction, selected disjunction cuts, early closure, all-path completion, review flags, frozen results and release/redaction alongside catalog-1 regression cases. No saved/published definition or final result is converted. No migration or demo template change. This slice separates the application version boundary from its dependent editor work: current frontend defaults remain catalog 1 until component/cut controls, authoritative continuation choices and progress markers are implemented. Display must still stop inventing parentheses around ungrouped chains; derivation variants and anonymous practice adoption also remain pending.

Validation: 116 focused contract/API tests, 133 relevant frontend tests and all 142 API PostgreSQL workflows passed; the eight affected normal/demo workflows also passed a focused rerun. Workspace type checks and matching production builds passed. Formatting and whitespace checked. No browser walkthrough or development-database migration/reset was performed in this backend integration slice.
