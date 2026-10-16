# Simulated billing development

The provider adapter is local code with no external payment SDK, network calls, card data, or real charges. Owned checkout persistence, signed webhook processing, and simulator controls are now implemented; see the [billing API](../api/billing-api.md). New assignment publication now requires active class coverage; disabling billing endpoints does not bypass that check. Existing published work remains available. Institution subscriptions remain future work.

## Boundaries

- `application/billing/provider.ts` defines checkout terms, a checkout session, the normalized event, and the provider interface.
- `application/billing/purchase-terms.ts` copies terms from a server-loaded active one-time `BillingPlan`. Browser-supplied prices or durations must never be passed as catalog records. Recurring plans are rejected for class checkout.
- `integrations/payments/simulator/create-checkout.ts` produces an opaque checkout reference and a notice explicitly stating no real payment is required. Terms are copied, so later mutation cannot change the returned session.
- `integrations/payments/simulator/wrapper.ts` owns HMAC-SHA256 signing and constant-time signature comparison.
- `integrations/payments/simulator/events.ts` constructs, signs, and validates strict versioned events. Success maps to `paid`; failure to `failed`; refund to `refunded`.
- `config/billing.ts` provides opt-in configuration validation. Bootstrap wires billing routes when enabled auth, migrated PostgreSQL, and the dedicated signing key are configured. Billing is disabled by default.

The checkout application persists the reference and purchased-term snapshot before returning a session, checks ownership, and uses a payer-scoped request ID for retry safety. Catalog seeding is still deferred; create an active one-time plan locally as described in the API guide.

## Signing and retries

Signatures use `t=<unix seconds>,v1=<hex HMAC>` over `<timestamp>.<exact body bytes>`. Verification accepts delivery timestamps within 300 seconds in either direction. The signing key is a dedicated 32-byte secret, configured as 64 hexadecimal characters. Generate it locally with `openssl rand -hex 32`; keep it in ignored environment configuration, never in browser code or committed configuration.

Event bodies include a version, event ID, checkout source reference, positive source sequence, outcome, and occurrence time. Strict validation rejects unsupported versions, extra fields, and malformed values after verifying the signature. A delivery retry reuses the original event body/ID but may receive a fresh delivery signature. Occurrence time and delivery time are deliberately separate.

Signature verification does **not** deduplicate events or authorize state changes by itself. The application now resolves the purchase, validates transitions and event timing, preserves a source-sequence high-water mark under a lock, and atomically writes receipts and state/grant changes. Refunds are terminal even if delivered out of order; older non-refund events cannot restore coverage. Trusted simulator controls must assign sequences; browsers must not choose source sequences or timestamps. A valid repeated delivery is expected at this boundary and must be handled idempotently by persistence.

## Verification

Committed Jest tests cover isolated checkout snapshots, simulation labeling, rejected prices/plans, signed payment outcomes, payload tampering, incorrect keys, malformed signatures, stale/future delivery timestamps, retry identity preservation, invalid event bodies/versions, invalid sequences, and configuration validation. No live payment service or AWS resource is involved.
