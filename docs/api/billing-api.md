# Simulated billing API

Billing routes are opt-in: set `BILLING_ENABLED=true` with a dedicated `BILLING_SIMULATOR_SIGNING_SECRET` (64 hex characters), enabled auth, and a migrated database. No real payment provider is contacted. Responses identify checkout as simulated. New assignment publication now requires active class coverage. The instructor billing UI is available at `/billing`.

| Method | Path                                          | Access                                                         | Purpose                                          |
| ------ | --------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| POST   | `/api/classes/:classId/checkout`              | Owning instructor, session cookie and exact application origin | Create/reuse a pending class purchase            |
| POST   | `/api/billing/purchases/:purchaseId/simulate` | Owning instructor, session cookie and exact application origin | Generate and process a trusted simulated outcome |
| POST   | `/api/billing/webhook`                        | Signed raw JSON; no session/origin requirement                 | Process a verified provider event                |

Account mutations inherit account rate limits; the webhook accepts up to 120 requests/minute/IP and caps its body at 16 KiB. Rate limits are per process. All billing responses use `Cache-Control: no-store`. Unknown/foreign classes and purchases return 404; signed-out accounts return 401 and student accounts return 403. Operational errors are sanitized. Cookie and signature headers are redacted from API logging.

## Checkout

Body: `{ "planId": "<uuid>", "requestId": "<uuid>" }`.

The request ID identifies one checkout intent. Reuse it after a network failure; generate a new one only for a deliberate new purchase. It is unique per payer, and reuse for another class or plan returns 409. A concurrent retry returns the same persisted purchase. The server checks current ownership, loads an active one-time plan, and snapshots its price, currency, duration, and capability. Client prices/durations/ownership fields are rejected. Repeating a successful request returns the current purchase without changing its terms, even if the plan was subsequently retired.

Response (201) contains `purchase` with ID, class/plan IDs, status, amount in minor units, currency, coverage days, and capability; plus `mode: "simulated"` and a no-real-payment notice. It contains no signing key or provider credentials. Checkout creates neither coverage nor a successful-payment event.

The local provider makes no network call. Creating a real external checkout while holding a transaction would require a separate integration design (provider idempotency/reconciliation); this implementation does not claim real-provider checkout reliability.

## Simulator control

Body: `{ "outcome": "paid" | "failed" | "refunded" }`.

Only the current class owner can generate an outcome for its purchase. The server supplies the source reference, sequence, event ID, and timestamps, signs the event, verifies it through the same verifier as the webhook, then processes it transactionally. Browsers cannot submit their own sequence, prices, or timestamps through this control. This is an intentional no-charge demonstration control, not proof that money was collected.

## Webhook and ordering

Send `Content-Type: application/json` and `x-logiclab-signature: t=<delivery timestamp>,v1=<HMAC>`. The verifier signs `<timestamp>.<exact raw body>` with HMAC-SHA256, enforces a five-minute delivery window, and validates the strict version-1 event envelope. Invalid signatures/envelopes return 400 before database processing. A retry retains event ID/body and can receive a fresh delivery signature.

A purchase row lock serializes processing. Provider-scoped event IDs and body hashes distinguish duplicate deliveries from conflicting reuse. An identical committed event returns `duplicate`; changed content for a committed ID returns 409. Event receipts and all purchase/grant effects commit in one transaction. A failed transaction leaves no receipt or partial grant and may be retried with the same event.

- Pending + paid creates one coverage grant, starting at verified event occurrence time and lasting the purchased number of 24-hour days.
- Pending + failed ends that purchase without coverage. A deliberate retry requires a new checkout; later paid events cannot activate a failed purchase.
- Refunded is terminal and revokes only that purchase's grants. A refund remains terminal even when delivered behind a higher-sequence success. Subsequent successes cannot restore it.
- Other old/equal sequences return `ignored`, recording a receipt without changing coverage. The stored sequence never decreases.
- Repeated success with a different event ID does not extend coverage. Other valid funding grants remain independent.

