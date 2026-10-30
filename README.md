# LogicLab

Browse the [documentation index](docs/README.md) for planning, setup, API reference, conventions, and verification.

LogicLab is a full-stack formal-logic learning project. Instructors build reusable problems, publish class assignments, and review submissions; students save and submit truth-table work. It also includes anonymous practice, simulated class payments, and durable operator jobs.

**Start with the [reviewer walkthrough](docs/development/demo-walkthrough.md)** to explore both roles using an isolated, resettable demo without signup or real charges. See the [architecture overview](docs/architecture/overview.md) for package boundaries, data flow, and engineering tradeoffs. The demo runs locally; application hosting is not yet deployed.

The agreed product behavior and remaining design questions are recorded in [Product Direction](docs/planning/product-direction.md).

[Codebase conventions](docs/conventions/codebase-conventions.md) records the agreed tools package boundaries, contract/entity style, module organization, and verification practices.

The storage model and reusable problem library are outlined in [Data Design](docs/planning/data-design.md). Product Direction describes behavior, Data Design describes persistence, and the Implementation Plan describes delivery order.

See the [truth-table walkthrough, screenshots, and verification evidence](docs/verification/truth-table-verification.md) for the completed first feature, and the [classroom-access walkthrough and final verification](docs/verification/classroom-access-verification.md) for accounts, classes, and enrollment.

## Local setup

Use Node.js 24.9 or newer (see `.nvmrc`) and npm 11.19.0 or newer. If you use nvm, run `nvm install` and `nvm use` from the repository root.

```sh
npm ci
npm run dev
```

Dependency install scripts use an explicit reviewed policy with strict enforcement; see [dependency installation](docs/development/dependency-installation.md) before approving a new script.

Open http://localhost:5173 and select **Create table** to load the example formula, or enter your own. Variable columns are given; intermediate and final expression columns have keyboard-accessible blank/T/F selectors. Editing the formula clears the table and answers; work is not saved across reloads. Syntax errors identify the offending character. The backend listens on port 3000; Vite proxies `/api` requests to it. The root development command builds contracts, the logic engine, and the database package before starting all five workspace watchers.

To use accounts, configure the backend following [Cognito development setup](docs/development/cognito-development.md), then select **Sign in / Create account**. Signup includes a student/instructor role, email confirmation, and password recovery. Sessions use HttpOnly cookies; Cognito tokens remain on the backend. Account navigation preserves current practice work. Instructors can use **Classes** to create and list their own persistent classes; see [classroom API and local walkthrough](docs/api/classroom-api.md). Instructors can also generate or replace a seven-day invitation code; students can redeem it on **My classes** to join and view their enrolled classes.

## Packages

In practice, **Check answers** labels each answer correct, incorrect, or unanswered and summarizes the results. Editing an answer clears previous check feedback; **Show solution** displays expected values without replacing entries, and **Hide solution** removes them. Editing the formula or creating a new table clears answers, feedback, and solutions. Failed checking/solution requests preserve work and can be retried. This is independent practice, not an assignment or official grade.

Browser applications live under `apps/`; backend services live under `services/`. Each has its own dependencies and build output. Shared contracts live under `tools/contracts`. The workspace patterns `apps/*`, `services/*`, and `tools/*` automatically include new packages.

```text
apps/
  web/            Student and instructor React app
  admin/          Future admin app (not created yet)
services/
  api/            Node.js API
  worker/         Future background worker (not created yet)
tools/
  contracts/      Shared API contracts
  logic-engine/   Pure parser, evaluator, truth tables and proof checker
  db/             PostgreSQL schema, client, and migrations
docs/
```

An admin app can be added as `apps/admin` with package name `@logiclab/admin`, its own Vite configuration and development port, and a dependency on `@logiclab/contracts`. It can deploy independently and use the same API. Root development/build scripts currently target the existing apps explicitly; add admin to those scripts when it is introduced. Server-side permissions will govern access to admin operations.

