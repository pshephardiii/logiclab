# Formula grouping and decomposition verification

Branch: `036-feat-formula-grouping-and-decomposition`  
Final automated verification: November 24, 2026.

## Resulting behavior

New practice and authoring workflows require explicit grouping between different binary operators. `P & Q -> R` is rejected with a positioned `GROUPING_REQUIRED` error; `(P & Q) -> R` and `P & (Q -> R)` remain distinct valid choices. Parentheses and square brackets preserve author boundaries. Ordinary negation, aliases, resource bounds, semantic ASTs and version-1 table identifiers remain supported. Homogeneous table chains retain deterministic left-associated intermediate columns.

Catalog 2 adds separately permitted conjunct extraction for Fitch/dependency proofs and source-aware extraction/ordered disjunction cuts for truth trees. Explicit inner groups remain whole until separately opened by decomposition. Successful rule correspondences preserve inherited grouping, including when matching entered text omits parentheses. Per-path tree accounting distinguishes partial component use from complete decomposition, retains duplicates and requires all components on a completed open counterexample; early closure needs no unused remainder. Binary elimination and ordinary negative/conditional/biconditional patterns retain their exact rules.

Published definitions pin their policy/catalog. Save/check/finalization validates the student's version against the server-owned occurrence; submitted metadata cannot replace the statement or constraints. Existing catalog-1 and untagged content remains readable/evaluable under its saved interpretation. Immutable finals and numeric scores are not rewritten. Completion-only work can remain wrong but finished, with score-free verification warnings; graded acceptance and independent grade/answer release remain authoritative.

## Final automated checks

| Check                              | Result                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run check`                    | Passed: workspace type checks, 3,161 tests (1,133 engine, 1,241 API, 787 web), production builds |
| `npm run db:test`                  | Passed: 348 PostgreSQL checks (184 database, 164 API/workflow)                                   |
| `npm run format:check`             | Passed                                                                                           |
| Working-tree and branch whitespace | Passed                                                                                           |
| Local Markdown targets             | Passed                                                                                           |

The first full check found an obsolete dependency-contract fixture that treated now-supported proof version 2 as unsupported. Its unsupported-version case now uses version 3; the complete check then passed. PostgreSQL checks used isolated schemas in the configured disposable test database, with cleanup. No user development database was migrated or reset. Existing Jest VM-module advisories remain.

Coverage includes source spans and explicit delimiters; grouping errors/positions; unchanged AST/table IDs; chain positions and duplicate-looking members; explicit/inherited boundary erasure; ordinary rule correspondences; permissions/arity/scope/discharge/dependencies; target and unused errors; bounded malformed/resource failures; per-path completeness; immutable retries; publication and version-switch rollback; release/redaction; shared editor selection/dirty-state behavior; and demo reset/isolation.

## Focused browser and user QA

Earlier slice-level local Chrome checks exercised truth-tree extraction/early closure, ordered cuts, inherited boundaries, source-use markers and 390px containment. Proof checks exercised fresh catalog-2 defaults, grouped extraction followed by extraction from the resulting member, explicit checks, conclusion editing and a 390px dependency layout. Those practice-only checks stubbed anonymous session responses and made no assigned-work requests.

A later local Chrome check used temporary frontend and real stateless API servers with no database. It verified symbol conversion, debounced mixed-grouping refusal, disabled table creation, direct HTTP refusal for exercise/check/solution, and successful recovery with an explicitly grouped formula. Temporary browser/server processes were cleaned up; the final automated run did not repeat a full browser sweep.

The user reported the remaining brief practice checklist working after focused fixes. Their findings produced automatic table-input symbols, strict table practice grouping at frontend/API boundaries, a final table heading that preserves authored parentheses/brackets, and spacing above the tree validity question. This is user-reported focused practice QA, without a recorded browser/device matrix or screenshot set for every manual step.

Local scripts, screenshots and logs are ignored evidence rather than browser CI:

- `.codex-local/verification/grouping-editor/`
- `.codex-local/verification/grouping-proof-defaults/`
- `.codex-local/verification/table-grouping/`
- `.codex-local/verification/formula-grouping-final/`

The browser script initially used `/practice` rather than the actual `/` truth-table route; the corrected run passed. These scripts are supporting evidence, not committed browser regression tests.

## Compatibility and rollout

No migration or new environment variable. Rebuild/restart matching contracts, engine, database package, API and frontend outputs. New/reset demo visitors receive template 11 with matching catalog-2 proof/tree references, unchanged problem/assignment counts, weights and release policies. Authentication preserves existing visitor data. Explicit reset clears that visitor's work, rotates credentials and preserves the original absolute deadline and other visitors' records.

The public stateless truth-table endpoints now reject previously accepted ambiguous mixed-operator input; callers must group it explicitly. Stored assignments use separate pinned-policy workflows. Older applications may reject catalog-2 definitions, proof/tree versions, choice fields and reports; review rollback compatibility rather than stripping metadata or rewriting publications/finals.

## Limits and next work

Focused feature/practice verification does not constitute exhaustive product QA. No fresh clean installation, remote CI query, hosted deployment, live Cognito/email/payment check, load/soak run or accessibility/browser matrix was performed. API/database tests cover assigned workflows, but no new complete instructor-to-student browser journey was run at closeout. No proof search, automatic solvability guarantee, arbitrary custom rules, global associative equivalence, autosave or infrastructure provisioning was added.

Next proposed branch: `037-feat-practice-only-exposure`. Guard navigation, direct URLs and backend routes for a practice-only hosted build while preserving the full local product. Follow with reviewed inexpensive sandbox preparation and deliberate deployment promotion, then the separate portfolio project. The wider demo/account UI audits remain deferred before exposing those areas. See the [practice-first release plan](../planning/practice-first-release.md).
