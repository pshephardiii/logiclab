# Simulated billing verification

Verification date: October 16, 2026. Branch: `007-feat-simulated-billing-and-entitlements`.

## Automated checks

- `npm run check`: passed workspace type checks, 484 tests (71 engine, 359 API, 54 frontend), and production builds.
- `npm run db:test`: passed 70 PostgreSQL integration checks (63 database, seven API workflows).
- `npm run format:check` and `git diff --check`: passed.
- After adding visible selected-plan price/duration below the mobile dropdown, frontend tests and production build were repeated successfully.

Database coverage includes additive migration/schema consistency, historical purchase backfill, enum/term constraints, provider-scoped uniqueness, purchase-term preservation after plan edits, retained financial records, and repeatable demo seeding that preserves retired/edited plans. Test migrations do not rewrite application snapshots.

API workflows cover owned checkout, concurrent request-ID reuse, catalog/history pagination, response privacy, signature and payload validation, duplicate/hash conflicts, stale events, terminal refunds, and rollback followed by retry with the same event. Refund delivery behind a higher-sequence success cannot restore coverage. Publication tests cover missing/future/expired/revoked grants, exact start/end boundaries, independent overlapping grants, class isolation, and both orderings of publication versus refund under class locks. Student work remains readable, saveable, submittable, and solution-accessible under its existing policy after funding loss; instructor review is retained.

Frontend coverage includes role-aware navigation, plan/history pagination, selected plan preservation, explicit simulated checkout/success/refund, checkout retry using the same intent, uncertain outcome reload requirements, and cancellation on unmount. Backend route and handler tests cover read/mutation delegation, authorization/origin policies, bounded queries, raw-body parsing, no-store responses, and oversized webhook rejection. Bootstrap tests cover disabled configuration, dedicated-key requirements, shared dependencies, and cleanup after failure.

## Local Chrome walkthrough

An ignored Playwright script runs installed Chrome against Vite, real Fastify routes, MikroORM, and a disposable PostgreSQL schema. Authentication uses synthetic identities and an HttpOnly cookie; Cognito and external payment services are not contacted. The schema is dropped after verification.

The walkthrough passed:

- Reject new publication before funding; seed and select the local class plan.
- Commit a checkout but deliberately lose its response; retry from the browser and verify one persisted purchase.
- Simulate failure, deliberately create another purchase, simulate success, and publish an assignment.
- Submit student work, refund coverage, and verify the final submission and existing publication remain available while new publication is rejected.
- Reload purchase history, recover from a failed status read, and create another independent successful purchase.
- Expire its grant in isolated test data, reload, and display inactive coverage.
- Reject foreign-instructor class reads and deny student billing navigation/access.
- Check desktop (1280px) and mobile (390px) document overflow, empty browser storage, and absence of uncaught browser exceptions.

Screenshots and the script remain local evidence under `.codex-local/verification/`. Visual inspection found truncated plan terms in the mobile select, so the selected price/duration now also appear below the select; the browser walkthrough and screenshots were refreshed. An initial harness assertion was corrected to wait for the lost-response error before inspecting the committed purchase. Browser checks are local evidence, not CI browser regression tests.

## Limits and rollout

This is a no-charge simulator. No payment details, real transactions, AWS resources, or emails were created. Live Cognito, remote CI, hosted deployment, other browsers, and screen readers were not verified in this pass. A clean dependency installation was not repeated. Existing Vite chunk-size, Jest experimental VM-modules, and Vitest native-config advisories remain.

Apply migrations with `npm run db:migrate`, then explicitly seed the local catalog using `npm run billing:seed`. Configure enabled auth, `BILLING_ENABLED=true`, and a dedicated 64-hex-character simulator signing secret in ignored `.env`, then restart the API. The seed preserves existing plan edits/retirement. See the [billing API and setup](../api/billing-api.md).

New publication requires valid class coverage even when billing endpoints are disabled. Existing classes receive no silent grant. Existing published assignments, archive/restore, and student work remain available under normal authorization. Coverage is checked on the server at publication; UI status is a refreshed snapshot. Offset pages can shift under concurrent changes.

Checkout request IDs are retained during retries while the billing page is mounted. They are not persisted across navigation/reload: inspect history before starting another checkout. Canceling a browser request cannot cancel committed server processing. After uncertain simulator outcomes, reload before another outcome. The adapter is local; a real external checkout needs provider idempotency and reconciliation design beyond this transaction pattern. Rate limits remain per process.

Institution, membership, and subscription entities/workflows, real payments, automatic renewal, plan management UI, scheduled jobs, and reconciliation remain later work. Recurring catalog terms are represented, but only active one-time plans can be purchased through current class checkout.