Unknown source references return 404. Occurrence times before checkout creation or more than five minutes in the future are rejected. Source sequences must fit the persisted positive integer range. Responses contain `{ "result": "applied" | "ignored" | "duplicate" }`; `applied` means the event was newly accepted, even if the terminal purchase status prevented a business-state change.

## Catalog and rollout

There is no plan-management UI or automatic seed. Run the explicit `npm run billing:seed` command for local demo catalog setup, as described below. Its terms are demo configuration, not commercial pricing.

Run `npm run db:migrate` for the checkout request-ID migration. Existing purchases receive a unique historical request ID without changing their terms. Billing stays disabled until configured. New assignment publication requires a current `publish_assignments` grant even when billing HTTP routes are disabled. Disabling `BILLING_ENABLED` disables checkout/control/webhook endpoints, not the publication policy. Without billing configured, existing classes can still author drafts and use previously published work; new publication needs an existing valid grant or configured simulated checkout.

## Publication access and refund concurrency

Publication checks only class capability grants, without consulting purchase status, provider, source kind, or current plan settings. This is the boundary future institution subscriptions will reuse. A grant must match the class and capability, be unrevoked, and satisfy `startsAt <= now < endsAt`. Any matching valid grant is sufficient. No active grant returns HTTP 409 with code `CLASS_COVERAGE_REQUIRED`, leaving the draft unchanged.

The publication transaction holds a shared class-row lock; payment effects take that class lock exclusively. A refund that commits first is visible to the publication check. If publication wins, it commits as retained published work before refund revokes coverage for subsequent publication. Time is checked after lock acquisition. Future subscription allocation/revocation writers must follow the same locking protocol. Expiration is checked from timestamps without waiting for a cleanup job.

Coverage is required only for the first publication transition. Repeating a publish request for an existing active publication remains idempotent after coverage ends. Existing ownership/enrollment/assignment policies still control reads, saves, submissions, solutions, and instructor review. Archive/restore does not republish or require new coverage; restoring a published assignment preserves its original content and policy lock. Draft authoring and the independent problem library remain free. No grant is silently backfilled for existing classes.

## Instructor billing reads and UI

`GET /api/billing/plans` lists active one-time plans; recurring or retired plans are excluded. `GET /api/classes/:classId/billing` returns owned class coverage and purchase history. Both require an instructor session, use `Cache-Control: no-store`, accept `offset` (default 0) and `limit` (default 20, maximum 50), and return `nextOffset` or null. Plan order is name/ID; history order is newest creation time/ID. Offset pages can shift with concurrent changes.

Coverage is evaluated on the server under the shared class lock. Its `active` flag and latest end time refer to currently valid grants; future or revoked grants do not count. Read responses expose purchase IDs, purchased terms, status, and creation time, without source references, request IDs, event payloads, or credentials. Foreign classes return 404.

Instructors can use `/billing` to select a class, page through plans/history, create a no-charge checkout, simulate success/failure, and refund a paid purchase. The page explains one-time coverage, retention, and the fact that another purchase starts its own period rather than extending the current one. Assignment pages link to billing when publication requires coverage. There is no institutional subscription UI.

A failed checkout response retains its request ID while the page remains mounted, and retry uses the same intent. The selected plan stays pinned until that retry succeeds or the user explicitly discards the retry intent after inspecting history. Browser navigation/reload does not persist an unconfirmed checkout intent: inspect history before creating another checkout. Canceling browser requests cannot cancel committed server work. An uncertain simulated outcome disables further outcome controls until billing is reloaded; outcomes are never retried automatically. No signing secrets, tokens, or checkout intents are stored in browser storage.

For local setup, run `npm run db:migrate`, then `npm run billing:seed` from the repository root. The seed creates one USD 25.00 / 180-day simulated plan at a stable ID; rerunning preserves edited/retired terms. It neither creates purchases nor grants coverage. Set `BILLING_ENABLED=true` and a dedicated signing key in ignored `.env`, restart the API, and visit `/billing` as an instructor. Disabled billing returns clear unavailable/setup guidance. The UI displays refreshed snapshots; publication always rechecks coverage on the server.
