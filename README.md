# LogicLab

An interactive formal-logic learning project, built as a public full-stack portfolio. The browser creates truth-table exercises through the API, lets students fill blank/T/F answer cells, checks answers, and shows solutions alongside their entries. See the [implementation plan](docs/initial-implementation-plan.md) and [truth-table API](docs/truth-table-api.md).

The agreed product behavior and remaining design questions are recorded in [Product Direction](docs/product-direction.md).

The storage model and reusable problem library are outlined in [Data Design](docs/data-design.md). Product Direction describes behavior, Data Design describes persistence, and the Implementation Plan describes delivery order.

See the [truth-table walkthrough, screenshots, and verification evidence](docs/truth-table-verification.md) for the completed first feature.

## Local setup

Use Node.js 24.9 or newer (see `.nvmrc`) and npm 10 or newer. If you use nvm, run `nvm install` and `nvm use` from the repository root.

```sh
npm ci
npm run dev
```

Open http://localhost:5173 and select **Create table** to load the example formula, or enter your own. Variable columns are given; intermediate and final expression columns have keyboard-accessible blank/T/F selectors. Editing the formula clears the table and answers; work is not saved across reloads. Syntax errors identify the offending character. The backend listens on port 3000; Vite proxies `/api` requests to it. The root development command builds the schema and logic engine before starting all four workspace watchers.

## Packages

In practice, **Check answers** labels each answer correct, incorrect, or unanswered and summarizes the results. Editing an answer clears previous check feedback; **Show solution** displays expected values without replacing entries, and **Hide solution** removes them. Editing the formula or creating a new table clears answers, feedback, and solutions. Failed checking/solution requests preserve work and can be retried. This is independent practice, not an assignment or official grade.

Browser applications live under `apps/`; backend services live under `services/`. Each has its own dependencies and build output. Shared contracts live under `tools/schema`. The workspace patterns `apps/*`, `services/*`, and `tools/*` automatically include new packages.

```text
apps/
  web/            Student and instructor React app
  admin/          Future admin app (not created yet)
services/
  api/            Node.js API
  worker/         Future background worker (not created yet)
tools/
  schema/         Shared API contracts
  logic-engine/   Pure parser, evaluator, and truth-table generator
  db/             PostgreSQL schema, client, and migrations
docs/
```

An admin app can be added as `apps/admin` with package name `@logiclab/admin`, its own Vite configuration and development port, and a dependency on `@logiclab/schema`. It can deploy independently and use the same API. Root development/build scripts currently target the existing apps explicitly; add admin to those scripts when it is introduced. Server-side permissions will govern access to admin operations.

| Directory | Package | Purpose |
| --- | --- | --- |
| `apps/web` | `@logiclab/web` | React + TypeScript, served and built with Vite |
| `services/api` | `@logiclab/api` | Node.js + TypeScript API using Fastify; Jest tests |
| `tools/schema` | `@logiclab/schema` | Shared Zod request/response schemas and inferred types |
| `tools/logic-engine` | `@logiclab/logic-engine` | Pure TypeScript parser, evaluator, and truth tables, with Jest tests |
| `tools/db` | `@logiclab/db` | MikroORM/PostgreSQL client, users schema, and SQL migrations |

The schema package contains API contracts, not database migrations. It builds JavaScript and type declarations consumed by both apps. Changes are recompiled during root development; API routes can later add domain-specific schemas here.

Frontend features own their UI and behavior under `apps/web/src/features/`. The truth-table feature composes `FormulaForm`, `ExercisePanel`, and `TruthTable`; `useTruthTablePractice` manages requests, answers, errors, and resets. Its API client and answer types live alongside the feature. `App.tsx` composes the feature; shared UI components can be introduced when other features reuse them.

## Commands

For persistence setup, see [local PostgreSQL and DBeaver](docs/local-database.md). After installing Docker/Compose and copying `.env.example` to `.env`, `npm run db:up` starts PostgreSQL and `npm run db:migrate` applies committed migrations. Existing truth-table practice does not require the database yet. `npm run db:test` uses a separately configured disposable test database; CI runs it with its own PostgreSQL service.

```sh
npm run typecheck
npm test
npm run build
npm run check
```

`check` runs type checking, engine/backend Jest tests, and production builds. Backend tests cover handlers directly and routes through Fastify injection without opening a network port. Browser smoke checks have been run locally; a frontend test suite and CI browser job remain follow-up work. Vite is the frontend development/build tool.

Jest uses Node's experimental VM modules flag for an ESM dependency in Fastify's request-injection tooling. An experimental warning during tests is expected. The initial dependency audit reports 20 moderate findings in the Jest development dependency chain, originating in `sprintf-js`. No automatic downgrade was applied; revisit upstream fixes as dependencies evolve.

After a root build, `npm start -w @logiclab/api` starts the compiled API and `npm run preview -w @logiclab/web` previews the static frontend build locally. Individual workspace commands assume the shared schema has already been built. `PORT` and `HOST` configure the API through environment variables. Example files document options; they are not automatically loaded.

## Deployment direction

Both applications will target AWS. The frontend produces static files in `apps/web/dist`; the backend produces runnable Node.js code in `services/api/dist` and uses environment-based configuration. Keep shared workspace dependencies available when packaging the backend.

The production browser uses same-origin `/api` by default. Configure routing for that path to the backend. `VITE_API_URL` optionally sets an API origin at frontend build time; using a different origin will also require explicit backend CORS configuration. Never put secrets in `VITE_*` variables, which are visible in the browser.

The lowest-cost viable AWS topology is still undecided. Compare static hosting, backend execution, database, traffic, logs, and scheduled work costs when those requirements are known. No AWS resources or accounts are configured by this scaffold. See [deployment planning](docs/aws-deployment-notes.md).

The public repository is [pshephardiii/logiclab](https://github.com/pshephardiii/logiclab). A complete demo release still needs a license choice and the features described in the implementation plan.

See [branch naming conventions](docs/branch-naming-conventions.md) for numbered work branches and [GitHub setup](docs/github-setup.md) for the initial publication steps.
