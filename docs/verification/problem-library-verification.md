# Problem-library verification

Verification date: October 15, 2026. Branch: `005-feat-problem-library`.

## Automated checks

- `npm run check`: passed type checks, 325 tests (71 logic engine, 225 API, 29 frontend), and production builds.
- `npm run db:test`: passed 18 PostgreSQL integration tests (15 database and three API workflow tests).
- `npm run format:check` and `git diff --check`: passed.

Database coverage includes migrations/schema consistency, immutable publication triggers, owner isolation, active/archive filters, instruction clearing, sequential concurrent publication, and publication waiting behind committed draft edits and archive transactions. Publication tests use an isolated schema and drop that schema after verification without disabling immutability protections.

Frontend regression coverage includes create/edit failure retention, saved-draft publication, uncertain publication failures without automatic retries, archive/restore, list/history pagination, canceled list responses, role-aware navigation, explicit PATCH transport, and preview-state isolation.

## Local browser walkthrough

A temporary Playwright script runs installed Chrome against Vite, the real Fastify routes, and the real MikroORM store/PostgreSQL. Authentication uses injected synthetic identities and an HttpOnly cookie; it does not contact Cognito. All browser data belongs to a disposable schema in the test database, removed on completion.

The walkthrough covers:

- Create a draft, reject an invalid formula without clearing input, save a corrected formula, and publish version 1.
- Edit the title, verify publication is disabled until saving, publish version 2, and retain version 1's original title.
- Preview an immutable version, enter answers, check feedback, and show a solution without losing entries.
- Archive a problem, reload the browser, find the archived record, retain history, and restore editing.
- Seed additional owned drafts/publications and load subsequent problem/history pages through the UI.
- Preview a draft at 1280px and 390px widths, with no document overflow and one main landmark.
- Navigate between library previews and independent practice while preserving the practice formula and answers. Verify empty local/session storage.
- Verify an unrelated instructor sees an empty library and receives 404 for another owner's history; students receive the role-denied page and no library navigation; signed-out visitors redirect to the account page.
- Check that no uncaught browser exceptions occur and published versions remain in PostgreSQL until disposable-schema cleanup.

The browser script and desktop/mobile screenshots are local evidence under ignored `.codex-local/verification/`; they are not committed regression tests. Harness retries corrected history-refresh/page-selection assumptions, rather than changing application behavior.

## Limits

These checks do not verify live Cognito login/token refresh, remote GitHub CI, production hosting, other browsers, or a screen-reader audit. No AWS resources or emails were created. The existing Vite large-chunk warning and Jest experimental VM-modules warning remain; Vitest also reports its existing Vite native-config-loader advisory.

Library selection, unsaved editor fields, and preview answers are intentionally transient. Switching problems discards unsaved edits, with an inline notice. Offset pagination can shift during concurrent changes. Explicit publication is not idempotent: after a network failure, inspect history before retrying. Publishing does not grant students access; classroom sharing, assignments, grading, derivations, and billing remain subsequent work.
