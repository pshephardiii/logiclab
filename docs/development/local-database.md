# Local PostgreSQL and DBeaver

Use Docker with Compose v2 and Node.js 24.9+. Docker Desktop is one option on macOS. Docker Desktop is now configured locally. Live migration and integration-test verification has passed against a fresh disposable PostgreSQL database.

## After installing Docker Desktop on macOS

1. Launch **Docker** from Applications and complete the first-run setup. Wait until the engine is running. [Docker’s Mac setup guide](https://docs.docker.com/desktop/setup/install/mac-install/).
2. Open a new terminal and run `docker version` and `docker compose version`. `docker version` should show both Client and Server. If the command is missing, check Docker Desktop’s CLI installation settings and reopen the terminal. If only the Client responds, wait for/start the engine.
3. Keep Docker Desktop running while using the database. No Kubernetes or cloud connection is needed for this project.
4. Run the project commands below. Docker Desktop’s Containers view should show the `logiclab` Compose project with its `postgres` service. Downloading the image can take time on first startup.

## Start and migrate

From the repository root:

```sh
cp .env.example .env
npm ci
npm run db:up
npm run db:migrate
```

Keep an existing `.env` rather than overwriting it. The root file is ignored by Git. Compose reads it, and database commands load it with Node's env-file support. Shell environment values take precedence for Node commands.

PostgreSQL 18 runs as the `postgres` service, published only on loopback. A named volume retains data across container restarts. The mount uses `/var/lib/postgresql`, following the [Postgres 18 image layout](https://hub.docker.com/_/postgres). Compose waits for the configured health check before returning from `db:up`.

Local-only defaults are database/user `logiclab`, password `logiclab_local`, and port `5432`. These are development credentials, not production settings. If you change the password or port, update `DATABASE_URL` to match; URL-encode special characters in passwords. Initialization settings only apply to an empty volume—changing `.env` does not change an existing database password.

## Connect DBeaver

Create a new PostgreSQL connection with these settings:

| Setting  | Default                                        |
| -------- | ---------------------------------------------- |
| Host     | `127.0.0.1`                                    |
| Port     | `5432` (or your `POSTGRES_PORT`)               |
| Database | `logiclab`                                     |
| Username | `logiclab`                                     |
| Password | `logiclab_local` (or your `POSTGRES_PASSWORD`) |

Allow DBeaver to download its PostgreSQL driver if prompted, select **Test Connection**, then finish. After migrating, refresh the schema navigator: application tables are in `public`; MikroORM tracks applied migrations in `mikro_orm_migrations`. DBeaver changes do not create source-controlled migrations; make schema changes in `tools/db/src/entities/User.ts`.

## Schema and migrations

`tools/db` uses MikroORM 7 with its PostgreSQL driver. `createDatabase(connectionString)` asynchronously initializes the ORM; the caller uses `orm.em.fork()` per request/job (or a request context) and calls `orm.close()` on shutdown. It does not read environment files or connect automatically at import time. The API does not use this package yet, so existing practice stays database-independent.

The initial migration adds `users` with a generated UUID, Cognito user-pool ID and subject, one student/instructor role, and a creation timestamp. The Cognito identity pair is unique. Passwords and confirmation/recovery codes stay in Cognito. Classes, enrollment, and provisioning follow in later slices; email/profile caching is not required by this initial schema.

After editing entities, start the database and apply existing migrations first, then generate and apply a new migration:

```sh
npm run db:migrate
npm run db:generate
npm run db:migrate
```

Review and commit generated migration classes and snapshots under `tools/db/src/migrations`. Migrations compile to `dist/migrations` with the package; source commands use the TypeScript files. Keep applied migrations immutable and avoid direct schema-update commands for normal development. See [MikroORM migrations](https://mikro-orm.io/docs/migrations).

The replaced Drizzle migration was uncommitted and had not been run in this environment. If you already applied it elsewhere, use a fresh disposable database for this first MikroORM migration or plan an explicit migration-history baseline; do not apply both initial migrations to the same existing tables.

## TypeScript projects

The default `tools/db/tsconfig.json` includes source, tests, and ORM configuration for editor/type checking. `tsconfig.build.json` emits only source files to `dist`; build/watch scripts use it explicitly. `tsconfig.test.json` inherits the default project for the existing test type-check command. This keeps database tests in a configured NodeNext project when opened in the IDE.

## Integration tests

Use a separate disposable test database:

```sh
docker compose exec postgres createdb -U logiclab logiclab_test
```

Add the corresponding `TEST_DATABASE_URL` from `.env.example` to `.env`, then run:

```sh
npm run db:test
```

The database must already exist. Tests apply migrations twice to check repeat application, then exercise ORM entity persistence/reloading, identity and recovery-email uniqueness, database role constraints, session cascade behavior, class ownership, invitation rotation, and enrollment constraints/scoping. Test inserts are rolled back; migrations remain in the test database. Integration tests set `migrations.snapshotOnMigrate: false` so applying migrations does not create or rewrite schema snapshots. A regression assertion verifies snapshot contents and modification time are unchanged. Normal application migration commands retain the default snapshot behavior, and application snapshots remain committed. Existing ignored test snapshots may remain on disk but are no longer generated by this test command. See [MikroORM snapshot behavior](https://mikro-orm.io/docs/migrations). Never point this command at valuable data. A missing `TEST_DATABASE_URL` fails rather than silently skipping tests. GitHub CI has a separate PostgreSQL service job for these checks; `npm run check` remains usable without Docker.

## Stop, inspect, and reset

```sh
npm run db:logs
npm run db:down
```

Stopping preserves data. For an intentional reset of all local databases, **including the test database**, use `docker compose down --volumes`, then start and migrate again. This deletes the named volume; do not use it to troubleshoot a connection without intending to erase local data.

If startup fails, confirm Docker is running and port 5432 is free. Choose another `POSTGRES_PORT` and update both URLs/DBeaver when necessary. If login fails after changing credentials, account for the existing volume's original password. AWS database provisioning, backups, and production TLS/credentials are outside this local slice.

## Navigating database source

Relative imports in `tools/db` explicitly name `.ts` source files, including the MikroORM config and tests. TypeScript's `rewriteRelativeImportExtensions` emits `.js` imports for the compiled package; consumers still import `@logiclab/db`. No extra runtime loader is required for built code. Development/migration commands continue using the existing `tsx` setup. Declaration and JavaScript source maps remain enabled for editor/debugger navigation. See [codebase conventions](../conventions/codebase-conventions.md) for the scope and verification guidance.

The billing foundation adds `class_purchases`, `class_entitlements`, and
`payment_events`. Run `npm run db:migrate` in existing development checkouts before
using the upcoming simulated-billing workflow. The migration is additive: it does
not charge anyone, create coverage for existing classes, or change publication
permissions. The database test command applies it to the configured disposable
test database; this does not migrate your development database.

Billing plans add `billing_plans` and a required `class_purchases.plan_id` reference. Run `npm run db:migrate` for this addition too. Existing purchases receive retired historical plans preserving their terms; no active catalog plans are seeded yet.

The checkout request-ID migration adds a unique `(payer_id, request_id)` key and backfills old purchases with their existing purchase IDs. Run `npm run db:migrate` before enabling billing HTTP routes.

After migrations, `npm run billing:seed` from the repository root creates the local simulated class plan (USD 25.00 for 180 days). The command preserves existing plan edits/retirement and does not create purchases or coverage. Enable the simulator API separately, then use the instructor `/billing` page.

The durable-jobs foundation adds `job_schedules`, `durable_jobs`, `job_runs`, and `reconciliation_findings`. Apply with `npm run db:migrate` from the repository root. This migration adds storage only: it neither seeds/enables schedules nor starts a worker or reconciliation.
