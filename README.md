# LogicLab

Browse the [documentation index](docs/README.md) for planning, setup, API reference, conventions, and verification.

An interactive formal-logic learning project, built as a public full-stack portfolio. The browser creates truth-table exercises through the API, lets students fill blank/T/F answer cells, checks answers, and shows solutions alongside their entries. See the [implementation plan](docs/planning/initial-implementation-plan.md) and [truth-table API](docs/api/truth-table-api.md).

The agreed product behavior and remaining design questions are recorded in [Product Direction](docs/planning/product-direction.md).

[Codebase conventions](docs/conventions/codebase-conventions.md) records the agreed tools package boundaries, contract/entity style, module organization, and verification practices.

The storage model and reusable problem library are outlined in [Data Design](docs/planning/data-design.md). Product Direction describes behavior, Data Design describes persistence, and the Implementation Plan describes delivery order.

See the [truth-table walkthrough, screenshots, and verification evidence](docs/verification/truth-table-verification.md) for the completed first feature, and the [classroom-access walkthrough and final verification](docs/verification/classroom-access-verification.md) for accounts, classes, and enrollment.

## Local setup

Use Node.js 24.9 or newer (see `.nvmrc`) and npm 10 or newer. If you use nvm, run `nvm install` and `nvm use` from the repository root.

```sh
npm ci
npm run dev
```

Open http://localhost:5173 and select **Create table** to load the example formula, or enter your own. Variable columns are given; intermediate and final expression columns have keyboard-accessible blank/T/F selectors. Editing the formula clears the table and answers; work is not saved across reloads. Syntax errors identify the offending character. The backend listens on port 3000; Vite proxies `/api` requests to it. The root development command builds the schema and logic engine before starting all five workspace watchers.

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
  logic-engine/   Pure parser, evaluator, and truth-table generator
  db/             PostgreSQL schema, client, and migrations
docs/
```

An admin app can be added as `apps/admin` with package name `@logiclab/admin`, its own Vite configuration and development port, and a dependency on `@logiclab/contracts`. It can deploy independently and use the same API. Root development/build scripts currently target the existing apps explicitly; add admin to those scripts when it is introduced. Server-side permissions will govern access to admin operations.

| Directory            | Package                  | Purpose                                                              |
| -------------------- | ------------------------ | -------------------------------------------------------------------- |
| `apps/web`           | `@logiclab/web`          | React + TypeScript, served and built with Vite                       |
| `services/api`       | `@logiclab/api`          | Node.js + TypeScript API using Fastify; Jest tests                   |
| `tools/contracts`    | `@logiclab/contracts`    | Shared Zod request/response schemas and inferred types               |
| `tools/logic-engine` | `@logiclab/logic-engine` | Pure TypeScript parser, evaluator, and truth tables, with Jest tests |
| `tools/db`           | `@logiclab/db`           | MikroORM/PostgreSQL client, users schema, and SQL migrations         |

The contracts package contains API contracts, not database migrations. Each domain file groups reusable shapes, request contracts, and response contracts, with inferred TypeScript types beside public schemas. `index.ts` only re-exports domain modules. Named type exports are conveniences; parsed values are already inferred from their Zod schemas. It builds JavaScript and type declarations consumed by both apps. Changes are recompiled during root development; API routes can later add domain-specific schemas here.

Formula parsing lives in `tools/logic-engine/src/parser/`: `parser.ts` checks length and coordinates tokenization/parsing, `tokenizer.ts` recognizes symbols and aliases, and `parse-tokens.ts` builds the expression tree by precedence. Types, errors, and limits have their own files. The parser index exposes the existing public API; tokenizer and token-parsing functions remain internal.

`evaluator.ts` keeps expression dispatch and recursive evaluation together, with private helpers for validating variable values and applying binary operators. Both operands are evaluated before applying an operator, so short-circuiting cannot hide missing inputs.

Truth-table generation lives in `tools/logic-engine/src/truth-table/`: `truth-table.ts` orchestrates parsing and generation, `types.ts` declares the output shapes, and `helpers/` groups expression traversal/labels, column construction, and row evaluation. Helpers are implementation details; the root package exports retain the generator and its public types.

Frontend features own their UI and behavior under `apps/web/src/features/`. The truth-table feature composes `FormulaForm`, `ExercisePanel`, and `TruthTable`; `useTruthTablePractice` manages requests, answers, errors, and resets. Its API client and answer types live alongside the feature. `App.tsx` composes practice and account navigation. The auth feature owns its account form/panel, API client, and session-state hook; shared UI components can be introduced when other features reuse them.

## Commands

For persistence setup, see [local PostgreSQL and DBeaver](docs/development/local-database.md). After installing Docker/Compose and copying `.env.example` to `.env`, `npm run db:up` starts PostgreSQL and `npm run db:migrate` applies committed migrations. Existing truth-table practice does not require the database yet. `npm run db:test` uses a separately configured disposable test database; CI runs it with its own PostgreSQL service.

```sh
npm run typecheck
npm test
npm run build
npm run check
```

`check` runs type checking, engine/backend Jest tests, and production builds. Backend tests cover handlers directly and routes through Fastify injection without opening a network port. Browser smoke checks have been run locally; a frontend test suite and CI browser job remain follow-up work. Vite is the frontend development/build tool.

Jest uses Node's experimental VM modules flag for an ESM dependency in Fastify's request-injection tooling. An experimental warning during tests is expected. The initial dependency audit reports 20 moderate findings in the Jest development dependency chain, originating in `sprintf-js`. No automatic downgrade was applied; revisit upstream fixes as dependencies evolve.

After a root build, `npm start -w @logiclab/api` starts the compiled API and `npm run preview -w @logiclab/web` previews the static frontend build locally. Individual workspace commands assume the shared contracts package has already been built. `PORT` and `HOST` configure the API through environment variables. Example files document options; API dev/start loads the ignored root `.env`.

## Deployment direction

The [Cognito development foundation](docs/development/cognito-development.md) includes a reviewable CloudFormation template and backend auth/session services. Auth endpoints register when backend auth is enabled; the web app includes account screens and restores sessions through the API. Existing anonymous practice continues to work without AWS. The guide records the provisioning steps for live verification. See the [authentication API](docs/api/auth-api.md) for contracts, cookies, recovery, and limits.

Both applications will target AWS. The frontend produces static files in `apps/web/dist`; the backend produces runnable Node.js code in `services/api/dist` and uses environment-based configuration. Keep shared workspace dependencies available when packaging the backend.

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
