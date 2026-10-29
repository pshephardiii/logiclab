# QA results, findings and changes

Branch: `014-test-demo-qa`. Plan prepared October 27, 2026.

This record distinguishes user-reported manual results, focused agent checks and deferred cases. Use the [runbook](manual-qa-runbook.md) as the source of numbered actions and expected results.

## Run records

Create one record per browser/environment/commit pass. Keep earlier records when retesting; never replace the old failing result with a pass that has no new evidence.

```text
Run ID: QA-RUN-001
Tester:
Date/time and timezone:
Branch / commit:
Browser / version / OS:
Viewport / zoom:
Database name (no connection string):
Enabled modes: demo / normal auth / normal simulator
Demo template / workspace generation (no cookie):
Normal-account prerequisites available: yes / no
Environment deviations from defaults (no secrets):
Automated baseline: command, commit, actual outcome/counts
Evidence directory: .codex-local/qa/QA-RUN-001/
Started / paused / completed:
```

### QA-RUN-003 — Manual local setup, October 27, 2026

- Tester: developer; results reported in conversation, documentation maintained by agent.
- Checkout at recording: b357c19 on 014-test-demo-qa. Exact earlier-step commit not independently confirmed.
- Environment: macOS; Node 24.21.0 reported earlier. Browser/version/viewport not supplied; no screenshot claimed.
- SET-02: user reports the remainder looks good and is proceeding to SET-03. Development startup output showed Vite on 5173, API on 3000, zero watch-compilation errors, and one API restart after the database watcher emitted dist/index.js. This startup restart is expected, not an observed loop.
- Clarified that DevTools belongs in the application tab, not the health tab; updated the runbook wording.
- SET-03: user-provided npm run check output shows successful completion (final build succeeds and the shell prompt returns). Visible summaries: 140 API suites / 493 API tests and 28 web files / 136 web tests passed. The pasted output starts mid-run, so earlier-stage counts are not separately visible. Evidence: `.codex-local/qa/QA-RUN-003/npm-run-check-user-output.txt`. Follow-up: user reports `npm run db:test` passed completely without warnings on October 27 (checkout 6d06b4d at recording; exact test count/raw output not supplied). User also reports `npm run format:check` passed on October 27 (checkout 6d06b4d at recording; raw output not supplied). SET-03 is complete based on the supplied check output and these reported passes; command results span the intervening focused fixes rather than one captured run. SET-01 remains without an explicit full-case completion report.
- No browser screenshots or independently executed manual steps recorded for this run.

## Case results

The matrix started with all cases Not run; it now records reported results as testing proceeds. When testing begins, add run ID, browser, commit and evidence/finding reference to the last column. Use Pass / Fail / Blocked / Not applicable / Not run. Explain every Blocked or Not applicable entry. For a subsequent run, preserve or copy the prior matrix into a dated run section so history is retained. Split multi-browser or partial cases into separate result rows rather than implying every substep passed.

| Case    | Scenario                                             | Result  | Run / commit / evidence or finding                                                                             |
| ------- | ---------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| SET-01  | Prepare an isolated QA database                      | Not run | —                                                                                                              |
| SET-02  | Start demo-only mode                                 | Pass    | QA-RUN-003; user-reported October 27; checkout b357c19 at recording; see run notes                             |
| SET-03  | Record automated baseline                            | Pass    | QA-RUN-003; check output supplied; db:test and format:check passed by user report; latest recording at 6d06b4d |
| PRA-01  | Correct, incorrect and blank cells                   | Fail    | User-reported usability/notation issues; QA-007; fixes await user retest (agent checks in QA-RUN-006)          |
| PRA-02  | Solutions, preservation and state reset              | Fail    | User-reported usability/notation issues; QA-007; fixes await user retest (agent checks in QA-RUN-006)          |
| PRA-03  | Parsing, limits and helpful errors                   | Fail    | User-reported usability/notation issues; QA-005 / QA-006; fixes await user retest (agent checks in QA-RUN-006) |
| DEM-01  | Fresh instructor workspace                           | Not run | —                                                                                                              |
| DEM-02  | Role switch and deep-link reload                     | Not run | —                                                                                                              |
| DEM-03  | Invalid routes and no active demo                    | Not run | —                                                                                                              |
| LIB-01  | Create, validate and restore a draft                 | Not run | —                                                                                                              |
| LIB-02  | Immutable publication history                        | Not run | —                                                                                                              |
| LIB-03  | Archive, restore and retained publications           | Not run | —                                                                                                              |
| ASN-01  | Empty draft and mode transitions                     | Not run | —                                                                                                              |
| ASN-02  | Repeated occurrences and saved snapshots             | Not run | —                                                                                                              |
| ASN-03  | Published locks and archive/restore                  | Not run | —                                                                                                              |
| ASN-04  | Independent grade release and answer reveal          | Not run | Branch 015; focused agent checks recorded separately; full manual case deferred                                |
| WRK-01  | Saving false, blank and separate occurrences         | Not run | —                                                                                                              |
| WRK-02  | Graded submission and frozen feedback                | Not run | —                                                                                                              |
| WRK-03  | Instructor review and practice privacy               | Not run | —                                                                                                              |
| WRK-04  | Completion is about filled cells, not correctness    | Not run | —                                                                                                              |
| WRK-05  | Private practice, explicit checks and solutions      | Not run | —                                                                                                              |
| WRK-06  | Immediate feedback, rapid edits and neutral blanks   | Not run | —                                                                                                              |
| WRK-07  | Independent anytime solution policy                  | Not run | —                                                                                                              |
| DUP-01  | Copy draft, publication and archived source          | Not run | —                                                                                                              |
| DUP-02  | Unsaved source edits and existing filters            | Not run | —                                                                                                              |
| DUP-03  | One request and uncertain-response recovery          | Not run | —                                                                                                              |
| UNS-01  | Navigation Stay, Discard and fresh consent           | Not run | —                                                                                                              |
| UNS-02  | Same-page actions and non-destructive actions        | Not run | —                                                                                                              |
| UNS-03  | Clean, saved, failed-save and read-only states       | Not run | —                                                                                                              |
| UNS-04  | Keyboard focus, Back/Forward and unload              | Not run | —                                                                                                              |
| BILL-01 | Unpaid authoring versus publication                  | Not run | —                                                                                                              |
| BILL-02 | Success, failure and separate purchases              | Not run | —                                                                                                              |
| BILL-03 | Refund and retained work                             | Not run | —                                                                                                              |
| BILL-04 | Checkout retry identity                              | Not run | —                                                                                                              |
| CLS-01  | Create and validate classes                          | Not run | —                                                                                                              |
| CLS-02  | Invite, redeem and replace                           | Not run | —                                                                                                              |
| CLS-03  | Wrong workspace and invalid code                     | Not run | —                                                                                                              |
| ISO-01  | Independent visitors and role guards                 | Not run | —                                                                                                              |
| ISO-02  | Same browser, reset generation and multiple tabs     | Not run | —                                                                                                              |
| ISO-03  | Request/response privacy                             | Not run | —                                                                                                              |
| AUTH-01 | Enable normal accounts without losing demo access    | Not run | —                                                                                                              |
| AUTH-02 | Signup, confirmation and immutable role choice       | Fail    | User reports initial email absent, resend delivered, confirmation 400; QA-022 under investigation              |
| AUTH-03 | Recovery, logout and restoration                     | Not run | —                                                                                                              |
| AUTH-04 | Normal class/assignment path and coexistence         | Not run | —                                                                                                              |
| AUTH-05 | Normal cross-owner and unenrolled student checks     | Not run | —                                                                                                              |
| AUTH-06 | Provider token refresh within a valid local session  | Not run | —                                                                                                              |
| ERR-01  | Read failure and retry                               | Not run | —                                                                                                              |
| ERR-02  | Slow requests and stale results                      | Not run | —                                                                                                              |
| ERR-03  | Two-tab revision conflict                            | Not run | —                                                                                                              |
| ERR-04  | Throttling and input boundaries                      | Not run | —                                                                                                              |
| OPS-01  | Explicit reset and logout                            | Not run | —                                                                                                              |
| OPS-02  | Short idle and absolute expiry                       | Not run | —                                                                                                              |
| OPS-03  | Capacity includes expired stored workspaces          | Not run | —                                                                                                              |
| OPS-04  | Disabled schedules and manual cleanup                | Not run | —                                                                                                              |
| OPS-05  | Report-only reconciliation, deduplication and cycles | Not run | —                                                                                                              |
| OPS-06  | Operator errors and advanced recovery evidence       | Not run | —                                                                                                              |
| UX-01   | Keyboard and accessible feedback                     | Not run | —                                                                                                              |
| UX-02   | Mobile layout and zoom                               | Not run | —                                                                                                              |
| UX-03   | Pagination and browser matrix                        | Not run | —                                                                                                              |

