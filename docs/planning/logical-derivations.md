# Logical derivations

Status: implementation sequence agreed on `018-docs-derivation-planning`; scoring branch 019 is complete and proof-checker branch 020 has started. This document retains the agreed product direction and future checkpoints. See the [proof-checker foundation](propositional-proof-checker.md) for the confirmed classical direction and concrete catalog variants under review. Future authoring/student/review branches are not started by this document.

## Product direction and scope

The user has moved derivations ahead of the UI/visual audit and initial portfolio sandbox. The platform is not tied to one textbook, so proof presentation and rule terminology should accommodate different teaching approaches. Derivations will likely span several feature branches; settle the design and delivery sequence on this planning branch first.

Initial logical scope is propositional logic. Predicate logic/quantifiers, truth trees/tableaux and automated proof search are deferred. Natural-deduction proof trees are included in the target formats below; they are distinct from truth trees. Precise initial connective/rule coverage and which format ships in each implementation branch remain open.

## Agreed direction: proof formats

Plan for three natural-deduction formats:

| Format                          | Student representation                                                                      | Format-specific structural checks                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Fitch-style                     | Numbered lines, nested subproofs, rule citations and line/subproof references               | Open assumptions, accessible lines, nesting and subproof boundaries                              |
| Dependency-style numbered lines | Numbered steps with explicit assumption/dependency information                              | Dependency tracking and discharge, with the exact dependency-entry convention still to be chosen |
| Natural-deduction proof trees   | Inferences connecting premise derivations to conclusions, with marked assumptions/discharge | Parent/child relationships and the assumptions discharged by an inference                        |

Boxes versus scope lines, indentation and citation styling can be presentation options within a format. Dependency-style lines and trees change how proof structure is expressed, so they require more than alternative renderers. These are target formats, not a claim about which three formats are most common or a commitment to ship all three at once.

For instructor-authored problems, the instructor chooses one required format per problem. Students cannot choose or change that format, including when an instructor assignment is ungraded practice. Freeze the required format with the published problem snapshot.

Students choose a format only for practice problems they create themselves, and choose it before starting the proof. If they try to switch formats afterward, warn that their current progress will be lost. Cancel keeps the existing format and proof unchanged; confirming discards the current proof and opens a fresh, empty derivation setup in the selected format. This is a destructive restart, not conversion or preservation of proof steps. The warning applies even when the current proof was explicitly saved. Student-created derivation practice is a planned workflow, not an existing implemented feature. Confirming clears the entire practice setup, including premises, target conclusion, proof steps, references, assumptions and prior checking feedback. Only the newly selected format carries into the empty setup; there is no automatic carryover of the problem statement.

## Shared reasoning and format-specific structure

Keep proof format independent of the underlying proof system/rule-set profile. Where the precise rule requirements match, share logical validation across formats. Each format still needs its own editor, structural validation and useful error messages.

For example, implication introduction derives Q under an assumption P and discharges that assumption to obtain P → Q. Fitch presents a cited subproof; dependency-style proofs track the assumption dependency explicitly; trees mark discharge over a derivation. The shared logical obligation does not remove the need to validate each representation's structure.

A proposed shared internal model records formulas, stable step/node identities, inference references, assumptions and discharge explicitly. Displayed line numbers should not be stored as fragile identities: inserting a line must not silently change what another step cites. The precise model, translation between formats and validation boundaries remain design work; do not assume every proof/rule variant translates automatically.

Some bookkeeping is format-specific. Explicit reiteration/copying in a numbered proof need not correspond to the same visible step in a tree. Structural variants must remain explicit rather than being treated as interchangeable labels.

## Agreed direction: rules and per-problem permissions

Support foundational rules and supported derived rules/shortcuts. The foundational/derived distinction is relative to a chosen calculus, not universal across textbooks or formats. Disjunction elimination is foundational in many natural-deduction systems; disjunctive syllogism is an example of a rule that a system may offer as a derived shortcut.

An instructor rule-set profile supplies defaults. Each problem selects permitted rules from that profile, including supported derived shortcuts. Publish the rule permissions and their relevant versions with the immutable problem snapshot so later profile edits cannot change an assigned exercise.

