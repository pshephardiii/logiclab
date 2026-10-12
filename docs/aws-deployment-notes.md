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

## Decisions before deployment

1. What demo traffic, response time, and downtime are acceptable?
2. Can the API use request-driven/serverless execution, or does it need a persistent process? A serverless choice needs an adapter and deployment entry point.
3. How will PostgreSQL, background jobs, and demo resets run affordably?
4. What is the monthly budget, including logs, storage, requests, data transfer, and any network infrastructure?
5. Which region, domain, TLS, secret management, and CI deployment permissions are appropriate?

Compare complete monthly costs and operational work for the selected candidates, record the decision, and prepare a reviewable deployment configuration before provisioning. Keep this first scaffold portable until that decision is made.
