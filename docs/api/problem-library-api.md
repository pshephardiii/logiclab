# Private problem-library API

These endpoints manage instructor-owned problem drafts, immutable published versions, and archive/restore actions. The instructor library UI is available at `/library`. Publishing does not grant students access.

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

PATCH requires at least one field. Omitted fields retain their values; a supplied definition replaces the whole definition and is validated before persistence. Published snapshots are never modified by draft edits. Archived drafts return `409 PROBLEM_ARCHIVED` on edits and remain readable to their owner; restoring makes them editable and publishable again. Concurrent edits use row locking with last committed supplied-field values winning; optimistic editing/conflict tokens are not implemented.

Draft responses contain `id`, `title`, nullable `instructions`, `definition`, nullable `archivedAt`, and ISO `createdAt`/`updatedAt` timestamps. Owner IDs, Cognito identities, sessions, and publication contents are not added to these response objects.

## Pagination and errors

List responses contain `{ problems, nextOffset }`. Limit is 1–50 (default 20); offset is nonnegative (default 0). The store fetches one extra row to detect another page. Exactly full final pages still return null. The `archive` query accepts `active` (default), `archived`, or `all`. Offset pagination does not provide a snapshot across concurrent library changes.

Errors use `{ error: { code, message, position? } }`. Invalid fields/formulas return 400; parser errors preserve their code and UTF-16 position. Missing/invalid sessions return 401, student accounts or disallowed origins 403, absent/foreign problems 404, archived edits 409, rate limiting 429, and unexpected operational failures a sanitized 503. Request-body transport errors retain their 400/413/415 statuses. No raw database/provider errors are returned.

## Verification

Colocated handler/route tests verify field normalization, formula bounds, pagination, ownership arguments, denial before storage, and sanitized responses. The PostgreSQL API integration suite additionally verifies persisted ownership, cross-instructor isolation, instruction clearing, reloads, and archive protection through actual routes and store transactions. Run `npm run check` and `npm run db:test`.

## Publishing and history

| Method | Path                                         | Behavior                                                           |
| ------ | -------------------------------------------- | ------------------------------------------------------------------ |
| POST   | `/api/problems/:problemId/versions`          | Publish a snapshot; return 201 with `{ version }`                  |
| GET    | `/api/problems/:problemId/versions`          | List owned versions newest first, with `limit`/`offset` pagination |
| GET    | `/api/problems/:problemId/versions/:version` | Read an owned snapshot by positive version number                  |
| POST   | `/api/problems/:problemId/archive`           | Archive an owned problem; return `{ problem }`                     |
| POST   | `/api/problems/:problemId/restore`           | Restore an owned problem; return `{ problem }`                     |

POST actions require an empty JSON object (`{}`). Publish copies the current title, instructions, and definition into an immutable snapshot, with `id`, `problemId`, sequential `version`, and ISO `publishedAt`. Each explicit publication creates a new version, including unchanged content: retrying a successful publish can create another version. Draft editing remains available after publication.

History lists return `{ versions, nextOffset }`, using the same pagination bounds as draft lists. Missing or foreign versions return `404 PROBLEM_VERSION_NOT_FOUND`. Archived problems retain owner-only history access; publishing an archived problem returns `409 PROBLEM_ARCHIVED`. Archive and restore are idempotent, and repeated archiving preserves the original archive timestamp.

Publish, edit, and archive/restore transactions lock the same parent problem row. Concurrent publications receive distinct sequential version numbers; snapshots reflect committed draft content, and publication checks archive state after acquiring the lock. Database triggers reject changes or deletion of published versions. PostgreSQL integration tests exercise simultaneous publications and publication waiting behind edit/archive transactions in a disposable schema, without bypassing immutability protections.

## Instructor library page

Sign in as an instructor and choose **Problem library** in navigation. Create a title, optional instructions, and a formula, then select **Save draft**. Select a problem from the list to edit it; failed saves retain entered fields. Switching problems or choosing **New problem** asks for confirmation when edits are unsaved; Stay retains the current fields. List refresh/filter/preview operations retain the editor without prompting. Reloading the browser reloads persisted library data; editor selection and unsaved input are not persisted.

Save edits before selecting **Publish saved draft**. Publication and archive controls are disabled while the form differs from the saved draft. Published versions show their own title, instructions, formula, and timestamp, with separate preview controls. A publication error can mean the server committed before the response was lost: reload history before deciding to publish again. The client never automatically retries publication.

**Preview draft** uses the current editor formula, including unsaved content. **Preview version** uses the immutable snapshot formula. Previews use the existing practice table, answer checking, and solution display, with state independent of the Practice page. Close/reopen a preview to start fresh. Nothing is assigned to students, and preview answers are not saved.

Use **Archive problem** to remove a saved problem from active listing; choose **Archived** or **All** to find it again. Archived drafts are read-only and retain version previews/history. **Restore problem** makes the draft editable and publishable. Problem lists and history load additional pages explicitly; failed loads can be retried through the reload controls.

Frontend regression tests cover create/edit failure retention, saved publication, uncertain publication failures, archive/restore, pagination, stale-response cancellation, role-aware navigation, and preview-state isolation. These DOM/hook checks do not replace the final real-browser and live-session walkthrough.

## Formula notation

