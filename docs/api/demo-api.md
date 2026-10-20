# Isolated demo API

Opt-in with `DEMO_ENABLED=true`; disabled instances register no demo routes. No Cognito credentials or account-role changes are involved. Normal account endpoints keep their existing contracts.

## Lifecycle endpoints

| Method | Path                | Body                                  | Result                                                                            |
| ------ | ------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| POST   | `/api/demo/start`   | `{ "role": "instructor" }` or student | Start a new synthetic workspace, or resume/switch the current valid workspace     |
| GET    | `/api/demo/session` | —                                     | Restore the current role/workspace                                                |
| POST   | `/api/demo/role`    | `{ "role": "student" }` or instructor | Rotate the credential and switch within the same workspace                        |
| POST   | `/api/demo/reset`   | `{}`                                  | Atomically reseed, increment generation, and rotate the current role's credential |
| POST   | `/api/demo/logout`  | `{}`                                  | Revoke the credential and clear only the demo cookie                              |

Successful session responses contain `mode: "demo"`, `user: { id, role }`, `workspace: { id, generation }`, and a synthetic-data/no-charge notice. Tokens are never returned in JSON. Bodies are strict contracts: callers cannot supply workspace IDs, user IDs, generations, or payment prices.

The opaque `logiclab_demo` cookie is HttpOnly, SameSite=Strict, Secure on HTTPS, and scoped to `/api/demo`. Its database record stores only a domain-separated hash. The cookie's maximum age does not extend server-side absolute expiration. Mutations require the exact configured `Origin`, and responses use `Cache-Control: no-store`. Standard account-route IP limits apply. Start is also bounded by the persisted workspace capacity; a full store or operational failure produces a sanitized 503 response without partial data or credentials.

Invalid/stale/expired demo sessions receive 401. Rejection responses intentionally do not clear the cookie: an older request must not erase a fresh cookie issued by concurrent role switching/reset. Explicit logout clears it. Clients reconcile failed rotation/reset requests through the session endpoint; an old credential cannot reset twice or revive deleted data.

## Resource endpoints

The same classroom, problem-library, assignment, student-work, submission-review, and simulator billing contracts/handlers are reused under `/api/demo/resources/` instead of `/api/`. For example:

```text
/api/classes                              -> /api/demo/resources/classes
/api/problems                             -> /api/demo/resources/problems
/api/student/assignments/:id               -> /api/demo/resources/student/assignments/:id
/api/classes/:id/billing                   -> /api/demo/resources/classes/:id/billing
```

The normal resource endpoint documentation supplies exact methods/paths and contracts. There are no demo auth/signup, webhook, or operator/job endpoints. Only the simulator's owned checkout/scenario controls are exposed; browser success does not bypass entitlement checks.

The request wrapper holds a workspace row lock and rechecks the credential/generation before calling a handler. AsyncLocalStorage selects request-local stores bound to that transaction; it never holds mutable global current-user state. Store calls must use the resolved actor ID. Writes commit before Fastify sends their payload, and mutation activity updates remain capped by the original absolute expiration. Reads do not keep an abandoned tab alive. Normal resource requests do not accept the demo cookie.

Resource ownership/enrollment checks still apply. Invitation redemption additionally requires matching identity boundaries: demo users may join only their own workspace's classes; normal users may join only normal classes. Forged IDs, normal-account invitations, and another workspace's codes do not grant demo access.

## Client behavior and limits

The web UI keeps demo routes under `/demo`, routes their resource calls to the demo namespace, and uses normal routes for normal account access. Role/reset changes remount the demo page tree by workspace/generation/user so old resource IDs and unsaved state are discarded; aborted requests cannot repopulate that state. Demo credentials never enter local/session storage.

Provisioning is server-initiated and transactional; a failed seed leaves no workspace graph. Initial starts without a valid cookie may allocate a new workspace. Existing active credentials resume their workspace; a losing concurrent role rotation fails rather than allocating a replacement workspace. A lost reset response may require starting a fresh demo if its new cookie was not received.

Capacity currently includes expired workspaces because automatic cleanup is the next slice. Rate limits are process-local. These controls do not constitute a verified production deployment; see [local setup and remaining work](../development/public-demo.md).
