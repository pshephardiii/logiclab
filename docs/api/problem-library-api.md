# Private problem-library API

These endpoints manage instructor-owned truth-table drafts. Publishing, version history endpoints, archive/restore actions, classroom sharing, and the library UI are subsequent slices. Publishing will not itself grant students access.

All operations require an instructor session. Ownership comes from the authenticated application user; clients cannot supply owner or classroom identifiers. Authorization runs before request-field validation. Foreign and missing IDs both return `404 PROBLEM_NOT_FOUND`. Responses use `Cache-Control: no-store`; mutations require the configured exact `Origin`. Account-route read/mutation rate limits apply.

| Method | Path                              | Behavior                                                             |
| ------ | --------------------------------- | -------------------------------------------------------------------- |
| POST   | `/api/problems`                   | Create a private draft; return 201 with `{ problem }`                |
| GET    | `/api/problems?limit=20&offset=0` | List active owned drafts, newest creation first with ID tie-breaking |
| GET    | `/api/problems/:problemId`        | Read an owned draft, including an archived one                       |
| PATCH  | `/api/problems/:problemId`        | Edit supplied fields of an active owned draft; return `{ problem }`  |

## Draft content

```json
{
  "title": "Conjunction practice",
  "instructions": "Complete each answer cell.",
  "definition": {
    "type": "truth_table",
    "definitionVersion": 1,
    "formula": "P & Q"
  }
}
```

Title is trimmed and required (1–120 characters). Instructions are optional, trimmed, and bounded to 5,000 characters; null clears them. Formula is 1–256 characters and must pass the existing logic-engine parser and complexity limits (including the four-variable bound). Unsupported types/format versions and unknown fields are rejected. Definitions contain authored content, not expected-answer tables.

PATCH requires at least one field. Omitted fields retain their values; a supplied definition replaces the whole definition and is validated before persistence. Published snapshots are never modified by draft edits. Archived drafts return `409 PROBLEM_ARCHIVED` on edits and remain readable to their owner; restore will arrive with the publication/archive slice. Concurrent edits use row locking with last committed supplied-field values winning; optimistic editing/conflict tokens are not implemented.

Draft responses contain `id`, `title`, nullable `instructions`, `definition`, nullable `archivedAt`, and ISO `createdAt`/`updatedAt` timestamps. Owner IDs, Cognito identities, sessions, and publication contents are not added to these response objects.

## Pagination and errors

List responses contain `{ problems, nextOffset }`. Limit is 1–50 (default 20); offset is nonnegative (default 0). The store fetches one extra row to detect another page. Exactly full final pages still return null. Archives are excluded from active listing. Offset pagination does not provide a snapshot across concurrent library changes.

Errors use `{ error: { code, message, position? } }`. Invalid fields/formulas return 400; parser errors preserve their code and UTF-16 position. Missing/invalid sessions return 401, student accounts or disallowed origins 403, absent/foreign problems 404, archived edits 409, rate limiting 429, and unexpected operational failures a sanitized 503. Request-body transport errors retain their 400/413/415 statuses. No raw database/provider errors are returned.

## Verification

Colocated handler/route tests verify field normalization, formula bounds, pagination, ownership arguments, denial before storage, and sanitized responses. The PostgreSQL API integration suite additionally verifies persisted ownership, cross-instructor isolation, instruction clearing, reloads, and archive protection through actual routes and store transactions. Run `npm run check` and `npm run db:test`.
