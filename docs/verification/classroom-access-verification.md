# Classroom access: walkthrough and verification

Final local verification · October 13, 2026 · `003-feat-classroom-access`

This branch adds separate student/instructor accounts, persistent sessions, instructor-owned classes, reusable invitation codes, and student enrollment to the existing anonymous truth-table practice. Accounts and classroom data persist in PostgreSQL; practice answers remain browser memory and clear on reload. Assignments, student submissions, grading, institutions, and billing are future work.

## Walkthrough

Follow [local PostgreSQL/DBeaver setup](../development/local-database.md) and [Cognito development setup](../development/cognito-development.md), apply migrations, and run `npm run dev`. Open http://localhost:5173; the API loads backend settings from the ignored root `.env`. Use the exact configured origin for browser mutations.

1. Open **Sign in / Create account**, create an instructor account, and confirm its email. Sign in; the stored role is preserved.
2. Open **Classes**, create a class, and select **Generate new invitation code**. Copy it before leaving the page. Generating again replaces the previous code, with a new seven-day expiry.
3. Sign out. Create/confirm a separate student account, sign in, and open **My classes**.
4. Paste the current code and select **Join class**. Join again with the same valid code: one enrollment/list entry remains. Reload to confirm membership persists.
5. Join another instructor's class to demonstrate multiple enrollments. Students see only classes they joined. Instructors see only their owned classes and cannot enroll as students.
6. Replace the original code as its instructor. The old code cannot create new enrollments; existing membership remains. Unknown and expired codes receive the same safe error.
7. Switch between account/classes and practice: formula, answers, and feedback survive navigation. Browser history and direct frontend URLs work. Reload clears practice, while the session is restored through the API.
8. Try account recovery/reset and logout. Successful recovery invalidates local sessions; logout clears the browser cookie. Confirmation/reset returns to ordinary sign-in.

Route guards guide the browser; backend session, role, owner, and enrollment checks enforce access. See [Auth API](../api/auth-api.md) and [Classroom API](../api/classroom-api.md) for contracts, limits, and edge cases. Student view for instructors remains a future preview feature, not dual-role enrollment.

## Checks performed

| Check                                                                                    | Final result                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                                          | Passed all workspace type checks, 224 Jest tests (71 engine, 153 API), and production builds                                                                                                                                                                                                            |
| `npm run db:test`                                                                        | Passed eight PostgreSQL tests, including migrations applied twice without test snapshot changes, identities/email, roles, session cascade, ownership, invitation rotation, and multi-instructor enrollment constraints                                                                                  |
| MikroORM `migration:check`                                                               | No schema changes required                                                                                                                                                                                                                                                                              |
| Clean temporary project, excluding dependencies, build output, secrets, and local drafts | `npm ci` and `npm run check` passed; offline install initially failed because the cache lacked a dependency, then normal installation succeeded                                                                                                                                                         |
| Chrome account smoke check                                                               | Signup role, confirmation/resend, login failure/retry and password clearing, session restoration, logout, recovery/reset, preserved practice input, and no browser storage                                                                                                                              |
| Chrome routing smoke check                                                               | URL navigation/back/forward, preserved formula and answer, delayed session restoration on class deep links, student denial, anonymous redirect, no unauthorized class requests, and not-found recovery                                                                                                  |
| Chrome invitation smoke check                                                            | Generate/replace, failed replacement clears stale display, retry, screen-exit clearing, no storage, and 390px layout                                                                                                                                                                                    |
| Chrome enrollment smoke check                                                            | Student route, empty/list retry, invalid-code retry, success/duplicate join, pagination/reload, absent instructor controls, role guard, no storage, and 390px layout                                                                                                                                    |
| Compiled API with actual store and PostgreSQL, synthetic sessions/users                  | Invitation replacement/hash-only persistence, response privacy, owner/student rejection, multi-class enrollment/read access, cross-student isolation, invalid/expired/replaced codes, duplicate concurrent joins, retained membership, and redemption blocked behind a committed invitation replacement |

Browser checks use intercepted/mock auth/API responses and real Chrome; the routing check generates a real engine exercise. Compiled HTTP checks use synthetic sessions instead of contacting Cognito and clean up their synthetic users/classes. These temporary browser/concurrency checks are local evidence, not committed CI regression suites. The repository CI defines workspace and PostgreSQL jobs; remote CI results were not queried in this verification.

The developer previously reported real Cognito signup email, confirmation, login with stable ID/role, logout/session rejection, and recovery/reset followed by login. Those are separate from automated evidence. Real resend, expired-access-token refresh, and a full live browser instructor-to-student enrollment walkthrough still need developer verification. No new AWS resources or emails were created by final verification.

## Limits and next work

The frontend build reports the existing approximately 774 kB chunk warning; Jest emits its experimental VM-modules warning. Role selection permits public instructor registration by the agreed default. Auth must be enabled and the development pool configured for accounts. The current deployment assumes same-origin `/api` routing, and hosted frontend paths need an `index.html` fallback.

Rate limits are in process memory. Session cleanup, controlled encryption-key rotation, signup/reset reconciliation procedures, production email delivery, and production hosting still need operational work before broader public use. Invitation rotation is last-write-wins. Class creation has no idempotency key, so reload before retrying after an ambiguous connection failure. Enrollment removal, ownership transfer, class archival, and data-retention workflows are deferred.

The agreed next branch is `004-refactor-codebase`: review structure, duplication, naming, and regression coverage with no new features or intended behavior changes. Later implementation-plan branches have been renumbered to avoid reserving `004` twice.