| Directory            | Package                  | Purpose                                                                 |
| -------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `apps/web`           | `@logiclab/web`          | React + TypeScript, served and built with Vite                          |
| `services/api`       | `@logiclab/api`          | Node.js + TypeScript API using Fastify; Jest tests                      |
| `tools/contracts`    | `@logiclab/contracts`    | Shared Zod request/response schemas and inferred types                  |
| `tools/logic-engine` | `@logiclab/logic-engine` | Pure parser, evaluator, truth tables and proof checker, with Jest tests |
| `tools/db`           | `@logiclab/db`           | MikroORM/PostgreSQL entities, client, and SQL migrations                |

The contracts package contains API contracts, not database migrations. Each domain file groups reusable shapes, request contracts, and response contracts, with inferred TypeScript types beside public schemas. `index.ts` only re-exports domain modules. Named type exports are conveniences; parsed values are already inferred from their Zod schemas. It builds JavaScript and type declarations consumed by both apps. Changes are recompiled during root development; API routes can later add domain-specific schemas here.

Formula parsing lives in `tools/logic-engine/src/parser/`: `parser.ts` checks length and coordinates tokenization/parsing, `tokenizer.ts` recognizes symbols and aliases, and `parse-tokens.ts` builds the expression tree by precedence. Types, errors, and limits have their own files. The parser index exposes the existing public API; tokenizer and token-parsing functions remain internal.

`evaluator.ts` keeps expression dispatch and recursive evaluation together, with private helpers for validating variable values and applying binary operators. Both operands are evaluated before applying an operator, so short-circuiting cannot hide missing inputs.

Truth-table generation lives in `tools/logic-engine/src/truth-table/`: `truth-table.ts` orchestrates parsing and generation, `types.ts` declares the output shapes, and `helpers/` groups expression traversal/labels, column construction, and row evaluation. Helpers are implementation details; the root package exports retain the generator and its public types.

Frontend pages own their screen-specific components, hooks, and styles under `apps/web/src/pages/`. Reusable domain UI/state stays in `features/`; shared HTTP clients live in `api/`. `App.tsx` composes providers and routing. Route definitions centralize navigation labels and role requirements; shared layout components supply the page skeleton. See [codebase conventions](docs/conventions/codebase-conventions.md) for ownership rules.

## Commands

For persistence setup, see [local PostgreSQL and DBeaver](docs/development/local-database.md). After installing Docker/Compose and copying `.env.example` to `.env`, `npm run db:up` starts PostgreSQL and `npm run db:migrate` applies committed migrations. Existing truth-table practice does not require the database yet. `npm run db:test` uses a separately configured disposable test database; CI runs it with its own PostgreSQL service.

```sh
npm run typecheck
npm test
npm run build
npm run check
```

`check` runs type checking, engine/backend Jest tests, frontend Vitest tests, and production builds. Backend tests cover handlers directly and routes through Fastify injection without opening a network port. `npm run db:test` separately verifies migrations and PostgreSQL workflows/concurrency. Browser smoke checks have been run locally; a browser CI suite remains follow-up work. Vite is the frontend development/build tool.

Jest uses Node's experimental VM modules flag for an ESM dependency in Fastify's request-injection tooling. An experimental warning during tests is expected. Dependency audit results vary with the installed lockfile and advisory database; run `npm audit` when assessing current findings.

After a root build, `npm start -w @logiclab/api` starts the compiled API and `npm run preview -w @logiclab/web` previews the static frontend build locally. Individual workspace commands assume the shared contracts package has already been built. `PORT` and `HOST` configure the API through environment variables. Example files document options; API dev/start loads the ignored root `.env`.

## Deployment direction

The [Cognito development foundation](docs/development/cognito-development.md) includes a reviewable CloudFormation template and backend auth/session services. Auth endpoints register when backend auth is enabled; the web app includes account screens and restores sessions through the API. Existing anonymous practice continues to work without AWS. The guide records the provisioning steps for live verification. See the [authentication API](docs/api/auth-api.md) for contracts, cookies, recovery, and limits.