## Findings

Findings are recorded below. Assign sequential IDs QA-001, QA-002, etc. One root cause can link multiple failed cases; record separate issues when failures need different fixes or acceptance decisions.

Copy this template for each finding:

```text
Finding: QA-NNN — short observed problem
Severity: blocker / major / minor / cosmetic
Status: open / investigating / fixed-awaiting-retest / verified / deferred / not-a-defect
Cases / run ID:
First affected commit / browser / mode:
Prerequisites and fixture names/IDs (no credentials):
Exact numbered reproduction steps:
Expected:
Actual:
Frequency:
HTTP status / sanitized code / relevant Console error:
Evidence paths:
Affected scope / related cases:
Root cause (after investigation; label hypotheses):
Fix summary and changed behavior:
Fix commit(s):
Regression coverage and commands actually run:
Retest run / commit / browser / result:
Remaining limitations or explicit deferral decision:
```

Do not close a finding merely because code was changed or a unit test passed. Use fixed-awaiting-retest until the original reproduction succeeds and affected neighboring cases are checked. Record an explicit reason and decision for deferred/not-a-defect findings.

## Change ledger

Keep this concise and chronological. Each fix-sized commit should have a finding reference or a stated QA infrastructure/documentation purpose. Link real files where useful and describe resulting behavior rather than listing filenames alone. Keep broad refactors/product features out of an unrelated fix.

| Entry      | Finding / cases         | Change and reason                                                                                                                    | Commit                       | Checks actually run                                                                                                                          | Retest / outstanding work                                                                       |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| QA-PLAN    | All                     | Add step-by-step runbook and empty results/finding/change templates. No application behavior changed.                                | Pending documentation commit | Documentation formatting, local links and case-ID consistency only                                                                           | Manual cases not run                                                                            |
| QA-FIX-001 | QA-001 / SET-02, SET-03 | Apply five compatible security patch updates in package-lock.json; retain upstream glob deprecation without a forced major override. | a5c4ea3                      | Clean install with scripts disabled; zero-vulnerability audit; 700 tests/type checks/builds; 163 PostgreSQL checks; formatting/whitespace    | Normal clean install verified in QA-002; glob warning remains; no manual browser retest claimed |
| QA-FIX-002 | QA-002 / SET-02, SET-03 | Record two pinned approvals/two denials, strict unknown-script enforcement and npm minimum; document review and upgrade workflow.    | b357c19                      | Normal clean install; zero audit; no pending decisions; native smoke; negative strict-gate fixture; 700 tests/type checks/builds; formatting | Manual setup/browser QA not claimed; platform/source-build limits explicit                      |
| QA-DOC-003 | SET-02 / QA-001         | Record user-reported setup pass, clarify application-tab DevTools instructions, and record the decision to wait upstream on glob.    | Pending user commit          | Documentation formatting/whitespace only                                                                                                     | SET-03 results pending; no screenshots claimed                                                  |

| QA-FIX-003 | QA-003 / SET-03 | Use an explicit TypeScript config import supported by native loading. | Pending user commit | 136 frontend tests under each loader; type check and default/native builds | Compatibility warning resolved; chunk-size investigation separate |

| QA-FIX-004 | QA-004 / SET-03 | Add browser ESM contracts output and load the two larger assignment pages on demand; keep the warning threshold unchanged. | Pending user commit | 706 tests/type checks/builds; native frontend build; both contracts watch compilers | Build warning resolved; browser/network QA remains pending |

| QA-FIX-005 | QA-005 / QA-006 / QA-007; PRA-01–03 | Add keyboard notation/key, local debounced formula feedback and clearer shared table inputs/checks/solutions. | Pending user commit | Full check plus final frontend suite; isolated Chrome practice API walkthrough and three screenshots; formatting | User retest pending; shared assignment presentation changed too |

Add rows for fixes, fixture/test tooling, scope corrections and documentation changes as they occur. If a fix changes expected behavior, update the runbook in the same slice, explain why, and preserve the original finding's expected/actual record.

## End-of-branch review

- [ ] Every required case has a recorded result tied to a run/commit/browser.
- [ ] Missing Cognito, second-browser, accessibility or operational prerequisites are explicit.
- [ ] No open blockers; major issues have a recorded resolution or explicit acceptance decision.
- [ ] Every fix has a change-ledger row and focused regression evidence.
- [ ] Original reproductions and affected neighboring workflows were retested.
- [ ] Final automated results reflect the final commit; no historical counts were copied as current evidence.
- [ ] Local environment settings restored, QA schedules paused and offline/throttling disabled.
- [ ] Shared evidence reviewed for secrets/real personal data; raw private artifacts remain ignored.
- [ ] PR draft in `.codex-local/pr/014-test-demo-qa.md` summarizes final fixes, checks and remaining gaps when ready.

The audit and sandbox deployment remain subsequent branches. Passing local QA does not claim hosted availability or production-grade operation.

## QA-001 — Clean install reports deprecated dependency and security advisories

- Severity: major (dependency review required; application exploitability not yet assessed).
- Status: verified for security remediation after QA-002 normal-install retest; upstream glob deprecation remains an explicit tooling limitation.
- Cases: SET-02 installation / SET-03 baseline; not a completed manual case.
- Reported reproduction: run `npm ci` from the repository root. Installation succeeds, then reports glob@10.5.0 deprecation and three audit findings (one low, one moderate, one high).
- Verified investigation: `npm audit --json` reports low Fastify, moderate fast-uri and high undici findings with fixes available. Lockfile inspection locates glob@10.5.0 under test-exclude, undici under jsdom, and fast-uri through API validation dependencies. The high finding is in the frontend test dependency tree; that alone does not establish application exploitability.
- Expected: dependency warnings are reviewed, remediated where compatible, and any remaining limitation is explicit.
- Fix/commit: a5c4ea3; patch-only lockfile updates: Fastify 5.12.5 → 5.12.7, fast-uri 4.2.2 → 4.2.3 plus both 3.1.8 → 3.1.9 installations, and undici 8.12.1 → 8.12.3. A dry-run preview showed exactly these five changes before applying `npm audit fix --ignore-scripts`; no manifest range, override or major upgrade was introduced.
- Agent retest: `npm ci --ignore-scripts` passed; `npm audit --json` reports zero vulnerabilities. `npm run check` passed 700 tests (71 engine, 493 API, 136 web), type checks and production builds. `npm run db:test` passed 163 PostgreSQL checks (121 database, 42 API/workflow) against the separate test database. No manual browser case is marked passed.
- Remaining deprecation: glob@10.5.0 remains under babel-plugin-istanbul@8.0.0 → test-exclude@7.0.2. Registry inspection shows the latest coverage plugin still requires test-exclude ^7.0.1; test-exclude 8 uses glob 13 but is outside that supported range. Do not force an unvalidated major override just to hide the warning. Developer decision: wait for upstream rather than add a major-version override. Revisit if compatible upstream support, an audit advisory or a tooling failure changes the tradeoff. Keep it as an accepted remaining warning, separate from the now-zero audit count.
- Evidence: `.codex-local/qa/QA-RUN-001-dependencies/`. Tested base commit e879b8a plus the uncommitted lockfile patch; evidence metadata records its SHA-256. Install scripts were explicitly disabled for this clean-install check; approval-policy/default-install retesting remains QA-002.

