# Instructor classes

The instructor class slice persists classes and exposes owner-scoped creation, listing, and detail lookup. Enrollment and invitations follow in the next slice.

## Data and defaults

`classrooms` stores a UUID, trimmed name (1–120 characters), one owner referencing `users`, and creation timestamp. Names may repeat. Owner deletion is restricted while classes exist; account deletion/ownership transfer needs an explicit future workflow. The server derives ownership from the authenticated session, never client input. Instructor eligibility is enforced by the API; the foreign key ensures the owner exists but does not constrain the referenced account role.

## API

These routes register when authentication and database dependencies are enabled. They use the existing HttpOnly session cookie, return `Cache-Control: no-store`, and expose no owner email or Cognito identifier.

| Method/path | Input | Response |
| --- | --- | --- |
| `POST /api/classes` | JSON `{ "name": "Introduction to logic" }` | 201 `{ "classroom": { "id", "name", "createdAt" } }` |
| `GET /api/classes` | Optional `limit` (1–50, default 20), `offset` (0–100000, default 0) | `{ "classrooms": [...], "nextOffset": number or null }` |
| `GET /api/classes/:classId` | UUID | `{ "classroom": { "id", "name", "createdAt" } }` |

Creation requires the exact configured `Origin`, JSON, and an authenticated session whose stored role is instructor. Anonymous/expired sessions return 401; students return 403. Unknown request fields, invalid names, pagination, or UUIDs return 400. Detail lookup includes both ID and owner in the database query; foreign and missing classes both return the same 404. Storage/provider errors return sanitized 503 responses. Creation has a per-IP limit of 10 requests per 15 minutes; reads allow 60 per minute, using the current in-process limiter.

Lists use newest-first creation time and UUID tie-breaking. Offset pagination is bounded and can shift under concurrent creation; reload to get the current list. Editing, archiving, deletion, invitations, membership, assignments, and billing are deferred. Classes persist across restarts/reloads; anonymous truth-table work remains stateless.

## Local use

Apply migrations with `npm run db:migrate`, start `npm run dev`, and sign in as an instructor at http://localhost:5173. Select **Classes**, enter a class name, and choose **Create class**. Use **Reload classes** to retry/load current data and **Load more classes** for further pages. Students do not receive the Classes navigation entry; the API independently enforces the role requirement.

The frontend owns its form, list, state hook, and API client under `features/classroom`. Failed creation preserves the name for retry. Successful creation clears the form and adds the returned class without a second mutation. This slice does not yet provide idempotent creation: after an ambiguous connection loss, reload before retrying to avoid duplicates. Requests are canceled on screen exit, and class UI state is discarded when the signed-in user changes. Vite rebuilds the linked CommonJS contracts prebundle at startup to pick up new exports.

## Verification

`npm run check` passed 200 engine/API tests, workspace type checks, and production builds. Six real PostgreSQL integration tests passed, including class persistence, owner-scoped queries, and restricted owner deletion. The migration was applied to local development/test databases; MikroORM reports no remaining schema changes. A compiled Fastify check with the actual MikroORM store and synthetic sessions/users verified create/list/detail, cross-owner 404 isolation, and student rejection against PostgreSQL. A one-off Chrome check with mocked responses passed instructor navigation, empty/list retry states, failed-create name preservation, successful creation, reload/pagination, student navigation restriction, and a 390px layout. Browser checks are local evidence rather than a committed regression suite; live browser-to-Cognito classroom checks remain for the developer. The existing Vite bundle-size warning remains.