Every student step must use an enabled supported rule variant. Disabling a derived shortcut prevents citing it as one step; it does not prohibit constructing its reasoning through permitted steps. Students may submit any valid proof satisfying the problem's restrictions, rather than reproducing the instructor's reference proof.

Rule identities must capture exact requirements. Different books may use similar names for different formulations, including different discharge requirements or the permitted location of an equivalence replacement. Do not group those variants solely because their labels sound similar. Exact primitive rules, derived shortcuts, classical principles and structural conventions remain undecided. For MVP, use a curated catalog of commonly taught propositional rules and supported derived shortcuts. The exact catalog/variants will be proposed during implementation planning rather than attempting exhaustive textbook coverage. Instructors may select supported rules and customize labels, but cannot define custom rule behavior or axiom schemas in MVP. Custom rule definitions are a possible later feature only if consistent validation can be designed.

## Agreed direction: instructor terminology

Use stable internal rule identities independently of displayed names. Offer built-in labels/abbreviations and allow instructors to choose the terminology matching their teaching. The discussed configuration direction includes an optional custom label, profile-level defaults and per-problem overrides where useful.

Examples of labels that can refer to the same supported variant:

| Rule identity/concept    | Candidate display labels                                                              |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Implication elimination  | Modus ponens, implication elimination, conditional elimination, → Elimination, →E, MP |
| Conjunction elimination  | Simplification, conjunction elimination, ∧ Elimination, ∧E                            |
| Implication introduction | Conditional proof, implication introduction, → Introduction, →I, CP                   |

Show the chosen label consistently in proof controls, the rule guide and feedback. Store stable rule identities in steps, and freeze the effective label configuration with the published problem. Renaming a rule does not alter its logical meaning or grant permission to use it.

Avoid ambiguous configurations where different enabled rules share a selectable label/shortcut. Exact collision matching, custom-label bounds, which aliases students may enter and whether alternative names appear as secondary hints remain open. Variants that accept different arguments or have different requirements need distinct identities even if textbooks give them related names.

## Agreed direction: establishing solvability

The initial approach is an instructor-provided reference proof checked under the problem's permitted rules and chosen proof format. A valid reference establishes at least one acceptable solution under those exact conditions. A truth table can establish semantic validity, but cannot certify derivability under an arbitrary restricted rule selection.

Instructor drafts may be saved without a reference proof. Publication requires a complete reference proof accepted under the required format and enabled rules. Treat it as privileged instructor content; it must not appear in ordinary student exercise payloads. The reference is the solution shown when answer reveal permits access. Feedback must also address the student's actual submitted proof through its checker report and instructor comments, rather than merely presenting the reference as the expected path. Alternative valid proofs remain acceptable.

An instructor reference proof must validate in the problem's required format under its permitted rules. There is no initial need to certify multiple student-selectable formats for one assigned problem. If an instructor later authors a separate version in a different format, that version needs a reference validated under its own configuration; an old reference does not automatically establish cross-format solvability. Whether student-created practice needs any solvability/reference requirement remains open and should be considered separately from instructor publication.

Automated proof search can come later. Its outcomes must distinguish proof found, search limit reached/unknown, and not derivable. Failure to find a proof within a budget is not proof that the exercise is unsolvable. A conclusive negative result requires a procedure that justifies that conclusion for the exact restrictions.

## Agreed direction: grading and instructor review

Separate formal proof validation from the awarded grade. For graded derivation submissions, automatically award full credit only when the proof establishes the target under the required format/permitted rules and the entire submission has no mistakes or unresolved checks.

Any mistake triggers **Needs instructor review for grading**, including an invalid step that is unused by an otherwise valid concluding derivation. Teacher discretion determines whether/how much that unused error affects the grade. Incomplete proofs and submissions that cannot be fully assessed also require review. This status is not an automatic zero or a numerical partial-credit calculation.

The instructor examines the submission and checker report, then assigns/adjusts the score and supplies comments according to their preferences. Preserve the original automatic validation report and record instructor grading separately rather than overwriting the evidence. Instructor-defined problem weights govern contribution to the assignment grade. Exact weight representation/point scales, adjustment permissions/history and detailed release behavior remain to be designed. Pending review must not be represented as an already determined numerical grade.