## QA-002 — Dependency install scripts lack an explicit approval policy

- Severity: minor (setup/policy review; whether any required build step was skipped is not established).
- Status: verified by agent automated install/policy/native/build checks; manual browser setup remains unverified.
- Cases: SET-02 installation / SET-03 baseline.
- Reported reproduction: the same successful `npm ci` warns about four unreviewed install scripts.
- Verified investigation: `npm install-scripts ls --json` lists pending entries for @parcel/watcher@2.6.0, esbuild@0.28.2, fsevents@2.3.3 and unrs-resolver@1.12.2. Local npm version: 11.19.0. No project allowScripts policy was found in package.json.
- Expected: review the actual package scripts and record deliberate approval/denial, then verify installation/build behavior. Pending review is not by itself evidence that the scripts are malicious or that installation failed.
- Fix/commit: b357c19. Root allowScripts pins esbuild@0.28.2 and unrs-resolver@1.12.2 approvals; denies @parcel/watcher/fsevents install scripts. Root .npmrc enables strict-allow-scripts. Raise the npm minimum to 11.19.0 and document the reviewed scripts/helper/fallbacks and future upgrade workflow.
- Agent retest: normal `npm ci --foreground-scripts` passed and ran only the two approved postinstall hooks. `npm install-scripts ls --json` has no pending decisions; audit has zero findings. All 700 tests, type checks and builds passed. Native smoke verified esbuild/unrs functionality and native watcher subscriptions on macOS with denied hooks. A temporary missing-approval install failed with ESTRICTALLOWSCRIPTS. No version changes beyond the npm engine requirement; PostgreSQL tests were not repeated for this script-policy-only slice (QA-001 already verified the same dependency versions).
- Evidence: `.codex-local/qa/QA-RUN-002-install-policy/`; normal install, pending/audit reports, native smoke, missing-approval fixture and source hashes. Linux/Windows, source-build-only setups, remote CI and manual browser behavior remain unverified. The glob deprecation remains; script approvals do not hide it.

## QA-003 — Vitest config import is incompatible with native config loading

