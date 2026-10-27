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
- SET-03: user-provided npm run check output shows successful completion (final build succeeds and the shell prompt returns). Visible summaries: 140 API suites / 493 API tests and 28 web files / 136 web tests passed. The pasted output starts mid-run, so earlier-stage counts are not separately visible. Evidence: `.codex-local/qa/QA-RUN-003/npm-run-check-user-output.txt`. Database and formatting command results are still pending; the whole case is not marked passed. SET-01 remains without an explicit full-case completion report.
- No browser screenshots or independently executed manual steps recorded for this run.

## Case results

The matrix started with all cases Not run; it now records reported results as testing proceeds. When testing begins, add run ID, browser, commit and evidence/finding reference to the last column. Use Pass / Fail / Blocked / Not applicable / Not run. Explain every Blocked or Not applicable entry. For a subsequent run, preserve or copy the prior matrix into a dated run section so history is retained. Split multi-browser or partial cases into separate result rows rather than implying every substep passed.

| Case    | Scenario                                             | Result  | Run / commit / evidence or finding                                                              |
| ------- | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| SET-01  | Prepare an isolated QA database                      | Not run | —                                                                                               |
| SET-02  | Start demo-only mode                                 | Pass    | QA-RUN-003; user-reported October 27; checkout b357c19 at recording; see run notes              |
| SET-03  | Record automated baseline                            | Not run | QA-RUN-003 partial: npm run check passed from supplied output; db:test and format:check pending |
| PRA-01  | Correct, incorrect and blank cells                   | Not run | —                                                                                               |
| PRA-02  | Solutions, preservation and state reset              | Not run | —                                                                                               |
| PRA-03  | Parsing, limits and helpful errors                   | Not run | —                                                                                               |
| DEM-01  | Fresh instructor workspace                           | Not run | —                                                                                               |
| DEM-02  | Role switch and deep-link reload                     | Not run | —                                                                                               |
| DEM-03  | Invalid routes and no active demo                    | Not run | —                                                                                               |
| LIB-01  | Create, validate and restore a draft                 | Not run | —                                                                                               |
| LIB-02  | Immutable publication history                        | Not run | —                                                                                               |
| LIB-03  | Archive, restore and retained publications           | Not run | —                                                                                               |
| ASN-01  | Empty draft and mode transitions                     | Not run | —                                                                                               |
| ASN-02  | Repeated occurrences and saved snapshots             | Not run | —                                                                                               |
| ASN-03  | Published locks and archive/restore                  | Not run | —                                                                                               |
| WRK-01  | Saving false, blank and separate occurrences         | Not run | —                                                                                               |
| WRK-02  | Graded submission and frozen feedback                | Not run | —                                                                                               |
| WRK-03  | Instructor review and practice privacy               | Not run | —                                                                                               |
| WRK-04  | Completion is about filled cells, not correctness    | Not run | —                                                                                               |
| WRK-05  | Private practice, explicit checks and solutions      | Not run | —                                                                                               |
| WRK-06  | Immediate feedback, rapid edits and neutral blanks   | Not run | —                                                                                               |
| WRK-07  | Independent anytime solution policy                  | Not run | —                                                                                               |
| DUP-01  | Copy draft, publication and archived source          | Not run | —                                                                                               |
| DUP-02  | Unsaved source edits and existing filters            | Not run | —                                                                                               |
| DUP-03  | One request and uncertain-response recovery          | Not run | —                                                                                               |
| UNS-01  | Navigation Stay, Discard and fresh consent           | Not run | —                                                                                               |
| UNS-02  | Same-page actions and non-destructive actions        | Not run | —                                                                                               |
| UNS-03  | Clean, saved, failed-save and read-only states       | Not run | —                                                                                               |
| UNS-04  | Keyboard focus, Back/Forward and unload              | Not run | —                                                                                               |
| BILL-01 | Unpaid authoring versus publication                  | Not run | —                                                                                               |
| BILL-02 | Success, failure and separate purchases              | Not run | —                                                                                               |
| BILL-03 | Refund and retained work                             | Not run | —                                                                                               |
| BILL-04 | Checkout retry identity                              | Not run | —                                                                                               |
| CLS-01  | Create and validate classes                          | Not run | —                                                                                               |
| CLS-02  | Invite, redeem and replace                           | Not run | —                                                                                               |
| CLS-03  | Wrong workspace and invalid code                     | Not run | —                                                                                               |
| ISO-01  | Independent visitors and role guards                 | Not run | —                                                                                               |
| ISO-02  | Same browser, reset generation and multiple tabs     | Not run | —                                                                                               |
| ISO-03  | Request/response privacy                             | Not run | —                                                                                               |
| AUTH-01 | Enable normal accounts without losing demo access    | Not run | —                                                                                               |
| AUTH-02 | Signup, confirmation and immutable role choice       | Not run | —                                                                                               |
| AUTH-03 | Recovery, logout and restoration                     | Not run | —                                                                                               |
| AUTH-04 | Normal class/assignment path and coexistence         | Not run | —                                                                                               |
| AUTH-05 | Normal cross-owner and unenrolled student checks     | Not run | —                                                                                               |
| AUTH-06 | Provider token refresh within a valid local session  | Not run | —                                                                                               |
| ERR-01  | Read failure and retry                               | Not run | —                                                                                               |
| ERR-02  | Slow requests and stale results                      | Not run | —                                                                                               |
| ERR-03  | Two-tab revision conflict                            | Not run | —                                                                                               |
| ERR-04  | Throttling and input boundaries                      | Not run | —                                                                                               |
| OPS-01  | Explicit reset and logout                            | Not run | —                                                                                               |
| OPS-02  | Short idle and absolute expiry                       | Not run | —                                                                                               |
| OPS-03  | Capacity includes expired stored workspaces          | Not run | —                                                                                               |
| OPS-04  | Disabled schedules and manual cleanup                | Not run | —                                                                                               |
| OPS-05  | Report-only reconciliation, deduplication and cycles | Not run | —                                                                                               |
| OPS-06  | Operator errors and advanced recovery evidence       | Not run | —                                                                                               |
| UX-01   | Keyboard and accessible feedback                     | Not run | —                                                                                               |
| UX-02   | Mobile layout and zoom                               | Not run | —                                                                                               |
| UX-03   | Pagination and browser matrix                        | Not run | —                                                                                               |

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
- Evidence: `.codex-local/qa/QA-RUN-004-native-config/` contains the four command logs. Fix commit pending user commit.
- Limits: the production chunk-size warning remains a separate investigation. No manual browser QA, full monorepo suite, database tests or hosted checks were repeated for this frontend configuration fix.
- Reference: [Vite config loading](https://vite.dev/config/) documents native loading and its planned future default.
