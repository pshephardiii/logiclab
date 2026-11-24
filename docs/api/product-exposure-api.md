# Product exposure API

`GET /api/product-exposure` is available without authentication in both product modes. It returns HTTP 200, `Cache-Control: no-store` and exactly one public field:

```json
{ "productExposure": "practice-only" }
```

The other supported value is `full`. No credentials, enabled-service flags or account information are returned. The shared strict response contract is exported from `@logiclab/contracts/product-exposure`. Fastify also supports HEAD for this GET route.

The browser requests this endpoint using the existing API base before mounting application providers. The returned mode must match its build-time `PRODUCT_EXPOSURE`; missing/invalid responses and either mismatch direction block startup with an unavailable screen and manual retry. The check runs on application startup, not continuously. Requests are aborted on unmount; obsolete responses cannot enable the application.

API startup reads `PRODUCT_EXPOSURE`: local development defaults to `full`, while `NODE_ENV=production` requires an explicit valid setting. Frontend serving defaults to `full`; every Vite build requires an explicit choice, even with a custom mode. API startup and Vite read the same `PRODUCT_EXPOSURE` from the root `.env`, with shell values taking precedence. Vite injects only the validated exposure choice; other root settings remain private. Frontend `.env` files continue to support unrelated public settings such as `VITE_API_URL`, but cannot choose exposure. The obsolete separate frontend exposure key is ignored. Rebuild to change the frontend mode and restart to change API mode. Deploy matching API/frontend versions because older APIs without this endpoint cannot start the new frontend.

In `practice-only`, the API registers only this endpoint, `/api/health`, and the anonymous truth-table exercise/check/solution endpoints. Private account/demo/classroom/library/assignment/student-work/billing routes return 404, regardless of cookies or supplied resource contexts. API startup skips normal/demo dependency creation and does not connect to the database or initialize account/payment services. Explicit operator CLI commands are outside this HTTP startup boundary.

The frontend makes only anonymous practice routes available: `/`, `/practice/proofs` and `/practice/truth-trees`. Other URLs show a practice-facing not-found page. It mounts no account/demo providers. This is runtime access control backed by server registration guards; it does not make shipped frontend source confidential. Full mode preserves existing service flags, session handling and role/ownership checks.

See the [truth-table API](truth-table-api.md), [release plan](../planning/practice-first-release.md) and [verification evidence](../verification/practice-only-exposure-verification.md).
