# Local isolated demo

The demo uses PostgreSQL and the existing application workflows with synthetic instructor/student identities. It creates no Cognito users, sends no email, and makes no real payment/provider call. Nothing is provisioned until a visitor starts a demo.

## Enable locally

Apply migrations with `npm run db:migrate`. In your ignored root `.env`, enable:

```dotenv
DEMO_ENABLED=true
APP_ORIGIN=http://localhost:5173
DEMO_MAX_WORKSPACES=25
```

Then restart `npm run dev` and open `http://localhost:5173/demo`.

Demo mode does not require normal authentication or billing configuration. For a demo-only local process, set `AUTH_ENABLED=false` and `BILLING_ENABLED=false`; otherwise the configured normal account flows remain available alongside it. `DATABASE_URL` must point to your development PostgreSQL database. Production/non-localhost origins require HTTPS. The frontend and cookie-based API must share an origin (Vite's `/api` proxy handles this locally).

Lifetime settings are described in [Public Demo Direction](../planning/public-demo.md). `DEMO_ENABLED` defaults to false. `DEMO_MAX_WORKSPACES` defaults to 25 and supports 1–100 workspaces. Capacity counts all stored workspaces, including expired ones, to bound storage until cleanup is implemented. An advisory transaction lock serializes the capacity check and provisioning across API processes. HTTP limits are currently per-process/per-IP; distributed rate limiting is not implemented.

## Walkthrough

1. Choose **Explore as instructor**. The funded class has an enrolled student and a published example assignment. The second class has no coverage and can demonstrate simulated checkout under **Billing (simulated)**.
2. Create a class, edit private library drafts, or author additional assignments using the existing pages. All demo resource pages are under `/demo/...` and show a synthetic-data/no-real-charges notice.
3. Use **Switch role, reset, or end demo** to return to the control page. Choose student to see the same workspace's enrolled classes and assigned work. Save/submit the example assignment normally; ordinary authorization and grading rules apply.
4. Reload a demo resource URL to restore the server session. No tokens or demo data are persisted in local/session storage.
5. **Reset demo and discard changes** replaces the synthetic graph and credentials, increments the workspace generation, and clears mounted page state. It preserves the original absolute expiration and the selected role; choose either role again to explore the restored examples.
6. **End demo** clears the demo cookie only. A normal account session in the same browser is unaffected. The workspace remains until expiration/cleanup.

Requests to normal account pages use normal authentication. Demo invitations work only within their workspace; normal students cannot redeem demo invitations, and demo students cannot redeem normal or other-workspace invitations. The API enforces this boundary independently of navigation.

## Implementation and verification

See the [demo API](../api/demo-api.md), [design](../planning/public-demo.md), and [seed/reset behavior](../planning/public-demo.md#seed-and-reset-implementation).

Run `npm run check` and `npm run db:test`. The integration suite exercises real demo HTTP/resource flows without AWS, including role/session isolation, reset, invitation boundaries, concurrent provisioning capacity, and a deferred commit failure that must not send a success response. Focused UI tests cover entry controls, demo request paths, restoration, cancellation, and failed-response reconciliation.

A one-off local Chrome walkthrough also verified instructor creation, student submission, role switching, reload, reset, logout, a 390px class layout, and empty browser storage. Its scripts/screenshots live in ignored `.codex-local/verification/`; this is local evidence, not a browser CI suite. No hosted deployment or live Cognito/payment flow was tested by this slice.

## Remaining work

The bounded backend cleanup operation is implemented and tested; durable job registration, automation wiring, and operator instructions are next. Once the configured workspace cap is reached, starts return a sanitized unavailable response; restarting the API does not remove persistent rows. No cleanup trigger or operator command invokes it yet. The internal batch operation defaults to 10 workspaces, skips locked rows, and rolls back the entire batch on unsafe references or retention failures; see [cleanup semantics](../planning/public-demo.md#expired-workspace-cleanup-operation). Hosting, published links, and production/shared rate limiting remain later deployment decisions.
