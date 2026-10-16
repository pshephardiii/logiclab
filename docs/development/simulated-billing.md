# Simulated billing development

The provider adapter is local code with no external payment SDK, network calls, card data, or real charges. This slice adds no HTTP endpoints, checkout persistence, grants, or publication enforcement. Institution subscriptions remain future work.

## Boundaries

- `application/billing/provider.ts` defines checkout terms, a checkout session, the normalized event, and the provider interface.
- `application/billing/purchase-terms.ts` copies terms from a server-loaded active one-time `BillingPlan`. Browser-supplied prices or durations must never be passed as catalog records. Recurring plans are rejected for class checkout.
- `integrations/payments/simulator/create-checkout.ts` produces an opaque checkout reference and a notice explicitly stating no real payment is required. Terms are copied, so later mutation cannot change the returned session.
- `integrations/payments/simulator/wrapper.ts` owns HMAC-SHA256 signing and constant-time signature comparison.
- `integrations/payments/simulator/events.ts` constructs, signs, and validates strict versioned events. Success maps to `paid`; failure to `failed`; refund to `refunded`.
- `config/billing.ts` provides opt-in configuration validation. Bootstrap wiring and HTTP use are upcoming; setting these variables alone does not expose any routes or activate billing.

The checkout application will persist the reference and purchased-term snapshot before returning a session. It must verify class ownership, choose the plan on the server, and handle uncertain outcomes without automatic duplicate purchases. Catalog seeding/configuration is deferred to that wiring; no active plans are seeded by this slice.

## Signing and retries

Signatures use `t=<unix seconds>,v1=<hex HMAC>` over `<timestamp>.<exact body bytes>`. Verification accepts delivery timestamps within 300 seconds in either direction. The signing key is a dedicated 32-byte secret, configured as 64 hexadecimal characters. Generate it locally with `openssl rand -hex 32`; keep it in ignored environment configuration, never in browser code or committed configuration.

Event bodies include a version, event ID, checkout source reference, positive source sequence, outcome, and occurrence time. Strict validation rejects unsupported versions, extra fields, and malformed values after verifying the signature. A delivery retry reuses the original event body/ID but may receive a fresh delivery signature. Occurrence time and delivery time are deliberately separate.

Signature verification does **not** deduplicate events or authorize state changes by itself. The next slice must resolve the purchase, validate transitions and event timing, enforce monotonic source sequences under a lock, and atomically write the receipt and resulting state/grant changes. Trusted simulator controls must assign sequences; browsers must not choose source sequences or timestamps. A valid repeated delivery is expected at this boundary and must be handled idempotently by persistence.

## Verification

Committed Jest tests cover isolated checkout snapshots, simulation labeling, rejected prices/plans, signed payment outcomes, payload tampering, incorrect keys, malformed signatures, stale/future delivery timestamps, retry identity preservation, invalid event bodies/versions, invalid sequences, and configuration validation. No live payment service or AWS resource is involved.