- Severity: minor (forward compatibility; local QA still runs).
- Status: verified by agent against both default and native loaders.
- Cases / run: SET-03; QA-RUN-004-native-config, base commit b357c19 plus this uncommitted fix.
- Reproduction: run the frontend tests with the default loader. Vite reports that the extensionless `./vite.config` import is unsupported by its future native config loader.
- Expected: configuration loads with both loaders without the compatibility warning.
- Root cause: `vitest.config.ts` relies on the bundled loader resolving a missing file extension; native loading requires the explicit path.
- Fix: import `./vite.config.ts` and enable `allowImportingTsExtensions` in the frontend's existing no-emit TypeScript configuration. Keep the current default loader; do not suppress warnings.
- Verification: `npm run test -w @logiclab/web` and the same command with `-- --configLoader native` each passed 136 tests in 28 files. `npm run build -w @logiclab/web` passed frontend type checking and production build; `npm exec -w @logiclab/web -- vite build --configLoader native` also passed. No native-config compatibility warning appeared in any captured log.
- Evidence: `.codex-local/qa/QA-RUN-004-native-config/` contains the four command logs. Fix commit: 38e18a8.
- Limits: the production chunk-size warning remains a separate investigation. No manual browser QA, full monorepo suite, database tests or hosted checks were repeated for this frontend configuration fix.
- Reference: [Vite config loading](https://vite.dev/config/) documents native loading and its planned future default.

## QA-004 — Production frontend bundle exceeds the default size warning

- Severity: minor (delivery/build optimization; local QA is not blocked).
- Status: verified for the production build warning; browser loading/navigation checks remain pending.
- Cases / run: SET-03; QA-RUN-005-bundle, base commit 38e18a8 plus this uncommitted fix.
- Reproduction: run `npm run build -w @logiclab/web` after building shared packages. The entry JavaScript is 910.60 kB (220.35 kB gzip), exceeding the unchanged 500 kB warning threshold.
- Expected: avoid shipping unused dependency code and defer substantial page-specific code until needed, without disabling size diagnostics.
- Investigation: the contracts package's CommonJS entry prevents effective removal of unused Zod code. All route pages are also eagerly imported. A route-only experiment still left a 615.93 kB shared chunk, so splitting pages alone did not resolve the cause.
- Fix: build a browser-only ES-module version of contracts from the same source and select it through the package's browser entry. Keep Node's CommonJS entry and declarations intact. Build/typecheck/watch both targets; add no dependencies or duplicated schema source. Load StudentWorkPage and InstructorAssignmentsPage through module-scoped React.lazy imports with an accessible Suspense fallback; keep providers and role/resource boundaries in place. Other pages remain eager.
- Measured result: entry JavaScript is 469.65 kB (142.16 kB gzip); deferred JavaScript is 22.13 kB, 11.88 kB and 2.07 kB shared (6.20, 3.96 and 0.93 kB gzip). Total emitted JavaScript is about 505.73 kB before gzip. These are emitted asset sizes, not measured browser transfer timings. No chunk-size or native-config warning appears in the final builds; the threshold remains unchanged.
- Agent verification: `npm run check` passed 706 tests (71 engine, 493 API, 142 web), type checks and all production builds. Six new routing tests cover loading fallback, role/anonymous guards and authorized normal/demo routes. A native-loader frontend build and all 142 frontend tests under the native loader also passed. Starting the contracts development command verified both compilers reach zero errors; the temporary watcher process group was stopped afterward. This startup smoke does not establish later source-change HMR behavior.
- Evidence: `.codex-local/qa/QA-RUN-005-bundle/` holds baseline, experimental/final build, full check, native build and watch startup logs. Fix commit pending user commit.
- Limits: no real-browser cold-cache navigation, failed chunk-download recovery, production hosting/cache verification, clean installation or PostgreSQL rerun in this slice. Browser QA still needs to check assignment navigation, state retention and unsaved-work prompts. Chunk sizes may grow with future features; revisit measured boundaries rather than increasing the warning limit.
- Reference: [Vite build optimizations](https://vite.dev/guide/features#build-optimizations) explains dynamic-import chunk loading and associated CSS handling.

## QA-005 — Keyboard notation and operator help are incomplete

- Severity: minor; status: fixed-awaiting-retest by user. Reported during practice review on October 27; base commit 6d06b4d.
- Cases: PRA-03. Reproduction: type `P v Q` and create a table; lowercase v was rejected even though users expect it to mean OR. The inline operator prose was also difficult to use as a keyboard reference.
- Expected: every supported operator has a visible ordinary-keyboard equivalent; lowercase v means OR while uppercase V remains a variable. No new logical operator is introduced.
- Fix: add v to the shared tokenizer, error guidance and grammar docs. Add a visible keyboard key for NOT (!), AND (&), OR (v / |), implication (->) and grouping. Parser tests cover v with/without whitespace and the uppercase-V distinction.
- Agent retest / evidence: QA-RUN-006-practice; shared engine tests passed and real Chrome created a `P v Q` exercise through the actual stateless practice API. Broader user grammar/limit walkthrough remains pending.
- Fix commit: pending user commit. The shared alias also applies to API-authoring and assignment formula validation; stored formulas and identifiers are not rewritten.

## QA-006 — Formula errors appear only after explicit table creation

- Severity: minor; status: fixed-awaiting-retest by user. Cases: PRA-03.
- Reproduction / actual: type `P &` and pause; no syntax signal appeared before Create table. Expected: clear feedback while constructing a formula, without interrupting each keystroke or creating exercises.
- Fix: validate locally after a 500 ms typing pause with the existing shared parser. Show well-formed or positioned error text in a polite status region linked to the input; clear stale verdicts immediately on edits/empty input and cancel timers on replacement/unmount. Add the existing engine workspace dependency/prebundling entry rather than duplicate its grammar or make background HTTP calls. Explicit Create table still uses authoritative API validation.
- Agent retest / evidence: QA-RUN-006-practice includes debounce, cancellation, limits and form DOM tests. Chrome verified invalid `P &`, correction to `P v Q`, and zero exercise requests before explicit creation. `formula-invalid.png` captures the invalid state. No persistence or autosave behavior was added.
- Fix commit: pending user commit. Manual keyboard/screen-reader and user preference retest remain pending.

## QA-007 — Practice table controls and result presentation are unclear

- Severity: minor; status: fixed-awaiting-retest by user. Cases: PRA-01 / PRA-02.
- Reported actual: empty-state instructions do not distinguish the Create table button label; dropdowns feel bulky; correctness lacks cell backgrounds; solution values are underneath inputs with a repeated Solution label.
- Expected: emphasize the actual button label; compact keyboard-operable selectors; correctness recognizable without relying on color; expected values to the right of each selector.
- Fix: emphasize “Create table” in the empty-state instruction. Retain native blank/T/F selects with compact styling (blank shown as —). Add light green/red backgrounds to checked answer cells, preserving Correct/Incorrect text and adding decorative ✓/✕ markers. Given cells are not correctness-colored. Render expected values in blue immediately beside the input with an accessible Correct answer label; preserve current entries and hide/show behavior. Editing still removes stale check feedback.
- Scope: the TruthTable/AnswerCell components are shared with assigned work, instructor review and previews, so these presentation updates apply there too. Assessment/feedback/solution permissions and final-work behavior remain unchanged. Updated assigned-work solution assertions use the new accessible label.
- Agent verification: full `npm run check` passed 716 tests (74 engine, 493 API, 149 web), type checks and all builds. A subsequent table regression test brings the final frontend suite to 150 passing tests (717 aggregate across the executed suites); it checks answer-only status classes and clearing. After adding an explicit accessible note role for solution values, the final 150-test frontend suite and frontend typecheck/production build were repeated successfully. The entry bundle remains below the unchanged warning threshold at 478.59 kB (145.13 kB gzip).
- Browser evidence: QA-RUN-006-practice, Chrome 156.0.8078.48, temporary API/Vite servers on 3196/5196, with no authentication/database/AWS/payment dependencies. Checked live exercise creation/check/solution, two correct/one incorrect/one blank, retained F input, solution alignment/toggle, 390px document width, and no uncaught page errors. Captured and inspected `feedback-desktop.png` and `feedback-mobile.png`; temporary servers/browser were closed. Logs and screenshots are ignored local evidence under `.codex-local/qa/QA-RUN-006-practice/`.
- Limits: user visual retest, assigned-work browser regression, other browsers, native-select OS variations and screen-reader testing remain pending. No database tests were repeated because no persistence/schema code changed. Fix commit pending user commit.

### Practice visual follow-up — QA-005 / QA-007

- User reports the first practice revision is an improvement, but requests a clearer student-facing key and a distinct final-answer column even after checking. Keep these findings awaiting user retest rather than treating that feedback as a full case pass.
- Replace the inline symbol strip with a vertical Keyboard guide beside formula entry: Meaning / Type / Symbol columns, plain-language implication (If … then …), grouped parentheses and an example formula. The guide stacks below the form at widths of 900px or less.
- Use slightly deeper green/red shades for correct/incorrect final cells and a subtle left edge throughout the final column. Keep final-answer labels and all status text/icons, so identifying the column or correctness does not depend solely on color.
- Verification: repeated the 150-test frontend suite and frontend typecheck/production build successfully; entry JavaScript 479.41 kB (145.30 kB gzip), without the chunk warning. Repeated Chrome 156.0.8078.48 checks against temporary stateless API/Vite servers, including actual desktop side-by-side/mobile stacked geometry and distinct computed backgrounds for both correct and incorrect intermediate/final cells. Prior debounce, API, solution-retention and no-page-error checks also passed. Temporary resources were closed.
- Evidence: `.codex-local/qa/QA-RUN-006-practice/browser-layout.log`, `web-layout.log`, `build-layout.log`, and four new `*-layout.png` screenshots, retaining the earlier screenshots. Inspected `final-column-layout.png` visually. User preference approval, assigned-work browser checks and assistive-technology checks remain pending. No new backend or persistence change in this follow-up; no additional DB/API suite rerun. Changes remain uncommitted.

- Further user review: table presentation is improved and the guide direction is accepted, with a wording clarification. Rename the guide column from Type to Key and make the introduction keyboard-first. Direct Unicode symbol parsing remains available for pasted course material; no special symbol-entry mechanism is required. This copy-only follow-up does not establish completion of the remaining practice cases.

- Keyboard-guide polish requested in the next review: add 0.75rem below the explanatory table caption and use regular-weight math typography for all symbols to reduce mixed glyph-weight appearance. Formatting/whitespace checked; no functional tests or browser screenshot rerun for this CSS-only adjustment. User visual retest remains pending.

### Assessment-design follow-up

The user accepts that independent practice and external solvers can reproduce graded truth tables. Record this as a product limitation, not a broken solution-release authorization check. Future controlled assessment will investigate Safe Exam Browser, with feasibility questions and source links in [the planning note](../planning/controlled-assessment.md). No runtime restrictions, monitoring, automatic focus-loss penalties or changes to the QA branch's implementation scope. Documentation formatting and local link targets checked; no functional tests needed for this documentation-only update.

## QA-008 — Successful table creation can be missed on short screens

- Severity: minor; status: fixed-awaiting-retest by user. Case: PRA-01.
- Reported actual: clicking Create table on a short viewport can leave the newly created table below the visible area, making success hard to notice. Expected: gently reveal the table only after successful creation.
- Fix: observe new exercise results in the practice composition component and scroll the table panel into view with native smooth scrolling. Use instant movement for prefers-reduced-motion. Preserve keyboard focus. Do not scroll on initial/remounted retained data, pending/failed creation, formula edits or answer checking. The browser controls smooth-scroll duration; no custom animation or fixed-delay timer is added.
- Verification: all 153 frontend tests passed, including new successful-result, failure/loading, retained-table, reduced-motion and focus regression tests. Frontend typecheck/production build passed without a chunk warning. Formatting/whitespace checked. No backend/persistence changes or database suite rerun.
- Evidence: `.codex-local/qa/QA-RUN-006-practice/scroll-tests.log` and `scroll-build.log`. Browser scroll results are recorded separately below. User retest remains pending; fix commit pending user commit.

- QA-008 browser retest: Chrome 156.0.8078.48 at 390×650 successfully revealed the table after creation under both ordinary and reduced-motion preferences; scrolling did not force focus into table controls. Temporary stateless API/Vite/browser resources were closed. Evidence: `browser-scroll.log`, `scroll-no-preference.png`, `scroll-reduce.png` under the same run directory. The first smoke assertion incorrectly expected the submitting button to retain focus despite its existing disabled loading state; corrected the harness to check that scrolling does not force table focus and reran successfully. No additional application change was needed.

### PRA-03 retest — lowercase v reports old parser message

- User reports `P v Q` producing the older INVALID_CHARACTER guidance without the v alias. Keep QA-005 awaiting successful user retest.
- Agent inspection: source tokenizer, compiled engine and current Vite optimized engine asset all contain the v alias and updated guidance. A stateless request to the running local API on port 3000 successfully returned the four-row OR exercise for `P v Q`. No application change made.
- Hypothesis, not confirmed root cause: an older browser-loaded module or earlier running process produced the reported message. Ask the user to hard-refresh the practice tab, then retry; restart development processes if it persists and distinguish inline feedback from a Create table API error. No user pass claimed.

## QA-009 — Invalid formula submission duplicates inline syntax feedback

- Severity: minor; status: fixed-awaiting-retest by user. Case: PRA-03.
- Reproduction: enter an invalid formula, wait for the debounced error, then click Create table. Actual: the API returns the same syntax error, which appears again below the local message. Expected: retain one local syntax message and allow creation only for a validated, well-formed current formula.
- Fix: disable creation for empty, pending or invalid input and during creation. Guard the form submit handler as well, so Enter or programmatic form submission cannot bypass the disabled button. Suppress an exact duplicate request error while preserving distinct API/network failures. Backend validation remains authoritative and unchanged.
- Verification: 154 frontend tests passed, including disabled-state/submit guards through pending, invalid, valid and loading transitions, duplicate-message suppression and retained distinct request errors. Frontend typecheck/production build passed; entry JavaScript 479.77 kB, below the unchanged warning threshold. Formatting/whitespace checked. No browser or database rerun for this focused form-state change; user retest pending.
- Evidence: `.codex-local/qa/QA-RUN-006-practice/formula-gating-tests.log` and `formula-gating-build.log`. Supersedes the earlier QA-006 decision to allow explicit invalid-formula submission from this form. Fix commit pending user commit.

## QA-010 — Keyboard text correction changes formula punctuation

- Severity: minor; status: deferred by user decision after retest. Case: PRA-03.
- Reported reproduction: enter an opening parenthesis followed by spaces in Propositional formula; a period is inserted automatically. A system keyboard double-space substitution is suspected, not independently confirmed.
- Fix: explicitly set autoCorrect and autoCapitalize to off alongside existing autocomplete off and spellcheck false on the formula input. Do not rewrite entered punctuation, swallow keyboard events or interfere with composition/paste to compensate for system behavior.
- Verification: both existing FormulaForm tests and frontend typechecking passed; formatting/whitespace checked. No native keyboard/browser retest or full-suite/build rerun for this input-hint-only change. Browsers/OS keyboards may not honor every hint; user must retry the original double-space gesture in the affected environment. Fix commit pending user commit.
- Evidence: `.codex-local/qa/QA-RUN-006-practice/formula-autocorrect.log`.

### QA-010 disposition — accepted keyboard limitation

The user retried the original gesture and reports period substitution still occurs. Keep the input's autocorrect/autocapitalize/autocomplete/spellcheck opt-outs, but defer further mitigation by explicit user agreement on October 27. OS/browser text-substitution settings remain a possible cause, not a proven diagnosis. Do not intercept spaces, replace punctuation or introduce keyboard/composition workarounds in this QA pass. Formula validation still reports substituted punctuation as invalid; no guarantee of suppressing native substitutions is claimed.

## QA-011 — Support textbook square-bracket grouping

- Severity: minor (notation/usability enhancement); status: fixed-awaiting-retest by user. Case: PRA-03.
- User request: support alternating parentheses and square brackets to make nested textbook formulas easier to read. Previously [ and ] were invalid characters.
- Fix: accept both grouping delimiters in the shared tokenizer/parser, with matched pairs required and existing precedence/length/variable/nesting bounds retained. Add the positioned EXPECTED_CLOSING_BRACKET error code while preserving EXPECTED_CLOSING_PAREN for parentheses. Empty, unmatched, crossed or mismatched groups remain invalid.
- Canonical AST, column labels, structural IDs and truth values are unchanged for equivalent formulas; display labels continue to normalize grouping to parentheses. The original formula input can retain brackets. Shared parsing applies to independent practice, authoring and assignment content validation without a data migration.
- Update the keyboard guide, sample formula, formula help and engine grammar docs. Tests cover nested/mixed groups, mismatches/positions, square-bracket depth bounds, stable generated tables, API exercise/check/solution equivalence and local validation.
- Fix commit pending user commit. Verification results recorded below; user retest and cross-browser keyboard behavior remain pending.

- QA-011 verification: `npm run check` passed 733 tests (83 engine, 494 API, 156 web), type checks and all production builds. Entry JavaScript is 480.01 kB, below the unchanged chunk-warning threshold. Evidence: `.codex-local/qa/QA-RUN-006-practice/square-brackets-check.log`. Formatting/whitespace passed. No browser or database suite rerun for this parser/guide slice; manual square-bracket retest remains pending.

- QA-011 guide follow-up: user approves square-bracket support and requests one Group expressions row. Combine `( ) or [ ]` in the Key column and retain only `( )` in Symbol to keep the reference compact. Presentation-only adjustment; parser behavior is unchanged. Formatting/whitespace checked, with no functional-suite rerun for this static content change.

### QA-007 solution-color follow-up

- User finds the dark-blue expected values too close to black and requests distinct green T and pink/red F values. Set solution T to #086e3f and F to #ac285c, retaining the literal letters, accessible Correct answer labels and all separate correctness feedback. Colors describe expected truth values, not whether the student's answer is correct. Shared assignment/review tables inherit this presentation.
- Calculated contrast against white, neutral/final, correct and incorrect cell backgrounds: minimum 4.60:1 for T and 4.75:1 for F. These numerical checks do not replace user visual approval or a full accessibility audit.
- Both focused suites passed (14 tests: AnswerCell and AssignedAttempt); formatting/whitespace passed. Evidence: `.codex-local/qa/QA-RUN-006-practice/solution-colors.log`. No browser screenshot, full-suite or build rerun for this styling change. User visual retest pending; changes uncommitted.

### Near-term feature planning follow-up

User agrees to pursue instructor-authored true/false and single-answer multiple-choice questions relatively soon on a separate feature branch, before derivations. Added [scope and delivery slices](../planning/conceptual-questions.md), linked from product direction, implementation plan and docs index. No feature code or QA-case completion is implied. Formatting/whitespace and local documentation links checked; no functional tests needed for this documentation-only addition.

### Future biconditional feature

User requests a small future branch for biconditional support, recognizing the current notation gap as a teaching limitation. Recorded scope and provisional branch name in product direction and the implementation plan. Shared truth-table support should provide an operator future derivations can use, without implementing derivations now. Documentation formatting and local link targets checked; no application changes or functional tests in this planning update.

Follow-up decision: include `~` as an alias for existing negation in the same biconditional branch rather than expanding the QA fixes. Retain `!`/`¬`, normalize display to `¬`, preserve IDs/precedence and verify notation equivalence. Updated both planning documents; no parser or guide behavior changes in this documentation-only update.

## QA-012 — Duplicate navigation distracts from demo entry

- Reported October 28, 2026; severity: minor; status: fixed-awaiting-retest by user. Case: DEM-01.
- User requests removal of the body links Anonymous truth-table practice and Use a normal account because the shared header already provides those destinations. Remove both links and the unused Link import; retain shared navigation and demo role/lifecycle controls.
- Verification: all eight DemoPage tests passed; formatting/whitespace checked. No new tests for this static-link removal and no browser/full-suite rerun. User visual retest pending; changes uncommitted.

### Product-wide UI/UX audit planning

User agrees to a dedicated UI/UX audit branch after functional QA and before public deployment, separate from the code audit. Added [scope, small slices and completion criteria](../planning/ui-ux-audit.md), linked from product direction, implementation plan and documentation index. No application behavior or current case result changed. Documentation formatting, whitespace and local links checked; no functional test rerun for this planning-only update.

## QA-013 — Demo notice and class-management layout lack structure

- Reported October 28, 2026; severity: minor; status: fixed-awaiting-retest by user. Cases: DEM-01 / CLS-01 and shared student-class presentation.
- Actual: the unstyled Synthetic demo paragraph starts at the viewport's far left, detached from navigation/content; Your classes crowds form, list and invitation controls vertically. Expected: a contained, aligned demo notice and clear sections with consistent spacing.
- Fix: give DemoBanner an owned stylesheet and a bounded, responsive notice below navigation, separating Demo workspace, role/synthetic/no-charge context and lifecycle link. Give the shared classroom panel an owned stylesheet with separated form/list areas and a heading/reload row. Render classes as spaced list cards with semantic headings and creation dates. Add a Create a class heading and invitation/result spacing. Retain all existing controls, request behavior and access checks.
- Scope: banner styling applies across authenticated demo pages; normal accounts still show no demo notice. Shared panel/list changes also apply to normal instructor and student class pages. No data/API/policy changes or new dependencies.
- Verification: all 156 frontend tests passed; frontend typecheck/production build passed (entry JavaScript 480.46 kB, below unchanged warning threshold). Formatting/whitespace checked. Chrome 156.0.8078.48 synthetic-fixture preview checked two class cards, invitation display, class creation/input clearing, reload, 390px document width and no page errors. Captured and inspected desktop/mobile screenshots. This intercepts API responses and is not a live demo/backend persistence verification; normal/student visual retests and user acceptance remain pending. Temporary Vite/browser resources were closed.
- Evidence: `.codex-local/qa/QA-RUN-007-class-layout/` contains `browser.cjs`, `browser.log`, `classes-desktop.png`, `classes-mobile.png`, `web-tests.log` and `web-build.log`. No before screenshot, database/backend suite or full monorepo rerun for this presentation-only slice. Fix commit pending user commit.

## QA-014 — Site links and workspace links share one navigation level

- Reported October 28, 2026; severity: minor; status: fixed-awaiting-retest by user. Cases: DEM-02 / ISO-01 / AUTH-04 / UNS-01.
- Actual: Practice and Use a normal account appear beside demo classes/assigned work, obscuring which links leave the demo. Expected: a consistent site row and a distinct active-workspace navigation group.
- Fix: Navigation now renders only site destinations (Explore demo, Practice, account). Demo accounts do not supply a normal-account label; retain Sign in / Create account in demo mode and the existing signed-in account label for normal sessions. Add WorkspaceNavigation for role-allowed resource destinations. Demo links stay under /demo and render inside the demo notice beneath its context/lifecycle controls. Normal accounts get a separate role-labelled workspace panel with unprefixed resource paths. Signed-out/expired sessions have no workspace group. Keep route definitions authoritative for labels/access and preserve active-link styling, native NavLink navigation and existing blockers/route guards.
- Verification: all 162 frontend tests passed, including six new header grouping/role/scope/expiry tests and the existing unsaved-work/route-guard suites. Frontend typecheck/production build passed. Chrome 156.0.8078.48 preview with intercepted synthetic responses checked three site links, instructor demo destination prefixes/group containment, current-link underline, student navigation, class/invitation controls, mobile wrapping and no page errors. Captured desktop/instructor-mobile/student-mobile screenshots and inspected the desktop result. Temporary Vite/browser resources were closed.
- Evidence: `.codex-local/qa/QA-RUN-007-class-layout/navigation-tests.log`, `navigation-build.log`, `browser-navigation.log`, `browser-navigation.cjs`, and `navigation-*.png`. Final CSS active-link adjustment was browser-retested; final build/format checks recorded with the same run. No API/persistence changes, database suite, live Cognito, real-demo end-to-end, screen-reader or real-browser dirty-navigation retest in this slice. User acceptance pending; changes uncommitted.

- QA-014 user review: the separated navigation is definitely better. User notes workspace navigation does not stand out enough as instructor navigation and agrees this can wait for the dedicated UI/UX audit. Record the prominence concern as an explicitly deferred visual refinement in [the audit plan](../planning/ui-ux-audit.md#carry-forward-finding-workspace-navigation-prominence). This acceptance of the direction does not establish completion of all navigation/unsaved-work QA cases. No application change; documentation formatting/whitespace checked.

## QA-015 — Opening an assignment collapses the editor and leaves detail out of view

- Reported October 28, 2026; severity: minor; status: fixed-awaiting-retest by user. Cases: ASN-01 / ASN-03 / UNS-02 / ERR-02. Base checkout e33b646 plus this uncommitted fix.
- Actual: selecting an existing assignment on /demo/assignments appears to flash, then displays the assignment below the list without revealing it. Source inspection shows the editor subtree is removed during detail loading, collapsing its space before new content mounts.
- Fix: keep a persistent detail container, measure its current height only after discard consent, and reserve that space while loading (or offering failed-read retry). Show a loading panel instead of stale editable content. Reveal only the latest requested assignment after a successful load with native smooth scrolling and a small top margin; reduced-motion preference uses instant movement. Track selection revision as well as ID so fast same-assignment reloads work without relying on a visible intermediate loading frame. Do not initiate scrolling on failures, save/publication results, initial retained data or canceled selection. Keep the current same-page editor, selection cancellation, retry and unsaved-work behavior; no new routes or backend changes.
- Scope: the instructor assignment component serves both normal and demo accounts. A dedicated assignment detail screen remains a possible UI/UX audit design choice, not implemented in this fix.
- Verification: all 169 frontend tests passed; frontend typecheck/production build passed. Six reveal-hook tests cover reserve/success, failure/retry, latest/canceled selection, retained/mutation results, reduced motion/focus and fast same-ID reload. An additional component test checks loading-space preservation, reveal after loading and Stay preserving unsaved input without starting another reveal. Existing assignment, routing and unsaved-work suites still pass.
- Browser evidence: Chrome 156.0.8078.48 with delayed intercepted synthetic API responses, desktop 1000×650 and mobile 390×650/reduced motion. Reserved height matched the previous editor (about 943px desktop / 1070px mobile); successful published-detail load scrolled to the editor with 16px top spacing, retained read-only state, produced no document overflow or page errors. Captured loading/opened screenshots and inspected the desktop opened state. Browser evidence precedes the final revision-token refinement, which was covered by the final automated suite/build. Temporary Vite/browser resources were closed.
- Evidence directory: `.codex-local/qa/QA-RUN-008-assignment-reveal/` contains browser script/log/screenshots and final `web-tests.log` / `web-build.log`. Formatting/whitespace checked. No live-demo persistence, real-browser dirty-prompt flow, Cognito, full monorepo or database suite rerun. User retest pending; fix commit pending user commit.

## QA-016 — Ordered problem titles repeat the list number

- Reported October 28, 2026; severity: minor; status: fixed-awaiting-retest by user. Case: ASN-02.
- Actual: the native ordered-list marker and an explicit heading prefix render as “1. 1. …”. Remove the heading prefix and retain native ordered-list numbering, version labels, stable occurrence identities and positional move/remove labels.
- Verification: updated the reorder assertion to match the unprefixed heading and retained exact ordered-save coverage. Full frontend suite passed as recorded under QA-018; no additional visual/browser retest. Fix commit pending user commit.

## QA-017 — Assignment authoring does not explain how to source problems

- Reported October 28, 2026; severity: minor; status: fixed-awaiting-retest by user. Cases: ASN-01 / ASN-02 / UNS-01.
- Actual: the library link was shown only when the library was empty; an instructor starting another assignment had little guidance near the ordered problem controls.
- Fix: always show the Open problem library link in the editable published-problem picker, explain create → publish → choose problem → Add version, and remind instructors to save before leaving. Update the empty ordered-list instruction. Remove the duplicate empty-library link so there is one clear destination. Keep the link scoped to normal/demo paths and preserve router-based unsaved-work confirmation. Published/archive read-only behavior remains unchanged.
- Verification: tests confirm /library versus /demo/library, and that following the link with dirty work offers Stay and retains edits. Full frontend result recorded under QA-018. No automatic save or unsaved-data transfer to library; user retest pending. Fix commit pending user commit.

## QA-018 — Correctness feedback and solution release are not clearly distinguished

- Reported October 28, 2026; severity: minor; status: deferred by user for policy redesign (see follow-up below). Case: ASN-01.
- Actual: Feedback timing fixed at final submission for graded work appears redundant with after-submission Solution access. Expected: explain the separate controls without changing agreed assessment policies.
- Fix: introduce feedback as correct/incorrect information and solutions as revealing actual answers. Explain that graded correctness feedback/score happens only at final submission and its timing is fixed. Give dynamic descriptions for Never, After final submission and Anytime solution access, including an explicit warning that Anytime can expose answers before graded submission. Keep policy values, valid transitions and published locks unchanged. Add spacing between policy explanations and the next control.
- Verification for QA-016–018: all 172 frontend tests passed, frontend typecheck/production build passed (entry bundle remains 481.02 kB). New description assertions cover each solution rule and fixed graded timing; existing transition/publication tests still pass. Formatting/whitespace checked. No backend, database, full-monorepo or browser rerun for this presentation/copy slice. User visual/wording acceptance remains pending; fix commit pending user commit.
- Evidence: `.codex-local/qa/QA-RUN-008-assignment-reveal/clarity-tests.log` and `clarity-build.log`. Initial run exposed an old heading-number assertion; updated it to verify the intended unprefixed title and reran successfully.

### QA-018 follow-up — defer results-release policy redesign

The user still finds the current feedback/solution model confusing and requests a separate instructor-results-release branch. Record At submission versus explicit instructor release as the intended official-results model and leave the decision about including answer keys with grades open. After clarification that completion-only currently cannot use submission-only timing, the user explicitly defers that behavior/schema change. Keep completion-only and practice policies unchanged; graded timing is already locked to on_submission and its visible option is now labelled At submission. Existing published data and solution-access behavior are not altered. See [the feature plan](../planning/instructor-results-release.md). This follow-up supersedes any implication that copy alone resolved the policy concern; QA-018 remains deferred for conceptual redesign, while the earlier copy improvements remain.

- Follow-up verification: all five AssignmentPolicyFields tests passed after the graded option label changed; documentation formatting, whitespace and local links passed. No policy, database or full-suite rerun for this label/planning update.

- Scheduling clarification agreed October 28: instructor-controlled results release must be completed and verified before initial deployment, including the public demo. Resolve whether released results include correct answers in that branch. Updated the feature plan, implementation roadmap and product direction; provisional branch numbering does not override this release prerequisite. No application changes.

## QA-019 — Invalid library formula fails to save without a visible explanation

- Reported October 28, 2026; severity: minor; status: fixed-awaiting-retest by user. Case: LIB-01. Checkout at recording: 9efd101 plus this uncommitted fix.
- Reproduction: create a new problem in /demo/library with a title and formula `P &`, then Save draft. User reports no explanation for the rejected save.
- Root causes: library transport used the strict auth error schema, rejecting the extra position field in a valid problem-parser error and replacing its message with a generic fallback. The resulting page-level error was rendered above the library list, away from the editor and potentially outside the viewport.
- Fix: map problem errors with the existing problem error contract through the shared request override, preserving the message while retaining safe fallback handling. Separate save errors from list/archive errors. Render and focus one accessible save-error alert inside the editor, linked to its form; keep title/instructions/formula and unsaved-work registration. Clear save errors on retry/success or consented editor replacement, not on Stay. Apply consistently to normal/demo library requests; no server, policy or persistence changes.
- Verification: all 177 frontend tests passed; frontend typecheck/production build passed with entry bundle 481.46 kB. New tests cover positioned errors in both namespaces, malformed error fallback, new-draft error location/focus/retention, successful correction and clearing discarded-draft errors. Existing failed-edit, publication and unsaved-work tests still pass. An initial test typecheck used an unsupported Testing Library query option; corrected it and reran the suite/build successfully.
- Browser evidence: Chrome 156.0.8078.48 at 390×650 with synthetic intercepted library persistence and the actual engine parser generating the error response. Verified one specific error alert focused and inside the viewport, all fields retained, successful corrected retry and no uncaught page errors. Captured and inspected `save-error-mobile.png`. Temporary Vite/browser resources were closed. This is not a live demo/database save verification.
- Evidence: `.codex-local/qa/QA-RUN-009-library-errors/` contains browser script/log/screenshot and final `web-tests.log` / `web-build.log`. Formatting/whitespace checked. No database, backend, full monorepo or live Cognito rerun for this frontend error-handling slice. User original-flow retest pending; fix commit pending user commit.

## QA-020 — Publication history adds redundant list numbering

- Reported October 28, 2026; severity: cosmetic; status: fixed-awaiting-retest by user. Case: LIB-02.
- User requests removal of the “1.” before an entry already labelled Version 2. Remove markers/indentation from the publication history list, retaining explicit version headings, ordering, spacing and list semantics. Normal/demo library history shares this presentation.
- Verification: all 12 ProblemLibrary tests passed; formatting/whitespace checked. No browser screenshot, full suite or build rerun for this presentation-only change. Fix commit pending user commit.

## QA-021 — A class can repeatedly create paid/pending checkouts

- Reported October 28, 2026; severity: major; status: fixed-awaiting-retest by user. Cases: BILL-01–04. Checkout at recording: 4e4e04c plus this uncommitted fix.
- Actual: backend checkout only deduplicates matching request IDs; fresh IDs create additional purchases for the same paid/pending class. UI explicitly permits another covered-period purchase and checks pending history only for the selected plan/current loaded pages. Expected: prevent new checkout for a paid or pending class regardless of plan/history page or concurrent clicks.
- Fix: under payer/class locks, check existing request identity first, then block any paid/pending class purchase or active publishing grant before invoking the provider. Matching idempotent retries still return the original purchase. Add explicit HTTP 409 codes/messages. Return authoritative checkoutBlockedReason with class billing reads independently of purchase pagination; disable plan/new-checkout controls and guard hook calls. A stale-view 409 clears retry intent and reconciles billing; failed reconciliation remains blocked. Network failures retain same-intent retry behavior. Failed/refunded purchases alone permit new checkout. Existing duplicates are retained; paid records still block after expiry/missing grants, with renewals explicitly outside scope.
- Verification: `npm run check` passed 757 tests (83 engine, 494 API, 180 web), type checks and all builds. After adding definitive-conflict reconciliation, final frontend suite passed 181 tests and frontend typecheck/build passed. `npm run db:test` passed 164 PostgreSQL checks (121 database, 43 API/workflow); final API integration rerun passed all 43 after adding HTTP 409/idempotent retry assertions. Tests cover concurrent distinct request IDs (one purchase/provider call), matching-key retries, cross-plan blocking, paginated hidden purchases, paid/expired grant state, active grant without a purchase, failed/refunded recovery, disabled UI controls and stale-tab reconciliation. Existing payment event, refund, publication-lock and demo suites pass.
- Evidence: `.codex-local/qa/QA-RUN-010-checkout-guard/`. No browser walkthrough, real payment/provider, live Cognito, automatic cleanup of prior duplicates or deployment in this slice. Matching rebuilt API/frontend/contracts required for the added response field; no database migration. User retest pending; fix commit pending user commit.

### Remaining manual scope narrowed

User elected to finish billing and auth rather than the full manual matrix. Updated the runbook's active completion scope; all other unexecuted cases remain explicitly unverified/deferred. This is not authorization to claim a complete product audit or skip planned pre-deployment work.

## QA-022 — Live signup delivery/confirmation fails with an ambiguous error

- Reported October 28, 2026; severity: major; status: latest login configuration issue resolved by user; complete auth journey deferred. Case: AUTH-02. Checkout at recording: 0cc9b53 plus diagnostic/message changes. Historical investigation follows; see final disposition below.
- User enabled auth, used a new address and received the check-your-email screen, but did not initially receive a code. User reports Resend delivered an email; confirmation with email/code then returned HTTP 400 with code CONFIRMATION_FAILED and message “Check your code and password, or request a new code.” This is email confirmation, not a password sign-in attempt. No user email/code/password is recorded.
- Investigation: required auth configuration fields are present (values not exposed); the running /api/auth/session endpoint returns 401 without a cookie, consistent with auth being registered. The old confirmation error mapping combines CodeMismatchException, ExpiredCodeException and InvalidParameterException, so the supplied response cannot establish whether a code is late/invalid/expired or another parameter/state was rejected. Initial delivery cause and actual confirmation rejection remain unresolved. A resend email arriving does not prove initial signup delivery worked.
- Diagnostic/message change: for email confirmation, distinguish invalid-code, expired-code and generic parameter/state rejection text while preserving CONFIRMATION_FAILED and avoiding password wording. Log only fixed categories code_mismatch / code_expired / invalid_parameter / other, never SDK messages/stacks, email, code or password. Password-reset errors retain their uniform response and account-discovery protections. No automatic resend, confirmation, login, AWS mutation or test email triggered by the agent.
- Next: retry confirmation after the updated API is running; record the new public message or sanitized server reason. Do not mark live signup/confirmation/login passed before user reports success. Diagnostics improve observability, not evidence that Cognito confirmation itself has been fixed.
- Provider reference: [ConfirmSignUp error documentation](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ConfirmSignUp.html). Verification results recorded below; live root-cause resolution remains pending.

- QA-022 automated verification: all 497 API tests, API typechecking and API build passed. Confirmation-route tests cover three provider rejection categories and sanitized response/log content; reset-account indistinguishability tests still pass. Formatting/whitespace checked. Evidence: `.codex-local/qa/QA-RUN-011-auth-confirmation/`. No real Cognito confirmation, fresh email delivery, browser or PostgreSQL rerun by the agent. Changes uncommitted; live retest remains required.

- QA-022 live follow-up: user now reports AUTH_REQUIRED from /api/auth/confirm. Current mapping means a different provider/account-state branch (for example NotAuthorizedException or UserNotFoundException), not confirmation-code mismatch/expiry. Neither confirmed status nor a wrong password is established by this response. Next read-only check is the exact account status in the configured Cognito pool (confirmed/unconfirmed/missing); no deletion, reset, resend or automatic local provisioning attempted. Live confirmation remains unresolved.

- QA-022 account-state/login follow-up: user reports the Cognito user is CONFIRMED, but password login returns AUTH_REQUIRED. Read-only inspection of the local database selected by the agent's root-env Node invocation found zero Cognito-backed users in total and zero for the configured pool. No emails, subjects or secrets were printed and no rows/accounts were changed. This establishes a local provisioning prerequisite is absent in that database; it does not establish that Cognito accepted the entered password or independently prove the running API has identical inherited environment values. A fresh QA database does not recreate application users from existing Cognito identities; signup masks UsernameExistsException and login intentionally does not adopt users or choose roles. Reconcile runtime configuration and use a genuinely new controlled signup identity, or explicitly recover an existing identity's trusted role/local mapping, before declaring auth passed. No password/account reset is indicated by this evidence alone.

## QA-RUN-012 — Branch closeout, October 28, 2026

- Automated checkout: `f69312e` on `014-test-demo-qa`; subsequent changes are documentation only. Environment: local macOS, Node 24.21.0. Evidence: `.codex-local/qa/QA-RUN-012-final/`.
- `npm run check` passed type checks, 761 tests (83 engine, 497 API, 181 web) and all production builds. Frontend entry: 481.61 kB / 145.95 kB gzip; no chunk-size warning. Jest's existing experimental VM-module advisory remains.
- `npm run db:test` passed 164 PostgreSQL checks (121 database, 43 API/workflow), with zero failures/skips. Tests use the configured test database; this does not establish live Cognito or production behavior.
- `npm run format:check` passed before closeout documentation; formatting and whitespace are checked again after those edits.
- QA-022 final disposition: user confirmed that selecting the intended application database resolved the latest login issue. A Cognito-confirmed identity alone does not recreate its application-user mapping in another database. No automatic adoption, role assignment or provider-account mutation was added. Initial email-delivery timing was not established; no full signup/reset/logout/browser matrix is claimed.
- All implementation changes described above are committed through `f69312e`; earlier “pending user commit” notes describe the state when each finding was recorded. Billing guard: `0cc9b53`; auth diagnostics: `f69312e`; earlier presentation fixes are retained in branch history.
- User elected to finish this focused branch and resume full manual QA after the remaining intended MVP features. Preserve historical Fail/Not run rows as evidence of incomplete full-case retesting, not as proof a focused fix remains broken. Automated regressions and earlier browser evidence are recorded separately; no new final browser walkthrough was performed.
- Carry forward OS keyboard text replacement (QA-010), workspace-navigation prominence (UI audit), and results-release policy redesign (QA-018). Full manual QA, the code/UI audits and the instructor-results-release feature remain pre-deployment work. Results release must settle whether grades include correct answers and the deferred completion-only feedback change before initial deployment, including the public demo.
- No fresh clean install, remote CI query, hosted deployment, live agent-driven Cognito/email/payment action, load/soak test or accessibility/browser matrix in this final run. Earlier intercepted-API browser checks are identified in their own records and are not end-to-end provider evidence.
