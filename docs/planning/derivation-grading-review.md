# Derivation grading and instructor review

Branch: `024-feat-derivation-grading-review`. Builds on weighted assignment scoring, the propositional checker, pinned derivation authoring/student work and explicit review-store assembly. See the [agreed derivation sequence](logical-derivations.md#024-instructor-review-and-awarded-grades).

## Confirmed behavior

On November 3, 2026, the user confirmed that instructors may adjust points and leave comments on **any graded occurrence**, including automatically correct proofs, truth tables and conceptual questions. Corrections to already released grades become visible under the existing release policy; there is no second release action for corrections. Preserve the original automatic evidence and retain instructor adjustment history separately.

- Accepted proofs receive automatic full credit. Any erroneous, incomplete or unassessable proof starts with pending review and no invented numeric award. Unused mistakes still require review.
- An explicit instructor award resolves that occurrence's grading requirement without changing the checker verdict, proof, automatic award or reference. Zero is a resolved grade, not pending work.
- Any remaining unresolved occurrence keeps the effective assignment total and percentage null, while independently resolved item awards remain available in authorized review.
- Student-specific checker reports and instructor comments follow result/grade release. Held results remain withheld even after manual grading or reference reveal. Released but unresolved work shows its pending state rather than a final numeric assignment grade.
- The instructor reference remains under independent answer reveal. Releasing grades/comments or changing an award does not release the reference.
- Completion-only proof verification remains score-free; private practice remains private. Manual point grading is for final graded submissions.

## First-slice model

`tools/contracts/src/assignment-grading.ts` defines staged request and latest-decision contracts. Decisions address stable assignment-item IDs, so repeated versions remain independent. Requests carry a grading revision and one or more item changes; they cannot author actor/timestamp, frozen maxima, checker evidence or reference content. The latest decision state carries server-reviewed actor/time metadata separately from the immutable automatic score. These contracts describe latest decisions; append-only persistence is described in slice 2 below.

Awards use the existing hundredth-point precision, allow zero and cannot exceed the frozen per-occurrence maximum. This slice uses optional awards represented by explicit null: null retains or restores the automatic award, so reverting a manually resolved erroneous proof returns it to pending review. Comment-only changes never manufacture an award. Every submitted item change includes both award and comment fields; unmentioned occurrences are retained by the update operation. Clearing a comment uses null; non-null comments are trimmed, bounded to 4,000 characters and treated as plain text. These are per-problem comments, not line annotations or a reference-proof replacement.

Revision zero represents an empty initial decision set. Saved states require a positive revision, unique occurrence IDs and valid server metadata. Revisions are bounded to PostgreSQL integer range. The persistence implementation compares the supplied revision under the submission lock and appends a new grading revision atomically; failed transactions do not advance it. The contract alone does not perform concurrency control or enforce immutability.

`effectiveAssignmentScore` validates the frozen automatic point snapshot and latest decision state, rejects foreign occurrences/over-allocation and derives a detached effective score. It shares the existing point-summary arithmetic through `summarizeAssignmentScore`, retaining hundredth rounding and unresolved totals. It neither mutates inputs nor saves grades, checks authorization, applies release policy or reruns proof verification. Callers must supply authoritative final data. Malformed automatic evidence fails closed rather than being repaired by an override.

## Delivery boundaries

1. **Completed foundation:** staged grading contracts, pure effective-score calculation, regression coverage and these decisions. No live manual-grade action was introduced in that slice.
2. **Current persistence slice:** separate append-only grading revisions, final-only owner authorization, revision conflict handling, aggregate recomputation and rollback/concurrency coverage. Original submission answers/results/automatic scores remain immutable.
3. Extend normal/demo owner review and released student projections, keeping comments, pending state, automatic diagnostics and reference access distinct. Add instructor editing/history and student display before enabling graded proof assignments.
4. Remove graded proof rollout guards only after the full workflow passes; complete focused normal/demo verification and final documentation/PR notes.

Graded derivation assignment authoring/publication and student availability remain guarded. A saved grading contract is not authorization to enable them. No new format, proof search, automatic partial-credit algorithm, extra credit, completion score or external infrastructure is included in this slice.

## Slice 1 verification — November 3, 2026

`npm run check` passed type checks, 1,525 tests (377 engine, 836 API, 312 web) and production builds. The 26 new cases cover partial/final review totals, explicit zero, corrections to automatic awards, comment-only decisions, restoration of automatic grading, independent occurrence identity/order, source preservation, numeric/comment/batch/revision bounds, strict server/evidence fields and malformed retained state. The focused scoring/grading run passed 58 cases before the full check.

Formatting, whitespace and this document's local Markdown target were checked. Logs: `/private/tmp/grading-slice1-contracts.log`, `grading-slice1-focused.log`, `grading-slice1-check.log` and `grading-slice1-format.log`. Existing Jest VM-module advisories remain.

No persistence/entity/migration/HTTP/UI changes, user development-database changes, provider calls or infrastructure provisioning occurred. PostgreSQL checks and browser walkthroughs were not repeated for this contract/pure-calculation slice. Grading revisions, history retention, owner authorization and student disclosure are design requirements for the dependent slices, not implemented runtime guarantees of these standalone contracts/functions. Graded proof rollout guards remain intact.

## Slice 2: persisted instructor grading and retained adjustments

`SubmissionGradingRevision` stores each committed change set, the resulting latest-decision snapshot and effective point score, reviewer identity and database-sampled timestamp. The latest revision is current grading and earlier rows are the adjustment history; no second mutable current-state table is needed. A missing row means revision zero and the frozen automatic score. Returned grading/history contracts validate occurrence uniqueness, saved decision/actor/time correspondence and bounded pagination; database JSON types remain independent from transport contracts.

The internal `createSubmissionGradingStore` authorizes the instructor-owned assignment, requires final graded work and uses the caller's transaction or owns a fresh one. Writes take the assignment shared lock followed by the attempt write lock, compare the supplied grading revision, merge changes by occurrence ID, validate/recompute the effective point score and append one immutable revision. Reads/history take the same parent locks in shared mode, so they do not mix uncommitted grading with a final snapshot. Archived history stays readable; archived assignments reject new grading. Invalid/foreign awards, stale revisions and unsupported/draft work append nothing. Failed inserts and caller rollback leave both latest grading and history unchanged.

Original attempt answers, checker reports, automatic scores, submission revisions/timestamps and independent grade/answer release metadata are never updated. Reopening an award with null restores its automatic state and can return the effective total to pending review. History retains earlier effective scores and comments even after later corrections. This internal store is not yet assembled into route contexts; owner HTTP/actions, ordinary review projections and released student grading remain for the next slices.

`Migration20261103120000` adds the grading-history table, restrictive parent/reviewer relations, revision uniqueness/state checks, serialized final-only append validation and immutable-history triggers. Rollback refuses retained instructor grading rather than dropping decisions. Existing submitted-attempt retention is untouched. Demo reset/expiry deletion checks reviewer/attempt ownership alongside existing boundaries, deletes grading revisions before attempts and permits that deletion only for the same resetting/expired workspace. Ordinary history cannot be updated or deleted. Migration generation used offline metadata/snapshots; only disposable test schemas/databases were migrated during verification.

Rollout: migrate before using the new store and rebuild matching database/contracts/API outputs. No new environment variable or demo template is required. Coordinate application rollback once grading exists: older applications ignore instructor grading, and older demo deletion code does not remove its retained history. Database rollback is refused while rows remain. Public graded derivation authoring/availability stays guarded, and no endpoint/UI is enabled by this persistence slice.

### Slice 2 verification — November 3, 2026

`npm run check` passed type checks, 1,527 tests (377 engine, 838 API, 312 web) and production builds. `npm run db:test` passed 287 PostgreSQL checks (184 database, 103 API/workflow). The 18 new cases cover database JSON/contract compatibility and history provenance, migration down/up and rollback refusal, final-only database admission, immutable/sequential history, mixed correction/reopening/total calculation, bounded history pages, owner/student/draft/mode/archive rejection, revision races, insertion/caller rollback, demo transaction rollback/isolation/reset and an observed archive lock wait with post-wait rejection. Original final evidence and independent release metadata remain unchanged.

Verification exposed and corrected a test fixture with incompatible completion/grade-release policy, PostgreSQL function-name truncation and schema comparison of JSON-array bounds. The new triggers use short names, explicit array-bound comparisons and a migration that passes fresh down/up and schema comparison. The empty grading migration was rolled back/replayed only in the disposable test database while fixing it. Application snapshots add this table without unrelated schema rewrites.

Formatting, whitespace and local Markdown targets passed. Logs: `/private/tmp/grading-slice2-check.log`, `grading-slice2-db-final.log`, `grading-slice2-format.log`; migration generation/inspection scripts remain ignored under `.codex-local/verification/grading-slice2/`. Existing Jest VM-module advisories remain. No user development database was migrated/reset, browser/visual walkthrough or live provider check was run, or infrastructure was provisioned. Normal/demo route-context assembly, owner HTTP actions, public review/student projections and UI remain for subsequent slices; public graded derivation admission is still guarded.