Truth-table drafts, previews and published snapshots accept `↔`/`<->` and `~` alongside the existing operators. Source notation is retained in the saved definition; canonical table IDs are shared across aliases. Repeated biconditionals require explicit grouping and invalid edits return positioned errors without replacing the saved draft. Assigned work evaluates its pinned server-owned formula rather than accepting a replacement formula from the student. See [notation and precedence](truth-table-api.md#formula-notation).

## Conceptual authoring (branch 017)

The original three supported version-1 definition types are `truth_table`, `true_false` and `multiple_choice`. Only truth-table formulas enter the logic parser; conceptual question text is plain text, not a formula.

A true/false definition contains `{ type: "true_false", definitionVersion: 1, question, correctAnswer: boolean, explanation?: string | null }`. A multiple-choice definition contains `{ type: "multiple_choice", definitionVersion: 1, question, options: [{ id: UUID, text }], correctOptionId: UUID, explanation?: string | null }`. Limits are 2,000 characters for questions, 2–6 unique options with 500-character labels, and 5,000 characters for explanations. IDs normalize to lowercase; the one selected key must reference an option. Invalid keys, duplicate IDs/trimmed labels and mixed definition fields return 400 before storage. Updates replace the whole definition; keys are not inferred from labels or array positions.

These are privileged instructor DTOs and intentionally contain keys/explanations. They must not be reused for student questions or saved-answer responses. Owner checks, normal/demo isolation, no-store/origin policies and immutable publication history apply unchanged. Snapshot contents remain stable through later draft/key/option edits and archive/restore.

The library editor now supports all three types, with explicit keys, option add/remove/reorder controls and local shared-contract validation. Editing text or moving an option retains its UUID; removing the selected option clears the key and requires another selection. New options get fresh UUIDs. Type changes retain local fields while the editor stays open; only the selected type is saved. Failed saves preserve edits and unsaved-work protection; archived drafts stay read-only. Draft and published-version previews use isolated local state. Conceptual preview answers/explanations are hidden until Show preview answer; this instructor-only view creates no student attempt.

Conceptual published versions can now be added to ordered assignments, including repeated occurrences. Assignment create/update/publication validates supported pinned definitions and retains owner/content/coverage checks. Student and final-review flows support conceptual responses and mixed result formats with independent release rules. Unknown definition formats still fail closed with `PROBLEM_DEFINITION_UNSUPPORTED`. No migration is needed; these definitions and results use existing JSONB columns.

## Derivation authoring (branch 021, HTTP slice)

Private owner routes now accept/return `derivation` alongside the three existing types through the `LibraryProblem*` schemas in `@logiclab/contracts/problem-library`. The shared assignment definition union stays narrower. Derivation definitions pin Fitch format, definition/checker/catalog version 1, stable premise IDs, conclusion, enabled rule IDs/effective labels, nullable private reference proof and optional explanation. See [authoring limits and label rules](../planning/derivation-authoring.md). Incomplete formulas and missing/unfinished references are valid saved drafts; supported configuration and normalized label uniqueness are enforced on every replacement.

| Method | Path                                       | Behavior                                                                                                      |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/problems/:problemId/reference-check` | Check the owner's saved reference against its saved statement/rules; return `{ problemId, updatedAt, check }` |

This action requires an empty JSON object, the configured exact Origin and instructor ownership. It inherits `no-store` and the bounded POST rate policy (10 requests per 15 minutes per client/route). It is available for archived drafts and writes no proof, grade, publication or cached acceptance. Demo routing exposes the same action at `/api/demo/resources/problems/:problemId/reference-check` with the workspace transaction/owner fence. As a POST demo action, it follows the existing activity policy.

`check` is either `{ status: "missing" }` or `{ status: "checked", report }` with the strict versioned checker report. The owner may receive syntax/rule/scope/dependency diagnostics. Checked does not imply accepted. Clients must associate the report with its source problem/timestamp and discard obsolete responses; publication does not trust the response or any client-supplied report. It rechecks the saved reference under the parent lock. Missing references return `409 DERIVATION_REFERENCE_REQUIRED`; any checked but nonaccepted reference prevents publication with `409 DERIVATION_REFERENCE_NOT_ACCEPTED`. Unsupported configuration/rule IDs return 400; generic errors never embed the reference/report. A successful publication retains all private reference data immutably in the owner-only snapshot.

The frontend can create/edit derivation statements, premises, enabled rules, effective labels and explanations, and inspect/check/publish/archive saved derivations with private history. Reference lines/subproofs remain read-only; their editor follows separately. Normal truth-table/conceptual editors remain available. The library page loads lazily to keep authoring/checker schemas out of the public entry bundle. The saved-reference UI does not check automatically or retry failures; selection/saved-snapshot replacement and unsaved edits cancel requests and clear older results.

Derivations remain unavailable for assignment create/update/publication and student workflows. The assignment picker reads mixed private library pages but filters derivation versions, preserves pagination and still offers supported historical versions even when the current draft is a derivation. No student endpoint exposes these private DTOs. No demo derivations are seeded yet. Matching API/frontend/contracts builds are required; old library clients cannot parse mixed derivation pages. No migration or new environment variable is required.

The statement editor supports stable premise add/remove/reorder, explicit permission for each catalog rule and canonical/alias label suggestions or custom labels. No rule is enabled by default. Incomplete formula text can be retained in a draft, while normalized duplicate enabled labels fail local contract validation. Existing reference data is preserved through statement/rule changes and must be checked again; the frontend never rewrites a reference to match an edited premise. Failed saves preserve fields and navigation protection; archived forms are disabled. Only the selected type's fields are submitted. See [editor behavior](../planning/derivation-authoring.md#statement-and-rule-editor).
