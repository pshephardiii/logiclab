# Cognito development foundation

## Current implementation

`infra/cognito/development.json` prepares a development email/password user pool and secret-bearing API app client in `us-east-1`. `services/api/src/auth/` contains validated configuration, a Cognito SDK adapter, signup provisioning, persistent sessions, cookie/origin helpers, and a factory that initializes these dependencies.

The API now registers signup, confirmation/resend, login/session/logout, and password recovery/reset routes when `AUTH_ENABLED=true`. Input validation, origin checks, rate limiting, and sanitized error responses/logging are included. Account screens are still pending. Anonymous practice continues to work with auth disabled. AWS has not been provisioned or contacted in the mocked tests. See [Auth API](auth-api.md).

## Identity and signup

The API app client has a secret that stays on the backend. Cognito signup returns the new subject; the service immediately saves that subject and selected student/instructor role in PostgreSQL before the signup journey is reported successful. Confirmation and later login do not overwrite the stored role. Login requires Cognito-confirmed email and an existing app user; it never provisions a role from login input.

If local provisioning fails after Cognito creates an identity, attempt to delete only that newly created identity. Successful cleanup permits signup retry. Failed cleanup returns an explicit reconciliation-required error; do not silently adopt an orphan with a new role. Before making signup public, document operator recovery for failed cleanup and restrict backend `cognito-idp:AdminDeleteUser` permission to the development pool. Normal signup/login calls use the app client rather than that admin permission.

## Sessions

- Browser cookie: opaque random session ID, HttpOnly, SameSite=Strict, host-only, `/api` path, and Secure outside localhost development. No access/refresh token is returned to the browser.
- Database: SHA-256 session ID hash, user relation, encrypted tokens, access expiry, and absolute session expiry. AES-256-GCM ciphertext is bound to the session hash.
- Initial duration: seven days, with 15-minute Cognito access tokens. Refresh does not extend absolute session lifetime. Remember-me and configurable durations are deferred.
- Use a stable, private 32-byte `AUTH_TOKEN_KEY` across API restarts. Losing/rotating it invalidates token decryption; plan controlled session invalidation when rotating.
- Refresh rechecks Cognito identity/email verification and loads the stored user. Update-only persistence avoids recreating a session deleted by concurrent logout.
- Logout deletes local state before attempting provider revocation. The future logout handler must clear the cookie even when AWS revocation fails.
- Expired records are rejected/deleted when used; periodic cleanup is later work. Non-rotating refresh tokens are selected for this initial foundation; rotation can be added with concurrency handling later.

The auth route plugin registers cookie parsing, validates all mutation origins, and applies strict schemas and per-IP rate limits. The server installs request/cookie/body redaction; auth errors exclude raw SDK details. In-memory limits and real AWS behavior still require deployment verification.

## Local configuration

The root `.env.example` lists required backend-only values. Do not overwrite your existing `.env` or place secrets in `VITE_*` variables.

Generate the token encryption key in your own terminal:

```sh
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Save it as `AUTH_TOKEN_KEY` in ignored `.env`; do not paste it into chat or commit it. App-client ID/pool ID come from the stack outputs; the client secret comes from Cognito's app-client settings. `createAuthFoundation` validates opt-in configuration and initializes PostgreSQL during enabled API startup. Root `.env` is loaded by local API dev/start commands. The server closes PostgreSQL and the Cognito client during shutdown.

## AWS setup when live verification is needed

The foundation can be reviewed without AWS. Auth routes are ready for mocked tests. Complete these steps together before live signup/confirmation/recovery verification:

1. Create/sign into your AWS account, enable root-account MFA, and configure a billing budget alert. Use an appropriately authorized development identity/profile rather than root access keys.
2. Install AWS CLI v2 and configure a profile named `logiclab-dev`, preferably with temporary credentials through your account's SSO setup. Verify it with `aws sts get-caller-identity --profile logiclab-dev`; don't send credentials in chat.
3. Review the template and validate it:

   ```sh
   aws cloudformation validate-template --template-body file://infra/cognito/development.json --region us-east-1 --profile logiclab-dev
   ```

4. When ready to create the reviewed resources, deploy:

   ```sh
   aws cloudformation deploy --template-file infra/cognito/development.json --stack-name logiclab-development-auth --region us-east-1 --profile logiclab-dev
   ```

5. In CloudFormation, read the pool/client IDs from Outputs. In Cognito, open that app client and obtain its secret. Store all backend settings in ignored `.env`. Configure the backend development identity's narrowly scoped cleanup permission.
6. Apply local migrations with `npm run db:migrate`, then set `AUTH_ENABLED=true` and start the API. Verify signup, role persistence, confirmation/resend, login, refresh, logout, and recovery against real email addresses you control.

The template uses Cognito's default email sender, which has a non-adjustable 50-email daily allowance per AWS account. Plan SES before broader public registration. The pool is retained when its CloudFormation stack is deleted; remove it separately only when you intend to delete its identities. MFA and institution SSO are out of this branch.

No deployment command above has been run by the assistant. AWS-side template validation and real Cognito behavior are pending. See [AWS deployment notes](aws-deployment-notes.md) for costs/email constraints and [Cognito signup/secret-hash guidance](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html) for the email-only pool refresh hash rules.

## Verification

Auth tests use a mocked identity provider/SDK and real cookie serialization. Database integration tests apply the session migration and verify persistence and cascade behavior. CloudFormation JSON is parsed locally, but live CloudFormation validation requires an AWS profile. Mocked tests do not verify email delivery or IAM permissions.

Verified locally: 127 engine/API Jest tests, workspace type checks and builds, four PostgreSQL integration tests, and a one-off compiled API-store/service check against PostgreSQL for signup role persistence, login, refresh, and logout with mocked Cognito. Applied the session migration to the local development database and updated its tracked snapshot. MikroORM's `migration:check` reports no remaining schema changes.

HTTP slice verification: handler/route/security tests cover confirmation and recovery SDK wiring, cookie lifecycle, strict fields, origins, rate limits, account-neutral recovery errors, and password-reset session invalidation. A compiled Fastify flow passed against PostgreSQL with mocked Cognito. The new email migration is applied locally; account screens and live AWS tests remain pending.

Current HTTP slice checks: `npm run check` passed 172 engine/API Jest tests, type checks, and builds. Five live database tests passed. MikroORM reports the schema is up to date. A compiled Fastify flow against PostgreSQL with mocked Cognito verified signup through recovery/reset and local session invalidation.
