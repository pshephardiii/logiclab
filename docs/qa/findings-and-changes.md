# QA results, findings and changes

Branch: `014-test-demo-qa`. Plan prepared October 27, 2026.

No manual case has been executed by creating this document. No findings recorded yet does not mean no defects exist. Use the [runbook](manual-qa-runbook.md) as the source of numbered actions and expected results.

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
| AUTH-02 | Signup, confirmation and immutable role choice       | Not run | —                                                                                                              |
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
