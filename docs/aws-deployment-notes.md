# AWS deployment planning

Requirement: deploy both frontend and backend on AWS at the lowest viable cost for a low-traffic portfolio demo.

This is a deployment constraint, not a selected architecture or a verified price estimate. Check current AWS pricing and allowances before provisioning resources.

## Outputs and runtime requirements

- Frontend: `apps/web/dist`, static assets built by Vite. Configure SPA fallback once client-side routes exist.
- Backend: `services/api/dist/server.js`, Node.js 24, production dependencies, and the built `@logiclab/schema` workspace package. An artifact must include that package rather than a dangling workspace symlink.
- Health endpoint: `GET /api/health`.
- Runtime settings: `PORT` and `HOST`. The API handles SIGINT/SIGTERM for graceful shutdown.
- Browser routing: use same-origin `/api` routing, or choose an explicit API origin and add scoped CORS. `VITE_API_URL` is fixed at build time.
- Database and durable scheduling: not implemented in the scaffold; include their costs before choosing a hosting model.

## Selected authentication and email direction

See [Cognito development setup](cognito-development.md) for the prepared CloudFormation template, backend session foundation, and provisioning walkthrough. Resources remain unprovisioned by this work.

Use Amazon Cognito user pools for email/password signup, email confirmation/resend, login, and password recovery. Application roles, class ownership, and enrollments remain in PostgreSQL. MFA and institutional SSO are deferred. No Cognito resources have been provisioned as part of this documentation update.

As checked October 12, 2026, Cognito Lite and Essentials include a 10,000 monthly active user allowance for direct/social sign-in, subject to AWS account/organization terms. This is an authentication allowance, not a free allowance for every related AWS service. Email delivery and optional features have separate cost considerations. Recheck [Cognito pricing](https://aws.amazon.com/cognito/pricing/) before provisioning.

Initially use `COGNITO_DEFAULT` for development and a small controlled demo:

- AWS lists a non-adjustable limit of **50 emails daily per AWS account** for the default email feature, shared across users and pools. Confirmation, resends, and recovery consume the allowance; it does not represent 50 guaranteed signups. See [Cognito quotas](https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html).
- Without a custom source identity, the sender is `no-reply@verificationemail.com`. See [Cognito email settings](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html).
- Verify confirmation and recovery against a development pool; preconfirmed synthetic accounts can reduce repetitive development sends.
- Configure Cognito to use our SES sending configuration before broader public registration. Plan sender verification, applicable region rules, SES sandbox/production access, quotas, and sending costs. Changing delivery configuration keeps Cognito as the identity provider.

Include confirmation/resend and forgot/reset-password screens in `003-feat-classroom-access`. Recovery responses should avoid disclosing account existence. Decide app-client configuration, token/session handling, environment separation, and application-user provisioning before coding these flows.

## Remaining hosting decisions

1. What demo traffic, response time, and downtime are acceptable?
2. Can the API use request-driven/serverless execution, or does it need a persistent process? A serverless choice needs an adapter and deployment entry point.
3. How will PostgreSQL, background jobs, and demo resets run affordably?
4. What is the monthly budget, including logs, storage, requests, data transfer, and any network infrastructure?
5. Which region, domain, TLS, secret management, and CI deployment permissions are appropriate?

Compare complete monthly costs and operational work for the selected candidates, record the decision, and prepare a reviewable deployment configuration before provisioning. Keep this first scaffold portable until that decision is made.