For graded assignments, any proof awaiting grading review flags both that problem and the assignment **Needs instructor review for grading**, even if every other item has an automatic grade. Retain known item results internally, but do not present the overall grade as finalized while any required review is unresolved. Resolving review means the instructor has assigned a grade; it does not require changing the student's proof into a correct proof. Preserve the original correctness report separately from review status and the awarded score. The instructor chooses each problem's contribution to the assignment grade, including in mixed assignments. A completely accepted proof receives the full allocation for that problem; instructor review determines the awarded portion for other proofs. Proof length, line count or the number of checks must not determine its weight. Raw truth-table cell/choice correctness remains evaluation evidence rather than implicitly determining the weight of a problem relative to a derivation. Existing stored results must remain readable; compatibility/backfill and the treatment of other exercise types need explicit implementation planning.

Initial automated partial credit is not required. Do not derive points from proof length, percentage of locally correct lines or similarity to the reference proof. Optional instructor checkpoints/rubrics were discussed as a possible later extension, not a committed initial feature.

## Agreed direction: checking and feedback visibility

For student-created practice and instructor-assigned practice, show proof diagnostics only after an explicit **Check proof** action in MVP. Do not automatically check on typing, blur or a debounce timer, including formula syntax errors and invalid rule/reference/scope errors. Checking evaluates the current proof without implicitly saving or submitting it. Diagnostic categories can differ in detail without changing this timing. Do not promise a checked result remains current after the proof is edited; stale-feedback clearing/cancellation details belong in implementation design.

For graded work, hide proof/syntax/rule correctness diagnostics before final submission and provide no pre-submission Check proof action in MVP. After submission, disclose feedback only when the applicable feedback/result-release policy permits it. Final submission is not automatically permission to reveal feedback on an instructor-held release policy. Keep the reference proof/answer reveal separately controlled as already agreed; releasing one must not silently release the other.

Agreed release mapping: student-specific proof diagnostics and instructor comments follow grade/result-feedback release. The instructor reference proof follows the separate answer-reveal policy. Releasing answers does not release the student-specific checker report or comments, and releasing result feedback does not reveal the reference proof. Submission-time result feedback becomes available after submission; instructor-held result feedback stays hidden until release. Pending-review status and behavior when a released assignment still has unfinished instructor grading need detailed specification without exposing a finalized grade prematurely.

Ordinary authentication, request/storage failures and resource-limit messages must remain actionable without revealing hidden proof correctness. The draft/submission representation must accommodate unfinished and incorrect proof content within safe structural/size bounds; an invalid proof is not necessarily an invalid HTTP payload. Exact error/storage boundaries remain design work.

More flexible instructor-selected pre-submission feedback policies are deferred beyond the initial implementation, but leave room for them in the policy model. Completion-only derivation checking/review behavior also needs explicit treatment; do not silently turn existing score-free completion into correctness grading.

## Checker reports and deterministic summaries

The proposed summary mechanism uses structured checker results and deterministic templates, not an AI-generated interpretation of the student's reasoning. For each submitted line/inference, record its stable identity, formula, selected rule, cited supports, relevant scope/assumption information and a specific diagnostic when validation fails. Present references and rule labels in the instructor's configured format/terminology.

Distinguish:

- **Locally valid:** the inference matches its rule and structural requirements relative to the cited formulas and scope.
- **Established:** a locally valid inference whose supporting derivations are established from permitted premises/assumptions. Temporary assumptions remain subject to scope/discharge; a conclusion depending on an undischarged temporary assumption is not an established solution to the original problem.
- **Invalid:** a rule, reference, scope or other formal requirement fails.
- **Not assessable:** malformed or unresolved structure prevents a reliable judgment. This is not automatically a further independent logical mistake.

Track dependencies to distinguish original failures from their downstream effects. For example, line 3 can be invalid while lines 4–5 correctly apply their rules to supplied formulas but ultimately depend on line 3. Report both local correctness and the invalid dependency; do not present the downstream lines as established or mechanically count each as a fresh independent error.

Generate a brief overall report with expandable step details, for example:

> Needs instructor review for grading. The final formula matches the target, but its derivation depends on an invalid inference at line 3. Lines 4–5 apply their rules locally correctly but depend on that inference. The target has not been established.

