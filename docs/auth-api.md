# Authentication API

Enable with backend `AUTH_ENABLED=true` and the settings in `.env.example`, after applying migrations and provisioning the development Cognito pool. When disabled, these endpoints are not registered. Anonymous truth-table practice remains available.

## Endpoints

All POST requests require JSON and an `Origin` header equal to `APP_ORIGIN`. All auth responses use `Cache-Control: no-store`. Input objects reject unknown fields.

| Method/path under `/api/auth` | Body | Result |
| --- | --- | --- |
| `POST /signup` | `email`, `password`, `role` | 202 account-neutral confirmation instructions; role saved during provisioning |
| `POST /confirm` | `email`, `code` | Email confirmation, followed by normal login |
| `POST /resend` | `email` | 202 account-neutral resend instructions |
| `POST /login` | `email`, `password` | Public user ID/role and opaque HttpOnly cookie |
| `GET /session` | None; session cookie | Public user ID/role; automatic token refresh when required |
| `POST /logout` | `{}` or no body | Deletes local session and clears cookie, attempts Cognito revocation |
| `POST /forgot-password` | `email` | 202 account-neutral recovery instructions |
| `POST /reset-password` | `email`, `code`, `password` | Resets Cognito password, deletes that user's local sessions, clears browser cookie |

Emails are trimmed and lowercased. Confirmation codes are six digits. New passwords use 12–128 characters and include upper/lowercase, a digit, and a symbol; login accepts existing passwords without transforming them. Roles are strictly student/instructor on signup and cannot be supplied at login.

Login/session responses are `{ "user": { "id": "...", "role": "student" } }`. Passwords, Cognito subjects, and access/refresh tokens are never returned. Error responses use `{ "error": { "code": "...", "message": "..." } }`; provider details are not exposed. Wrong credentials/unconfirmed accounts return generic 401 responses. Invalid fields/codes return 400, rejected origins 403, throttling 429, and provider/storage outages 503.

## Sessions and recovery

The cookie is host-only, HttpOnly, SameSite=Strict, scoped to `/api`, and Secure except for explicit localhost HTTP development. Same-origin browser requests send it automatically. Cross-origin browser hosting is not supported by this configuration; use the frontend's same-origin API proxy/routing.

Successful password recovery must invalidate local sessions as well as update Cognito. The app stores normalized signup email for this lookup, unique per user pool. Email is optional for pre-existing synthetic users; live signup always records it. Email-changing flows are not implemented and must synchronize this mapping before being added.

If password reset succeeds in Cognito but local session deletion fails, the operation returns 503 and needs operational reconciliation. These systems do not share a transaction. Do not promise that repeating an already-consumed reset code will repair that failure. Signup provisioning has its own explicit compensation/reconciliation behavior in the [Cognito guide](cognito-development.md).

Logout clears the cookie even when provider revocation fails; the response can still be 503 if cleanup did not fully complete. A failed login does not issue a new cookie. A successful login rotates the browser session and attempts to retire the prior session.

## Limits and logging

Auth mutations are limited to 10 requests per route/IP per 15 minutes; session lookup is limited to 60 per IP per minute. Buckets are in process memory, so restarts reset them and multiple API replicas do not share limits. Configure a shared limiter or an appropriate AWS perimeter before scaling/public abuse exposure. The API does not trust arbitrary forwarded IP headers; proxy deployment requires an explicit trusted-proxy decision.

Recovery/resend responses omit existence/delivery details and mask account-specific provider errors. This is not a constant-time enumeration guarantee. Cognito is configured with user-existence-error prevention. AWS delivery quotas still apply.

Auth handlers log only sanitized operational categories, not SDK messages/stacks, request bodies, emails, passwords, or tokens. Request/cookie headers and bodies are redacted in the configured API logger. Backend startup loads the root `.env` for local npm dev/start commands, fails on invalid enabled configuration, and closes ORM/SDK resources at shutdown.

## Validation and current scope

Handler and injected-route tests cover registration, strict validation, role preservation, origin enforcement, cookies, recovery masking, errors, and rate limiting. A compiled HTTP flow has been exercised against PostgreSQL with mocked Cognito; the developer has additionally reported successful live signup/confirmation, login/logout, and recovery/reset checks. Live resend and token refresh remain to be checked.

Account screens are implemented under `apps/web/src/features/auth`, with an API client, account-state hook, panel, and form component. Classroom authorization, enrollment, and production deployment are later slices. See [Cognito setup](cognito-development.md) before live verification. Shared schemas are exported from `@logiclab/contracts`; each auth endpoint follows the route/handler/handler-test/route-test directory convention.
