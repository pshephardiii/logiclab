# Practice sample problems verification

Branch: `038-feat-practice-sample-problems`. Local verification: November 25, 2026.

## Resulting behavior

Visitors can load a public example in truth-table, Fitch, dependency and semantic-tableaux practice without inventing a logic problem. Truth trees include both valid and invalid arguments. Loading replaces work only through the existing confirmation flow; samples do not start checking or fill the visitor's answers automatically.

Completed proof/tree examples and curated Back/Next/Restart walkthroughs use separate read-only snapshots. Table walkthroughs reveal successive columns; the direct completed-table action retains the existing explicit solution API. Short captions explain the moves. Opening a walkthrough focuses and scrolls to its heading, respects reduced motion and leaves step-navigation focus alone. Example navigation does not modify pending proof entries, table answers or the visitor's validity choice.

Proof examples match the exact statement, premise identities, versions, permitted rules and labels. Editing the statement removes its reference action until the sample is reloaded; an attempted proof can be edited independently. Sample factories clone their snapshots and use stable identities. Tests run completed examples through the real engines, validate contracts and stage structure, and check verdicts and counterexamples.

Sample invitations make loading and solution exploration visible. Create your own problem and Exit sample return to setup after confirmation. Stay retains work and the open example; Discard clears sample/editor/feedback state and restores setup focus. Table resets abort pending requests and ignore late responses. Custom practice retains Start over; samples omit that duplicate control. Fitch/dependency displays show a sideways-scroll cue only when content actually overflows, preserving native keyboard scrolling and the current position.

## Automated verification

- `PRODUCT_EXPOSURE=full npm run check`: passed workspace type checks, 3,278 tests (1,133 engine, 1,268 API, 877 web) and production builds.
- `npm run db:test`: passed 348 PostgreSQL checks (184 database, 164 API/workflow), using existing isolated test fixtures.
- `PRODUCT_EXPOSURE=practice-only npm run build -w @logiclab/web`: passed, separately from the full-mode build.
- `npm run format:check`, branch/working-tree whitespace and changed local Markdown file targets: checked at closeout.

The sandbox initially denied local database access and prevented the API watcher/startup process tests from completing. Both full commands were rerun with local permissions and passed. Existing Jest VM-module advisories remain. No application database was migrated or reset.

## Focused browser evidence

During implementation, headless local Chrome used temporary real practice-only APIs and built frontend artifacts. Checks covered loading, replacement consent, direct completed examples, every curated walkthrough stage, keyboard navigation, source-edit invalidation, retained answers/pending entries, valid/invalid tree verdicts, sample exits, setup focus, mobile containment, reduced motion and overflow cues. Some earlier slice checks also measured button contrast and target sizes. These are focused checks, not a complete accessibility audit.

The final practice-only browser rerun passed:

- Table column reveal and keyboard walkthrough controls; both proof formats' stages, Back/Next/Restart and direct completion; valid/invalid tree walkthroughs with unchanged visitor verdicts.
- Workspace/completed/walkthrough exits for tables, Fitch, dependency and both tree samples. Stay retained work; Discard restored and focused setup. All 15 combinations ran at mobile width.
- Overflow-only proof cues, native arrow-key horizontal panning, cue removal after desktop resize, hidden sample Start over and retained custom proof/tree reset controls.
- Mobile document containment at 390px, reduced-motion animation behavior, no uncaught page errors, and no private API requests. Walkthrough/overflow checks also recorded no console errors. Only explicit table exercise/solution actions requested their anonymous endpoints.

Ignored scripts, logs and screenshots live in `.codex-local/verification/practice-samples/`, with the brief UI audit and overflow follow-up in `ui-audit/`. Final logs are in `final/`. These local scripts are evidence rather than committed browser CI. Temporary Chrome and API/HTTP listeners were cleaned up. The final local frontend artifact is practice-only; rebuild explicitly for the mode you intend to preview.

## Rollout and limits

No migration, backend route change, environment-setting change or external dependency is introduced. Rebuild the frontend and use compatible contracts/engine/API artifacts. Samples are deliberately public frontend content, separate from private instructor reference proofs. They are available in both product exposure modes through the shared practice pages; restricted hosting still requires the existing practice-only frontend/API configuration.

This is feature verification rather than exhaustive product QA or hosted sign-off. No fresh clean installation, remote CI query, hosted deployment, live Cognito/email/payment check, load/soak run or browser/accessibility matrix was performed. Full-product account/demo browser journeys were not repeated. Native scrolling behavior was checked in local Chrome; broad responsive editor redesign remains deferred. No database reset/migration, infrastructure, deployment branch or external message was created by this work.

Next: reviewed practice sandbox preparation. See the [sample plan](../planning/practice-sample-problems.md) and [practice-first release plan](../planning/practice-first-release.md). Hosting costs, concrete deployment changes and promotion/rollback must be reviewed before provisioning or deployment.