For an unfinished proof, report any validated work, that the target is not established and any detected open/unfinished subproofs. For a valid concluding derivation with unused erroneous steps, explicitly report that the target is established but other submitted steps require instructor review. These cases share a review status, not necessarily a deserved score.

Summaries explain formal findings, not speculative student intentions or an estimated distance from a solution. Exact report schemas, dependency propagation, structural-error recovery, diagnostic wording and versioning are still design work. Checker time/resource limits or internal failure must not be described as proof that the student's argument is invalid; recovery and review behavior need explicit handling.

## Open questions to discuss next

Remaining proof-format questions include:

- Exact entry conventions for lines, dependencies, assumption blocks and proof trees, using the same short proof as an example in each format.
- Practice format switching is settled: confirmation clears the entire setup, including premises and target, and opens the selected format with no proof progress.
- How instructor defaults and per-problem format selection appear in authoring; publication fixes one required format and a reference validated in that format.
- Which differences are visual preferences versus distinct structural rule variants.

Instructor control of per-problem weights is agreed. Decide the concrete representation (for example, maximum points), defaults, bounds, permitted score precision and when assignment weights become immutable during implementation planning. The release mapping for diagnostics/comments versus the reference proof is agreed above; pending-review visibility and interactions between release and unfinished instructor grading still need detailed design. Later implementation design includes precise rule variants/versioning, draft/reference-proof editing, checker report structure, score/override persistence, save/conflict handling, bounded resource use and accessibility. The reference-publication requirement, manual practice checks, hidden pre-submission graded diagnostics, assignment-level review flag and full practice reset above are agreed; detailed policy/schema choices remain open.

## Agreed implementation sequence

The user accepted this breakdown. Numbers `019`–`026` are provisional reservations: no matching local branch exists at this planning check, but remote history was not queried. Confirm availability before creation. Do not reuse an occupied number or silently renumber branches already started. These are feature boundaries; each should be delivered in small reviewable slices with its own tests, compatibility notes and local PR description.

| Proposed branch                         | Depends on                                                        | Reviewable outcome                                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `019-feat-assignment-scoring`           | Existing assignment/results workflows                             | Instructor-controlled maximum points/weight per assignment item, awarded-score representation and weighted totals, with compatibility for existing results.                                   |
| `020-feat-propositional-proof-checker`  | Existing formula parser; can be designed independently of scoring | Curated versioned rules, stable proof identities, Fitch-compatible structural validation and deterministic reports; no student UI.                                                            |
| `021-feat-derivation-authoring`         | 020                                                               | Immutable derivation definitions and instructor Fitch/reference-proof editing, permitted rules and labels, draft validation and checked publication.                                          |
| `022-feat-derivation-student-work`      | 019–021                                                           | Fitch student editing, revisioned saves, assigned practice checking, completion/finalization plumbing and protected feedback/reference projections. Graded release remains guarded until 023. |
| `023-feat-derivation-grading-review`    | 019 and 022                                                       | Instructor reports/comments, awarded-score adjustments and review resolution; complete assignment grading and release behavior. Enable graded derivations only when this workflow is ready.   |
| `024-feat-dependency-proof-format`      | 020–023                                                           | Dependency-style structural validation, reference/student editors and final review through the existing grading/release flow.                                                                 |
| `025-feat-natural-deduction-trees`      | 020–023; scheduled after 024                                      | Natural-deduction tree structure/editor, assumption discharge, reference validation and student/review integration. Not truth trees/tableaux.                                                 |
| `026-feat-derivation-practice-and-demo` | All preceding derivation branches                                 | Student-created practice setup and confirmed full resets, representative synthetic demo examples and cross-format workflow verification.                                                      |

After these, return to the UI/visual audit and inexpensive portfolio sandbox preparation. Assign fresh numbers for those branches when scheduled. A separate broad code audit is not silently added as a release prerequisite by this sequence.

### 019: assignment scoring

Branch `019-feat-assignment-scoring` implements per-occurrence allocations, frozen point totals, instructor draft controls and released student/instructor score views for existing exercise types. All graded work uses the single point model; score-free modes remain score-free. Unresolved-review outcomes are represented but proof submission/manual grading are not enabled. See [scoring decisions and rollout boundaries](assignment-scoring.md) and [verification](../verification/assignment-scoring-verification.md).

