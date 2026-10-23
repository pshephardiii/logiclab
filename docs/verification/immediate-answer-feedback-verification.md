# Immediate answer feedback verification

Date: October 23, 2026. Branch: `011-feat-immediate-answer-feedback`.

## Automated checks

- `npm run check`: type checks, 658 tests (71 engine, 487 API, 100 frontend), and production builds passed.
- `npm run db:test`: 158 PostgreSQL checks passed (121 database, 37 API/workflow).
- `npm run format:check` and whitespace checks passed.

Policy and API tests cover immediate timing for completion-only/practice, graded rejection, defaults, merged PATCH validation with atomic failure, persisted/read policy, published locks, and independent solution access. The migration preserves existing rows and defaults, expands checks, and refuses rollback while immediate assignments exist. Migrated schema comparison reports no pending changes.

The student workflow suite runs with both on_check and immediate timing. It verifies enrollment/workspace boundaries, no expected values in feedback, unchanged attempts after transient checks, invalid/duplicate cells, solution release, private practice, and completion finalization. Demo tests verify template 3 provisioning, unchanged older visitor policies on authentication, and explicit reset upgrade without extending the absolute deadline.

Frontend tests verify instructor transitions, failed-save retention and restored locked policies; 1.2-second debounce with latest answers; manual checking without a duplicate timer; aborted and late results; queued/in-flight cancellation on edits, navigation cancellation, reload, assignment changes and unmount; queued cancellation on saves/solution actions; failure retention/manual retry without retry loops; no automatic graded/on_check requests; submitted-work protection; and neutral blank cells without expected values.

## Local Chrome smoke

A temporary API and Vite process used an isolated disposable PostgreSQL schema and synthetic demo identities. Headless Chrome verified:

1. Seeded practice checks an edited answer automatically and marks an incorrect entry.
2. Rapid changes produce one debounced check of the latest answers; a corrected answer replaces old feedback.
3. Blanks have no Unanswered marker and expected solution values are not revealed by checking.
4. Manual Check works, unsaved changes remain visible, and explicit save/reload restores entries.
5. The page fits a 390px viewport without document overflow.
6. Switching to instructor restores the published immediate policy with its selector disabled.
7. Reset restores blank practice work, with empty local/session storage and no uncaught page errors.

The smoke script and screenshot remain ignored under `.codex-local/verification/immediate-feedback-*`. Servers and the temporary schema were cleaned up. This is local evidence, not a committed browser CI suite or exhaustive QA.

## Rollout and limits

Run `npm run db:migrate` before deploying the new application. `Migration20261023120000` expands existing string-column checks; there is no data backfill. Defaults remain graded/on_submission/never. Rollback refuses to discard immediate policies; older application contracts do not understand those policies, so coordinate application rollback as well as schema rollback.

Demo template 3 enables immediate feedback for the existing private practice example and retains the graded example. Existing visitors keep their data until explicit reset or a new workspace; authentication and role switching do not upgrade content.

The 1.2-second delay bounds automatic requests during sustained editing but does not replace server limits. Manual/multi-tab traffic may still encounter limits; failures retain input and require another edit or manual retry. Checks do not save, submit, or grant solution access.

No clean dependency installation, remote CI query, hosted deployment, live Cognito recheck, external payment/AWS call, multi-browser/screen-reader audit or load/soak test was performed. Existing Vite chunk-size, Jest VM-module and Vitest configuration advisories remain. Deliberate demo QA, a code audit, and deployment remain separate branches.
