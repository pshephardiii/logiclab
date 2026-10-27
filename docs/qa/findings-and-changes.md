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

## Case results

Initial planning matrix below: **all Not run**. When testing begins, add run ID, browser, commit and evidence/finding reference to the last column. Use Pass / Fail / Blocked / Not applicable / Not run. Explain every Blocked or Not applicable entry. For a subsequent run, preserve or copy the prior matrix into a dated run section so history is retained. Split multi-browser or partial cases into separate result rows rather than implying every substep passed.

| Case    | Scenario                                             | Result  | Run / commit / evidence or finding |
| ------- | ---------------------------------------------------- | ------- | ---------------------------------- |
| SET-01  | Prepare an isolated QA database                      | Not run | —                                  |
| SET-02  | Start demo-only mode                                 | Not run | —                                  |
| SET-03  | Record automated baseline                            | Not run | —                                  |
| PRA-01  | Correct, incorrect and blank cells                   | Not run | —                                  |
| PRA-02  | Solutions, preservation and state reset              | Not run | —                                  |
| PRA-03  | Parsing, limits and helpful errors                   | Not run | —                                  |
| DEM-01  | Fresh instructor workspace                           | Not run | —                                  |
| DEM-02  | Role switch and deep-link reload                     | Not run | —                                  |
| DEM-03  | Invalid routes and no active demo                    | Not run | —                                  |
| LIB-01  | Create, validate and restore a draft                 | Not run | —                                  |
| LIB-02  | Immutable publication history                        | Not run | —                                  |
| LIB-03  | Archive, restore and retained publications           | Not run | —                                  |
| ASN-01  | Empty draft and mode transitions                     | Not run | —                                  |
| ASN-02  | Repeated occurrences and saved snapshots             | Not run | —                                  |
| ASN-03  | Published locks and archive/restore                  | Not run | —                                  |
| WRK-01  | Saving false, blank and separate occurrences         | Not run | —                                  |
| WRK-02  | Graded submission and frozen feedback                | Not run | —                                  |
| WRK-03  | Instructor review and practice privacy               | Not run | —                                  |
| WRK-04  | Completion is about filled cells, not correctness    | Not run | —                                  |
| WRK-05  | Private practice, explicit checks and solutions      | Not run | —                                  |
| WRK-06  | Immediate feedback, rapid edits and neutral blanks   | Not run | —                                  |
| WRK-07  | Independent anytime solution policy                  | Not run | —                                  |
| DUP-01  | Copy draft, publication and archived source          | Not run | —                                  |
| DUP-02  | Unsaved source edits and existing filters            | Not run | —                                  |
| DUP-03  | One request and uncertain-response recovery          | Not run | —                                  |
| UNS-01  | Navigation Stay, Discard and fresh consent           | Not run | —                                  |
| UNS-02  | Same-page actions and non-destructive actions        | Not run | —                                  |
| UNS-03  | Clean, saved, failed-save and read-only states       | Not run | —                                  |
| UNS-04  | Keyboard focus, Back/Forward and unload              | Not run | —                                  |
| BILL-01 | Unpaid authoring versus publication                  | Not run | —                                  |
| BILL-02 | Success, failure and separate purchases              | Not run | —                                  |
| BILL-03 | Refund and retained work                             | Not run | —                                  |
| BILL-04 | Checkout retry identity                              | Not run | —                                  |
| CLS-01  | Create and validate classes                          | Not run | —                                  |
| CLS-02  | Invite, redeem and replace                           | Not run | —                                  |
| CLS-03  | Wrong workspace and invalid code                     | Not run | —                                  |
| ISO-01  | Independent visitors and role guards                 | Not run | —                                  |
| ISO-02  | Same browser, reset generation and multiple tabs     | Not run | —                                  |
| ISO-03  | Request/response privacy                             | Not run | —                                  |
| AUTH-01 | Enable normal accounts without losing demo access    | Not run | —                                  |
| AUTH-02 | Signup, confirmation and immutable role choice       | Not run | —                                  |
| AUTH-03 | Recovery, logout and restoration                     | Not run | —                                  |
| AUTH-04 | Normal class/assignment path and coexistence         | Not run | —                                  |
| AUTH-05 | Normal cross-owner and unenrolled student checks     | Not run | —                                  |
| AUTH-06 | Provider token refresh within a valid local session  | Not run | —                                  |
| ERR-01  | Read failure and retry                               | Not run | —                                  |
| ERR-02  | Slow requests and stale results                      | Not run | —                                  |
| ERR-03  | Two-tab revision conflict                            | Not run | —                                  |
| ERR-04  | Throttling and input boundaries                      | Not run | —                                  |
| OPS-01  | Explicit reset and logout                            | Not run | —                                  |
| OPS-02  | Short idle and absolute expiry                       | Not run | —                                  |
| OPS-03  | Capacity includes expired stored workspaces          | Not run | —                                  |
| OPS-04  | Disabled schedules and manual cleanup                | Not run | —                                  |
| OPS-05  | Report-only reconciliation, deduplication and cycles | Not run | —                                  |
| OPS-06  | Operator errors and advanced recovery evidence       | Not run | —                                  |
| UX-01   | Keyboard and accessible feedback                     | Not run | —                                  |
| UX-02   | Mobile layout and zoom                               | Not run | —                                  |
| UX-03   | Pagination and browser matrix                        | Not run | —                                  |

## Findings

No findings have been recorded yet. Assign sequential IDs QA-001, QA-002, etc. One root cause can link multiple failed cases; record separate issues when failures need different fixes or acceptance decisions.

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

| Entry   | Finding / cases | Change and reason                                                                                     | Commit                       | Checks actually run                                                | Retest / outstanding work |
| ------- | --------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------ | ------------------------- |
| QA-PLAN | All             | Add step-by-step runbook and empty results/finding/change templates. No application behavior changed. | Pending documentation commit | Documentation formatting, local links and case-ID consistency only | Manual cases not run      |

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