Keep scoring policy separate from proof correctness and checker reports. Store the allocation on the assignment item, not the reusable problem, so the same published problem can have different weights in different assignments.

Small slices:

1. Settle maximum-points/weight representation, defaults, precision, bounds, how weights are locked and how existing table/choice results map to scores. Design compatibility before changing persistence or transport contracts.
2. Add versioned persistence/contracts and pure score aggregation. Preserve historical frozen results; do not silently reinterpret old submissions or count proof lines as points. Represent unfinished grading distinctly from a numeric zero.
3. Add instructor assignment controls and student/review summaries. Test mixed item types, repeated occurrences, duplication, old submissions, empty/zero-total configurations if permitted, and pending-review aggregation.

This branch should be useful for existing exercise types without requiring derivation UI. If compatibility and authoring prove too large for one branch, split before implementation and allocate a fresh number rather than dropping those requirements.

### 020: proof checker foundation

The first five slices implement a versioned, separately selectable classical catalog, structural equality, proof-only contradiction parsing, bounded standalone proof/report contracts local formula-pattern checks for all 19 rules, bounded Fitch layout/reference analysis, and standalone whole-proof evaluation. The user confirmed classical natural deduction with independent classical-rule permissions. The [concrete rule/convention document](propositional-proof-checker.md) records exact variants, flat Fitch serialization, budgets and remaining structural checks. Local rule matching is available over trusted resolved formulas. Fitch identities, scopes, closed-child citations and structural limits are now checked. The standalone checker now validates premise correspondence, propagates invalid/unknown support, checks the final root target and reviews unused errors. Public endpoints, derivation definitions, authoring/student workflows and grading remain unavailable.

Small slices:

1. Agree a concrete propositional rule catalog and precise variants. Use a classical propositional starting point as a proposal to confirm, not an implicit decision about every classical principle. Include familiar introduction/elimination patterns and selected derived shortcuts; no arbitrary instructor-defined behavior. Define supported connectives, contradiction notation and structural conventions.
2. Define proof/rule/report versions, stable step/assumption identities and format-neutral logical checks with a Fitch structural adapter. Test rule instances, references, scope/discharge, invalid dependency propagation, unused errors and incomplete/unassessable structures. Anticipate the other two representations without implementing their editors or assuming automatic conversion.
3. Add deterministic summaries and bounded validation with explicit unknown/failure outcomes. Exercise both valid proofs and invalid near-misses. A semantically valid conclusion alone is not proof that the supplied permitted-rule derivation is correct.

Keep this engine independently testable; no database, UI, assignment grade writes or general proof search is required here.

### 021: derivation authoring

This is one of the larger branches. Keep its slices separated rather than delivering persistence, editor and publication in one change:

1. Stage derivation definition/reference-proof contracts and immutable persistence compatibility. Pin required format, rule-set semantics/version, enabled rules and effective labels with the published definition. Keep premature assignment/student acceptance guarded.
2. Add private instructor create/read/edit/history and reference validation. Drafts can be incomplete; publication requires an accepted reference in the required format under the permitted rules. Student projections exclude reference content.
3. Add the instructor Fitch editor, rule/label selection, local preview and recoverable save/validation states. Preserve archived locks, stable references and dirty-work protection. Verify later draft/key/rule-label edits cannot alter an existing publication.

Additional formats become authorable only when their own reference validation and complete workflows are implemented. If editor complexity exceeds a reviewable branch, split it explicitly with new numbering; do not enable publication with an incomplete validator.

### 022: student work and finalization

This is also a larger branch; preserve the boundary between the checker and request/state coordination:

1. Extend typed saved work and immutable submission/report snapshots, enrollment/workspace authorization and existing revision/transaction protections. Safely retain incomplete/incorrect proof content within structural/size bounds.
2. Add assigned practice Check proof and protected graded finalization. A complete accepted graded proof gets its full allocation; any error, incomplete work or unresolved evaluation records review-needed state for the problem and assignment. Include unused erroneous steps. No numerical automatic partial credit or finalized overall grade while review is pending.
3. Add student Fitch editing, explicit saves, unsaved-navigation protection, manual checks and read-only submitted views. Keep syntax/rule diagnostics hidden before graded submission. Preserve independent result-feedback and reference-proof access; reject stale responses after edits/lifecycle changes.

