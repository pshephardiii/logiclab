# Truth-table practice API

These public, stateless endpoints support independent practice. They do not store problems or attempts, authenticate users, enforce assignment policy, or produce official grades. Assignment workflows must later resolve a server-owned problem version and enforce its access, feedback, and solution policy; they must not trust a browser-supplied formula as assigned work.

All endpoints use `POST` with `Content-Type: application/json`. Request and response schemas/types are exported from `@logiclab/contracts`.

## Route organization

```text
services/api/src/routes/truthTable/
  index.ts
  errors.ts
  postExercise/
    route.ts
    handler.ts
    handler.test.ts
    route.test.ts
  postCheck/
    route.ts
    handler.ts
    handler.test.ts
    route.test.ts
  postSolution/
    route.ts
    handler.ts
    handler.test.ts
    route.test.ts
```

Each `route.ts` registers its method/path and handler with Fastify. The corresponding `handler.ts` owns request validation, engine calls, and response construction. `handler.test.ts` calls the real handler with minimal request/reply doubles to cover validation and detailed behavior. `route.test.ts` uses Fastify injection to cover HTTP registration, status codes, shared error handling, and the cross-endpoint flow. Detailed logic assertions live in handler tests rather than being duplicated at both levels. The entity's `index.ts` registers the endpoint plugins and scopes shared error handling; `errors.ts` provides the common bad-request response helper.

Jest discovers tests under both `src` and `test`; the production TypeScript build excludes colocated `*.test.ts` files. Logic algorithms remain in the engine, and API contracts remain in the schema package.

## Create an exercise

`POST /api/truth-tables/exercise`

```json
{ "formula": "P & Q" }
```

Returns alphabetical variables, given and answer column metadata, and rows whose `values` contain **only given column values**. Answer cells are absent so the UI can initialize them as blank. IDs and ordering follow the [logic-engine conventions](../tools/logic-engine/README.md). Formula errors return HTTP 400 with a code, message, and zero-based character position.

## Check answers

`POST /api/truth-tables/check`

```json
{
  "formula": "P & Q",
  "answers": [
    { "rowId": "row:v1:P=T;Q=T", "columnId": "expr:v1:(P ∧ Q)", "value": true },
    { "rowId": "row:v1:P=T;Q=F", "columnId": "expr:v1:(P ∧ Q)", "value": null }
  ]
}
```

Use booleans for T/F and `null` for explicit blanks; omitted cells are also unanswered. Returns every answer cell in row/column order with `correct`, `incorrect`, or `unanswered` status, plus counts and total answer cells. The response does not include solution values or replace student entries. Counts describe practice feedback, not a finalized grading policy.

The server regenerates correct answers from the formula. Unknown rows/columns, given-column edits, and duplicate cells return HTTP 400. Payloads are strict: unknown properties and non-boolean/non-null values are rejected. Requests are bounded to 256 formula characters and 4,096 submitted cells; the engine also limits variables and nesting.

## Show solution

`POST /api/truth-tables/solution`

```json
{ "formula": "P & Q" }
```

Returns the complete table, including expected answers, for independent practice. The UI can display these alongside saved student entries. This deliberately public practice endpoint is not an assignment solution-access control.

## Errors and development

Validation and formula errors use `{ "error": { "code": "...", "message": "...", "position": 0 } }`; `position` appears only for formula parsing errors. Malformed JSON uses the same envelope. Fastify transport errors such as unsupported content types or oversized bodies retain Fastify's normal error handling.

Root development builds and watches both shared packages before/alongside the API and web app. Individual API commands require built schema and engine packages. The browser uses all three endpoints: creating an exercise, checking entered answers (including blanks), and showing/hiding solutions alongside preserved student entries. Editing answers clears check feedback; editing the formula clears the entire exercise. Pending requests are canceled on edits so stale results cannot overwrite current work.
