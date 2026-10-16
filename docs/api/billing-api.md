# Simulated billing API

Billing routes are opt-in: set `BILLING_ENABLED=true` with a dedicated `BILLING_SIMULATOR_SIGNING_SECRET` (64 hex characters), enabled auth, and a migrated database. No real payment provider is contacted. Responses identify checkout as simulated. Publication enforcement and the billing UI are later slices.

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

There is no plan-management UI or automatic plan seed yet. For local development, create an active one-time `BillingPlan` through DBeaver using the migration-defined fields (for example, USD 2500 minor units, 180 coverage days, capability `publish_assignments`). This is demo configuration, not commercial pricing. The next UI slice will provide plan/status selection and setup guidance.

Run `npm run db:migrate` for the checkout request-ID migration. Existing purchases receive a unique historical request ID without changing their terms. Billing stays disabled until configured. This slice does not restrict assignment publication: active-grant enforcement follows separately, preserving existing published work and student submissions.
