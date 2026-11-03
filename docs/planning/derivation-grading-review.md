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

`tools/contracts/src/assignment-grading.ts` defines staged request and latest-decision contracts. Decisions address stable assignment-item IDs, so repeated versions remain independent. Requests carry a grading revision and one or more item changes; they cannot author actor/timestamp, frozen maxima, checker evidence or reference content. The latest decision state carries server-reviewed actor/time metadata separately from the immutable automatic score. This is not yet the append-only adjustment-history implementation.

Awards use the existing hundredth-point precision, allow zero and cannot exceed the frozen per-occurrence maximum. This slice uses optional awards represented by explicit null: null retains or restores the automatic award, so reverting a manually resolved erroneous proof returns it to pending review. Comment-only changes never manufacture an award. Every submitted item change includes both award and comment fields; unmentioned occurrences are left for the future update operation to retain. Clearing a comment uses null; non-null comments are trimmed, bounded to 4,000 characters and treated as plain text. These are per-problem comments, not line annotations or a reference-proof replacement.

Revision zero represents an empty initial decision set. Saved states require a positive revision, unique occurrence IDs and valid server metadata. Revisions are bounded to PostgreSQL integer range. The next persistence slice must compare the supplied revision under a submission/grading lock, increment only on a committed update and append adjustment history atomically. The contract alone does not perform concurrency control or enforce immutability.

`effectiveAssignmentScore` validates the frozen automatic point snapshot and latest decision state, rejects foreign occurrences/over-allocation and derives a detached effective score. It shares the existing point-summary arithmetic through `summarizeAssignmentScore`, retaining hundredth rounding and unresolved totals. It neither mutates inputs nor saves grades, checks authorization, applies release policy or reruns proof verification. Callers must supply authoritative final data. Malformed automatic evidence fails closed rather than being repaired by an override.

## Delivery boundaries

1. **Current slice:** staged grading contracts, pure effective-score calculation, regression coverage and these decisions. Existing HTTP/persistence/student/owner contracts remain unchanged; no migration or live manual-grade action is introduced.
2. Add separate persisted grading state and append-only adjustment history, with final-only owner authorization, revision conflict handling, transactional aggregate recomputation and rollback/concurrency tests. Keep original submission answers/results/automatic scores immutable.
3. Extend normal/demo owner review and released student projections, keeping comments, pending state, automatic diagnostics and reference access distinct. Add instructor editing/history and student display before enabling graded proof assignments.
4. Remove graded proof rollout guards only after the full workflow passes; complete focused normal/demo verification and final documentation/PR notes.

Graded derivation assignment authoring/publication and student availability remain guarded. A saved grading contract is not authorization to enable them. No new format, proof search, automatic partial-credit algorithm, extra credit, completion score or external infrastructure is included in this slice.

## Slice 1 verification — November 3, 2026

`npm run check` passed type checks, 1,525 tests (377 engine, 836 API, 312 web) and production builds. The 26 new cases cover partial/final review totals, explicit zero, corrections to automatic awards, comment-only decisions, restoration of automatic grading, independent occurrence identity/order, source preservation, numeric/comment/batch/revision bounds, strict server/evidence fields and malformed retained state. The focused scoring/grading run passed 58 cases before the full check.

Formatting, whitespace and this document's local Markdown target were checked. Logs: `/private/tmp/grading-slice1-contracts.log`, `grading-slice1-focused.log`, `grading-slice1-check.log` and `grading-slice1-format.log`. Existing Jest VM-module advisories remain.

No persistence/entity/migration/HTTP/UI changes, user development-database changes, provider calls or infrastructure provisioning occurred. PostgreSQL checks and browser walkthroughs were not repeated for this contract/pure-calculation slice. Grading revisions, history retention, owner authorization and student disclosure are design requirements for the dependent slices, not implemented runtime guarantees of these standalone contracts/functions. Graded proof rollout guards remain intact.