The initial public demo will use a low-cost hosting design still to be selected; AWS remains a possible later production destination. The frontend produces static files in `apps/web/dist`; the backend produces runnable Node.js code in `services/api/dist` and uses environment-based configuration. Keep shared workspace dependencies available when packaging the backend.

The production browser uses same-origin `/api` by default. Configure routing for that path to the backend. `VITE_API_URL` optionally sets an API origin at frontend build time; using a different origin will also require explicit backend CORS configuration. Never put secrets in `VITE_*` variables, which are visible in the browser.

The lowest-cost viable AWS topology is still undecided. Compare static hosting, backend execution, database, traffic, logs, and scheduled work costs when those requirements are known. A development Cognito pool has been provisioned; application hosting and the production database are still pending. See [deployment planning](docs/planning/aws-deployment-notes.md).

The public repository is [pshephardiii/logiclab](https://github.com/pshephardiii/logiclab). A complete demo release still needs a license choice and the features described in the implementation plan.

See [branch naming conventions](docs/conventions/branch-naming-conventions.md) for numbered work branches and [GitHub setup](docs/development/github-setup.md) for the initial publication steps.

## Frontend routing

React Router's declarative `BrowserRouter` supplies URL/history navigation. `App.tsx` composes account/practice providers and `routing/AppRoutes`, which renders page components under `pages/`. Each page uses `components/layout/Page` for its header/navigation, main content, and footer. `Navigation` lives alongside those layout components. Shared route definitions provide paths, link labels, and role rules. Routes are `/` (practice), `/account`, `/classes` (instructor access), and `/enrollments` (student access); unmatched URLs show a not-found page. `ProtectedRoute` waits for account checks, redirects anonymous users to `/account`, and shows an access message when the role is not allowed. API authorization remains authoritative. Signup/confirmation/recovery remain internal account steps for now.

Practice state lives in its feature provider above the routes, preserving answers and feedback across navigation without keeping every page mounted. Reload clears practice work. Account/session state also survives route transitions. Production static hosting must serve `index.html` for non-file frontend paths such as `/account`, `/classes`, and `/enrollments`, while keeping `/api` routed to the backend; Vite provides this fallback locally.

Routing verification: a local Chrome smoke check with mocked auth/class responses and a generated truth-table exercise passed URL navigation, browser back/forward, preserved formula/answer state, delayed session restoration on direct class URLs, student denial, anonymous redirection, and unknown-route recovery. These are local checks; a CI browser regression suite remains follow-up work.

## Backend route composition

Each endpoint declares a route-schema object with documentation metadata, applicable body/query/parameter contracts, and responses keyed by status. Shared Zod definitions and inferred data types live in `tools/contracts`; Fastify-specific composition stays under `services/api/src/routes`. Group plugins use shared `routes/setup.ts` helpers for Zod validation/serialization and, where previously present, rate-limit defaults. Auth/classroom reads retain 60 requests/minute and mutations 10/15 minutes, with per-route overrides supported. Public practice and health retain their unthrottled behavior. Health registration now lives in its own route module; App composes the groups. Handler parsing remains as a defensive boundary for direct invocation. No OpenAPI UI is added.

Application resource construction lives in `services/api/src/bootstrap/dependencies.ts`. It opens one shared database connection pool, constructs the Cognito client and auth/classroom dependencies, and owns their cleanup. `server.ts` connects that lifecycle to startup/shutdown; `buildApp` registers route groups from separate `auth` and `classroom` options without allocating external resources. Auth no longer constructs classroom persistence. Auth-disabled practice remains independent of PostgreSQL/Cognito. Application behavior is grouped under `application/`, external-service adapters under `integrations/`, database stores under `persistence/`, environment validation under `config/`, and HTTP handling under `routes/`. Tests stay beside their modules.

### Regression tests

`npm run check` runs workspace type checks, engine/API Jest tests, frontend Vitest tests, and production builds. Frontend tests use jsdom and React Testing Library; run them alone with `npm run test -w @logiclab/web` or interactively with `npm run test:watch -w @logiclab/web`.

With local PostgreSQL running and `TEST_DATABASE_URL` set, `npm run db:test` runs migration/entity checks and the API enrollment integration suite, including duplicate joins, scoped access, and invitation replacement locking. The API suite uses synthetic sessions and makes no Cognito requests. These tests run in the existing CI jobs; they complement real-browser and live-provider checks.

### Problem-library foundation

The current feature branch introduces instructor-owned mutable problem drafts and immutable publication snapshots in PostgreSQL. Archive/restore preserves version history. Private-library draft, publishing, version-history, and archive/restore API routes are implemented; the instructor-only `/library` page supports creating/editing drafts, publishing, history, previews, and archive/restore. See [final local verification](docs/verification/problem-library-verification.md) for workflow evidence and limitations. See [the library API](docs/api/problem-library-api.md). Apply new migrations with `npm run db:migrate` on an existing checkout. See [the implementation plan](docs/planning/initial-implementation-plan.md) for scope.

### Assignment foundation

The assignment branch adds class-owned assignment records and ordered items pinned to immutable problem versions. Assessment, feedback timing, and solution access are independent settings; only graded work with feedback on submission is supported initially, and solution access defaults off. Run `npm run db:migrate` to apply the new tables locally. Instructor authoring/publication and archive/restore routes are implemented; see the [assignment API](docs/api/assignment-api.md). Instructor authoring pages are available at `/assignments`, with class selection, ordered publication selection, draft editing, publish/archive/restore, and read-only saved publications. Enrollment-scoped saved attempts, final submission, and feedback/solution enforcement are implemented in the [student-work API](docs/api/student-work-api.md); students complete assigned work at `/work`, and instructors review final submissions under `/assignments`; see the [implementation plan](docs/planning/initial-implementation-plan.md).

New assignment publication requires valid class coverage, even when billing routes are disabled. Existing published work remains available after coverage expires or is refunded. See [simulated billing](docs/api/billing-api.md) for opt-in checkout configuration and setup and the instructor `/billing` page. Run `npm run billing:seed` after migration to add the local no-charge demo plan; no coverage is granted until a simulated success is processed.

Operator-only report-only billing reconciliation and expired demo-workspace cleanup are available through `npm run jobs -- help` from the repository root. Commands cover disabled schedule setup, manual enqueue, scheduler/worker cycles, and paginated report/history inspection. Nothing runs automatically on API startup. See [operator jobs CLI](docs/development/operator-jobs.md).

### Assignment learning modes

Instructors can publish graded, completion-only or private-practice assignments with independent solution-release rules. Students explicitly check practice/completion answers, save work and finalize completion-only work without an official correctness score. Demo template 2 includes both the graded example and private practice; reset an existing workspace to load the new examples. See [learning-mode verification and rollout](docs/verification/assignment-learning-modes-verification.md).

### Duplicate assignments

Instructors can use **Duplicate as draft** on a saved draft, publication or archived assignment to create an editable copy in the same class. Ordered pinned problems and learning policies are preserved; student work, publication/archive status and billing are not copied. Unsaved source edits require confirmation. See [duplication behavior and recovery](docs/planning/duplicate-assignment.md) and [automated verification](docs/verification/duplicate-assignment-verification.md). Manual browser QA remains pending.

The standalone propositional proof-checker foundation is available through `@logiclab/logic-engine/proof`. It validates bounded Fitch proofs with configurable rule permissions and versioned diagnostic reports. Instructor/student derivation exercises and grading remain planned integrations. See [proof-checker design](docs/planning/propositional-proof-checker.md) and [verification](docs/verification/propositional-proof-checker-verification.md).
