# LogicLab

An interactive formal-logic learning project, built as a public full-stack portfolio. This initial scaffold connects a React interface to a Node.js health endpoint. Classroom and practice features are planned in [the implementation plan](docs/initial-implementation-plan.md).

The agreed product behavior and remaining design questions are recorded in [Product Direction](docs/product-direction.md).

The storage model and reusable problem library are outlined in [Data Design](docs/data-design.md). Product Direction describes behavior, Data Design describes persistence, and the Implementation Plan describes delivery order.

## Local setup

Use Node.js 24.9 or newer (see `.nvmrc`) and npm 10 or newer. If you use nvm, run `nvm install` and `nvm use` from the repository root.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. The backend listens on port 3000; Vite proxies `/api` requests to it. The page reports whether the API is connected. The root development command builds the shared schema before starting all three workspace watchers.

## Packages

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
docs/
```

An admin app can be added as `apps/admin` with package name `@logiclab/admin`, its own Vite configuration and development port, and a dependency on `@logiclab/schema`. It can deploy independently and use the same API. Root development/build scripts currently target the existing apps explicitly; add admin to those scripts when it is introduced. Server-side permissions will govern access to admin operations.

| Directory | Package | Purpose |
| --- | --- | --- |
| `apps/web` | `@logiclab/web` | React + TypeScript, served and built with Vite |
| `services/api` | `@logiclab/api` | Node.js + TypeScript API using Fastify; Jest tests |
| `tools/schema` | `@logiclab/schema` | Shared Zod request/response schemas and inferred types |

The schema package contains API contracts, not database migrations. It builds JavaScript and type declarations consumed by both apps. Changes are recompiled during root development; API routes can later add domain-specific schemas here.

## Commands

```sh
npm run typecheck
npm test
npm run build
npm run check
```

`check` runs type checking, backend Jest tests, and production builds. Tests use Fastify injection without opening a network port. Frontend testing is a later decision; Vite is its development/build tool.

Jest uses Node's experimental VM modules flag for an ESM dependency in Fastify's request-injection tooling. An experimental warning during tests is expected. The initial dependency audit reports 20 moderate findings in the Jest development dependency chain, originating in `sprintf-js`. No automatic downgrade was applied; revisit upstream fixes as dependencies evolve.

After a root build, `npm start -w @logiclab/api` starts the compiled API and `npm run preview -w @logiclab/web` previews the static frontend build locally. Individual workspace commands assume the shared schema has already been built. `PORT` and `HOST` configure the API through environment variables. Example files document options; they are not automatically loaded.

## Deployment direction

Both applications will target AWS. The frontend produces static files in `apps/web/dist`; the backend produces runnable Node.js code in `services/api/dist` and uses environment-based configuration. Keep shared workspace dependencies available when packaging the backend.

The production browser uses same-origin `/api` by default. Configure routing for that path to the backend. `VITE_API_URL` optionally sets an API origin at frontend build time; using a different origin will also require explicit backend CORS configuration. Never put secrets in `VITE_*` variables, which are visible in the browser.

The lowest-cost viable AWS topology is still undecided. Compare static hosting, backend execution, database, traffic, logs, and scheduled work costs when those requirements are known. No AWS resources or accounts are configured by this scaffold. See [deployment planning](docs/aws-deployment-notes.md).

The public repository is [pshephardiii/logiclab](https://github.com/pshephardiii/logiclab). A complete demo release still needs a license choice and the features described in the implementation plan.

See [branch naming conventions](docs/branch-naming-conventions.md) for numbered work branches and [GitHub setup](docs/github-setup.md) for the initial publication steps.