Instructor-assigned practice belongs here; student-created practice setup belongs to 026. Completion-only semantics need an explicit design checkpoint before enabling derivations in that mode, preserving score-free completion rather than assuming correctness grading.

022 and 023 are a single functional release milestone. Keep graded derivation assignment creation/publication or student availability guarded until instructors can inspect and resolve every flagged submission. Internal fixtures may test the staged paths, but users must not accumulate submissions that have no usable grading workflow.

### 023: instructor review and awarded grades

Small slices:

1. Define pending/reviewed states, numeric score validation and immutable checker evidence versus editable awarded grading. Settle review-status visibility, release-before-review behavior, comments and subsequent corrections before implementing transitions.
2. Add owner-authorized report/review/score/comment operations with concurrency protection, adjustment history and mixed-assignment total recomputation. Instructor grading resolves the review requirement without rewriting the student's proof or original report.
3. Add the review interface and student released feedback. Reports distinguish original errors, locally correct downstream work and whether the target is established. Student-proof reports/comments follow result release; references follow answer reveal. Verify incomplete overall grades are never exposed as final totals, including when an instructor has already released results.

Then remove the graded rollout guard only after the complete normal/demo flow passes. No automatic partial-credit engine is required.

### 024 and 025: additional formats

Each format branch must deliver a complete vertical addition:

1. Define its precise structure, references, assumptions/dependencies/discharge and supported rule variants; add an independently tested structural adapter over shared logical checks.
2. Add format-specific instructor/reference and student editors, saving/finalization, errors and read-only review. Require a reference checked in that format; do not treat an existing Fitch reference as certification.
3. Enable that format only after publication, authorization, release, grading and regression checks pass. Test the same short valid/invalid arguments across formats where their rule semantics match.

Do not duplicate the rule library just to change presentation. Do not silently permit unsupported format/rule combinations, and do not add lossless mid-proof conversion as a dependency.

### 026: student-created practice, demo and feature verification

Small slices:

1. Add self-created practice premises/target/format setup and manual Check proof using supported rule catalogs. Decide session/save ownership and solvability treatment for self-created practice explicitly; do not require the student to provide a solution before attempting a proof.
2. Add format-switch warning: Cancel preserves all current work; confirm clears premises, target, steps, references, assumptions and feedback, opening the selected format's empty setup. Do not preserve proof content via implicit conversion. Keep instructor-assigned formats locked.
3. Add versioned synthetic examples without silently upgrading existing visitors. Verify reference privacy, all three formats, alternate valid solutions, full-credit/review-required cases, instructor score/comments, mixed totals and independent release through core journeys.
4. Finish automated checks, focused real-browser/keyboard/mobile verification, rollout/rollback documentation and final PR notes. Record untested cases rather than claiming an exhaustive matrix.

### Decisions intentionally assigned to implementation design

The sequence is ready without pretending every detail is settled. Resolve these before their dependent functionality ships:

- In 019: point/weight representation, defaults, bounds, precision, immutability and historical-result compatibility.
- In 020: exact supported rules/variants, formula equality, assumption/discharge conventions, report versions and resource limits.
- In 021: editor interactions, label collision handling and reference-proof authoring/publication constraints.
- In 022–023: safe incomplete-proof serialization, completion-only behavior, review-state visibility, release-before-review transitions, score/comment adjustment history and student aggregate projections.
- In 024–025: exact dependency/tree representations and applicability of each supported rule variant.
- In 026: student-created practice ownership/persistence and how an unsolvable self-created target is presented without a proof-search guarantee.

## Background references

These explain terminology and natural-deduction examples, not a mandate to adopt a particular textbook's calculus:

- [Open Logic's Fitch presentation](https://github.com/OpenLogicProject/fitch/): scope-line and related presentation conventions.
- [Logic and Proof: natural deduction for propositional logic](https://leanprover-community.github.io/logic_and_proof/natural_deduction_for_propositional_logic.html): inference and assumption-discharge examples.
- [Logic and Proof: classical reasoning](https://leanprover.github.io/logic_and_proof_lean3/classical_reasoning.html): logical principles can vary independently of display format.
