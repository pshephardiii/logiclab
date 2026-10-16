# Assignments and progress verification

Verification date: October 16, 2026. Branch: `006-feat-assignments-and-progress`.

## Automated checks

- `npm run check`: passed type checks, 434 tests (71 logic engine, 314 API, 49 frontend), and production builds.
- `npm run db:test`: passed 38 PostgreSQL integration checks (33 database and five API workflows).
- `npm run format:check` and `git diff --check`: passed.

Database tests apply migrations to disposable test data, check schema consistency, and verify that test runs do not rewrite application snapshots. Coverage includes assignment ownership, ordered pinned versions, repeated problem occurrences, publication/content locks, archive/restore, unique attempts, retained final results, and submitted-attempt immutability. API integration tests cover enrollment isolation, invalid/foreign cells, revision conflicts, concurrent saves/submission, feedback and solution release, and final-only instructor review. Review checks distinguish archiving from enrollment removal and retain owner access to final submissions after either event.

Frontend regression tests cover role navigation, paginated selection and retries, authoring failures, saved-state restoration, independent repeated items, explicit saves, unanswered versus false cells, dirty-answer preservation, final confirmation, uncertain submission outcomes, locked results, protected solutions, canceled requests, and instructor review pagination/retry.

## Local browser walkthroughs

Temporary Playwright scripts run installed Chrome against Vite, real Fastify routes, and MikroORM/PostgreSQL. They use synthetic identities and HttpOnly sessions in disposable test schemas, with cleanup afterward; Cognito is not contacted.

The instructor authoring walkthrough covers class selection, published-version selection, ordered items, draft save/edit, publication, archive/restore, pagination, and ownership/role boundaries. The student completion and review walkthrough covers:

- Save different answers for repeated occurrences of one published problem.
- Confirm a final submission and verify correct, incorrect, and unanswered counts.
- Reload and restore read-only submitted work without regrading it.
- Show an enabled solution without changing saved answers.
- Save another student's draft and verify it is absent from instructor lists and inaccessible through a direct review URL.
- Review the final submission as the class owner; reject a foreign instructor and guard instructor pages from students.
- Check 1280px and 390px layouts, document overflow, empty browser storage, and uncaught browser errors.

Scripts and screenshots remain ignored local evidence in `.codex-local/verification/`, rather than committed browser regression suites. Automated frontend tests and PostgreSQL/API integration tests provide committed regression coverage.

## Limits and rollout

Remote GitHub CI, live Cognito flows, production deployment, other browsers, and screen-reader behavior were not verified in this pass. No AWS resources or emails were created. Existing Vite chunk-size, Jest experimental VM-modules, and Vitest native-config advisories remain. A clean dependency installation was not repeated for this branch's final pass.

Existing development databases need `npm run db:migrate` before using assignments and attempts. Publication locks assignment content and policy; archiving hides student access while retaining final submissions for instructor review. Students save explicitly and submit once; uncertain submission failures require reloading saved work before retrying. Offset pagination can shift under concurrent changes.

This branch supports graded truth tables with feedback after submission and optional solutions after submission. Immediate feedback, completion-only/ungraded modes, deadlines, resubmission, grade overrides, enrollment removal UI, institutions, billing, and hosted deployment remain later work. Assessment mode, feedback timing, and solution access stay separate policy concepts.
