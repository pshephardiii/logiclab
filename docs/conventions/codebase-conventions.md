# Codebase conventions

These conventions record the structure and readability decisions from `004-refactor-codebase`. The current scope covers `tools/`, `services/api/src`, and the agreed frontend routing/page boundaries; extend conventions as further refactors are agreed. Product behavior and conceptual persistence decisions belong in [Product Direction](../planning/product-direction.md) and [Data Design](../planning/data-design.md).

## Tools: package responsibilities

| Package | Responsibility | Keep outside it |
| --- | --- | --- |
| `tools/contracts` | Zod API data contracts and inferred TypeScript types shared by consumers | Database entities, Fastify registration/configuration, endpoint execution |
| `tools/db` | MikroORM entity mappings, database configuration/client, migrations | API contracts, authentication-provider calls, HTTP handling |
| `tools/logic-engine` | Pure parsing, evaluation, and deterministic truth-table generation | Database access, network requests, account/assignment policy, React state |

Keep dependencies directed toward these shared capabilities. Tools must not import application or service implementation modules. Consumers import the supported API through `@logiclab/contracts`, `@logiclab/db`, or `@logiclab/logic-engine`, rather than reaching into their source directories.

## Tools: file organization and readability

- Use named functions that describe their responsibility. Entry points should show the main steps; focused helpers should contain their details.
- Keep a small, cohesive module together. Extract files when responsibilities become independently understandable, rather than creating a file for every function.
- Use domain directories when a module has several substantial stages. Within them, keep stage files alongside shared types/errors/limits; another directory level needs a meaningful grouping.
- Use `helpers/` for a collection of supporting operations. Group files by purpose, and provide a local `index.ts` when it makes imports clearer. Helpers inside the group should import their dependencies directly to avoid circular barrel imports.
- Put shared types in `types.ts` when multiple modules need them. Helpers should not import types from the orchestration module that calls them.
- Use multiline object definitions and readable decorator options. Name repeated or nested shapes instead of burying several structures in one expression.
- Use camelCase for functions/values, PascalCase for classes/types, and uppercase names for exported constants such as `FORMULA_LIMITS`. Module filenames use kebab-case; entity files match their PascalCase class names.
- Comments should explain ordering, invariants, or non-obvious decisions. Keep the implementation explicit rather than hiding it behind a generic abstraction.

A directory's `index.ts` defines its intended import surface. The package root exports supported operations and types; internal helper/stage exports need not be exposed there. This is a convention, not an enforced package subpath restriction.

## Tools: API contracts

Keep one contract file per domain until its size warrants a domain directory. Group each file in this order:

1. Reusable field/data shapes.
2. Request contracts, including query and path-parameter shapes.
3. Response contracts.

Keep inferred type aliases beside their public schemas:

```ts
export const classroomResponseSchema = z.strictObject({
  classroom: classroomSchema,
});
export type ClassroomResponse = z.infer<typeof classroomResponseSchema>;
```

Use `...Schema` for runtime validators and descriptive PascalCase names for data types. Zod remains the source of truth; do not separately maintain an interface with the same fields. Named type exports are conveniences, not a requirement for inference. Keep incidental field validators private unless consumers need them.

Preserve the distinction between request normalization and response validation. For example, authored class names are trimmed, while returned names must already be normalized. Make strictness, optional/nullable fields, coercion, defaults, limits, and formats explicit; a readability refactor must not silently change them. Name nested shapes where doing so clarifies their role. Keep the package index focused on re-exports, with health contracts in their own domain file.

Route-schema objects containing summary/description and status-keyed responses belong to the API service; they assemble these data contracts rather than defining database entities.

## Tools: database entities and configuration

Define entities as classes using MikroORM standard ES decorators from `@mikro-orm/decorators/es`. Keep scalar types and relationship targets explicit. Use property decorators for column/relation mappings and class decorators for table names, composite uniqueness, and indexes. Do not maintain a separate `EntitySchema.properties` map or a `defineEntity` definition for the same class.

Preserve explicit column names, foreign-key/constraint/index names, enum mappings, defaults, nullability, and deletion rules. Register entities explicitly in database configuration. Composite unique constraints apply to the whole property combination, not each property individually.

Use `OptionalProps` for generated fields callers can omit during ORM creation; it does not make persisted columns nullable. Import that symbol as a runtime value when using its computed property name. Keep database defaults and application generation behavior explicit. Keep UUID fields typed as `string` to match existing application contracts.

The DB package uses ESM/NodeNext and `.js` relative import specifiers in TypeScript. Its default `tsconfig.json` includes source, tests, and ORM configuration for editor/type checking. Production emission uses `tsconfig.build.json` and excludes tests; build/watch commands select it explicitly. Keep MikroORM package versions aligned.

Use a forked EntityManager per request/job and close the ORM on shutdown. Transactions, locks, constraints, and conflict handling must express persistence guarantees; changing file layout must preserve those guarantees.

Commit migrations and application snapshots; keep applied migrations immutable. Generate/review migrations for actual schema changes. For entity-only refactors, run `migration:check` and verify no migration is needed. Integration-test migration runs disable snapshot generation; ignored test snapshots are not a reason to ignore application snapshots or source tests. See [Local Database](../development/local-database.md).

## Tools: logic-engine structure and invariants

The parser directory separates the public entry point, tokenization, token parsing, types, errors, and limits. Precedence stages stay together in `parse-tokens.ts`, where their recursive relationships are visible. Its index exposes the public parser API, not tokenization internals.

Truth-table generation separates orchestration and output types from `helpers/expressions.ts`, `helpers/columns.ts`, and `helpers/rows.ts`. The helper index supplies the generator's combined imports. The evaluator remains a small single file with private variable-validation and binary-operation helpers.

Preserve grammar, precedence/associativity, error codes/messages/UTF-16 positions, and complexity limits. Evaluate both binary operands before applying an operator so short-circuiting cannot hide missing inputs. Preserve alphabetical variables, child-before-parent distinct expressions, T-first rows, canonical labels, versioned structural IDs, independent output allocations, and the single-variable answer-column rule.

Keep expected-answer generation separate from disclosure policy: callers decide what students may receive. Changes to stable IDs or historical interpretation need explicit design decisions, not incidental refactoring.

## Tools: verification

Use existing behavior tests as the baseline. Add tests for material gaps or changed guarantees, rather than tests that only mirror helper implementation. A refactor should preserve public exports and intended behavior.

- `npm run check` verifies workspace types, engine/API tests, and production builds.
- `npm run db:test` verifies real PostgreSQL behavior using a separate disposable database.
- MikroORM `migration:check` verifies entity mappings against the database.

Keep documentation and import paths current when modules move. Report the checks actually run; local browser/concurrency evidence is distinct from committed tests and remote CI results.

## API: module responsibilities

Group code under `services/api/src` by responsibility, with domain subdirectories where needed:

| Directory | Responsibility |
| --- | --- |
| `bootstrap/` | Construct shared resources and route dependencies; own initialization-failure and shutdown cleanup |
| `application/auth/` | Coordinate auth operations through provider/store interfaces; keep supporting session crypto and domain types here |
| `integrations/cognito/` | Translate application identity operations to AWS SDK calls |
| `persistence/auth/`, `persistence/classroom/` | Implement database operations using MikroORM |
| `config/` | Validate backend environment settings |
| `routes/` | HTTP registration, route schemas, handlers, transport helpers, and group policies |

Application behavior should depend on the capabilities described by interfaces, not SDK clients or HTTP objects. Integrations and stores implement those capabilities; bootstrap selects and constructs concrete implementations. Keep resource ownership at application composition, rather than making auth construct unrelated classroom persistence. `buildApp` accepts separate route-group contexts and performs registration without opening database/provider resources.

Cookie/origin handling is HTTP-specific and belongs with auth routes. Session encryption supports application auth behavior; do not categorize every helper as an external integration. Colocate module tests; shared test fixtures stay under `services/api/test`. Do not create empty service/domain directories for symmetry—classroom currently has persistence and route coordination without a separate application service.

For a provider with several operations, keep its factory focused on assembling the application interface. Cognito uses `wrapper.ts` for SDK request dispatch and client-secret hashing, and `methods/` for individual operations. Login and refresh share authentication-response handling in `methods/authenticate.ts`. The methods index exports provider operations; methods import supporting files directly. Bootstrap retains ownership of the injected SDK client's shutdown.

## API: routes and handlers

Organize routes by domain and then operation, following the existing `routes/<domain>/<operation>/` layout (for example, `routes/classroom/postClassroom/`). Domain and operation directory names currently use camelCase. Each operation contains:

- `route.ts`: a named route-schema object and Fastify registration connecting the method, URL, schema, and handler.
- `handler.ts`: request handling, calls to application/store capabilities, and HTTP response construction.
- `route.test.ts`: HTTP-level checks through Fastify injection, including validation, status codes, and applicable group policies.
- `handler.test.ts`: direct checks of meaningful handler behavior and dependency interactions where these add coverage beyond registration tests.

A single-endpoint group such as health can keep these files directly in its domain directory. Do not add tests solely to repeat implementation details.

Compose route schemas from `@logiclab/contracts`, with `summary`, `description`, applicable `body`/`querystring`/`params`, and responses keyed by status. Use `satisfies` with the appropriate route-schema type. Keep reusable response mappings in the group's `schemas.ts`; shared contracts continue to define the actual request/response data shapes.

Use the group's `index.ts` as its registration entry point. Install Zod compilers, plugins, hooks, and error handling within the relevant Fastify scope. Put repeated setup in `routes/setup.ts`; keep endpoint-specific overrides explicit. Install rate-limit defaults before the rate-limit plugin so its registration hook sees the final configuration. Do not apply authenticated-route policies to anonymous practice through an incidental global refactor.

## API: contexts, helpers, and behavior

Use a domain's `context.ts` to describe the dependencies its routes receive. Construct those dependencies in bootstrap and pass them into registration and handler factories. Handlers should use the supplied capabilities rather than initialize SDK clients or database connections.

Keep shared transport concerns in the route group: cookies, origin checks, request parsing, role checks, and response/error helpers. A cohesive `helpers.ts` is sufficient until distinct responsibilities justify splitting it. Use descriptive filenames or a helper directory when extracting; avoid an unrelated general utilities collection. Local indexes can simplify imports, while files within a group import their supporting modules directly to avoid circular dependencies.

Keep reusable application workflows in `application/<domain>/`, provider-specific requests in `integrations/<provider>/`, and database operations in `persistence/<domain>/`. Add an application layer when there is a workflow to coordinate; do not require every simple route/store call to pass through an otherwise empty service. Keep SDK response interpretation in the integration and persistence guarantees in the store.

## API: security and lifecycle invariants

Preserve authentication, role checks, owner/enrollment scoping, and transaction/lock behavior when moving code. Classroom authorization currently runs before field validation and reuses the authenticated user within the request. Refactors must preserve that ordering and avoid redundant authentication.

Keep HTTP error mapping scoped to the route group and preserve public status codes and response shapes. Sanitize operational responses and logs; do not expose credentials, session tokens, invitation codes, request bodies, or raw provider error details. Keep cookie handling, mutation-origin checks, cache headers, and rate limits explicit where they apply.

Bootstrap owns shared resource construction and cleanup, including partial initialization failures. `app.ts` composes HTTP registration; `server.ts` connects startup/shutdown to the constructed dependencies. SDK operation files and request handlers do not close shared resources.

## API: verification

Colocate tests with the module they cover; keep reusable fixtures and invocation helpers in `services/api/test`. Use injected dependencies and mocked SDK calls for deterministic unit/route checks. Bootstrap tests should verify resource ownership and failure cleanup without making external requests.

Use existing behavior tests to validate structural changes, adding coverage for material gaps rather than every new file. Run `npm run check` for API code refactors; run database integration/schema checks when persistence mappings or guarantees are involved. Live Cognito checks are separate, intentional verification steps and must not be implied by passing mocked tests. Documentation-only changes need relevant link and whitespace checks.

## Web: routing and page composition

Keep paths, navigation labels, and role-access metadata in `routing/route-definitions.ts`. `Navigation` renders links from those definitions; `ProtectedRoute` handles account loading, anonymous redirects, and role denial. `AppRoutes` maps paths to page components. Navigation visibility complements the guard and backend authorization.

Put each navigable page in its own directory under `pages/`, including the not-found page. Pages compose feature components inside `components/layout/Page`, which owns the shared header/navigation, single main landmark, and footer. Loading and access-denied views also use that layout. Features must not introduce additional main landmarks.

Keep page-specific subcomponents beside their page, optionally in a local `components/` directory when useful. Reusable feature components and state hooks remain in `features/`; API clients live in `api/`; a page directory does not require duplicating them. Keep persistent account/practice providers above routing in `App`, and preserve account-keyed resets for class components when users change.

Place single-page forms, panels, and orchestration hooks under that page's directory. Account panels/forms live in `pages/account/components/`; class management and invitation controls live in `pages/instructor-classes/`; enrollment forms and orchestration live in `pages/student-classes/`. Shared account/session state remains in features; API clients live under `api/`. Shared components must not import page components: `ClassroomList` accepts an optional `renderActions` callback so the instructor page supplies invitation controls while the student page reuses the list without them.

## Web: API clients

Group domain clients under `src/api/auth/`, `classrooms/`, `enrollments/`, and `truth-tables/`. Each domain's `api.ts` exposes named operations and owns contract validation and domain error messages. `api/http-client.ts` handles base URLs, JSON request encoding, same-origin credentials, response decoding, and abort signals. `api/account-request.ts` applies shared account/class error handling with domain fallback messages and optional overrides. Error types and parsing belong in `api/errors.ts`, so classroom code does not depend on the auth client.

Keep domain differences explicit: authentication maps a missing service to its existing message and session 401 to a signed-out state; practice preserves formula-error positions and unexpected-response messages. Account/class requests tolerate malformed JSON as null, while practice retains JSON parse failures. Do not add retries or change cancellation, authentication, or response semantics during transport extraction.

## Web: style ownership

Keep resets, typography, and base form controls in `styles/global.css`, and reusable panels, messages, form rows, and action rows in `styles/shared-ui.css`. Import these once from `main.tsx`. Layout styles live beside layout components; `Navigation.tsx` lives beside `Header`, `Page`, and `Footer` in `components/layout/` and imports its sibling stylesheet. Shared compact-page sizing belongs to the page layout because account and both class pages use it.

Keep account-specific form/link styling beside the account page and truth-table styling beside the truth-table feature, imported by their composition components. Put responsive rules beside the selectors they modify. These remain ordinary global CSS stylesheets; use descriptive selectors and account for cascade order. Split by actual ownership rather than creating empty stylesheets for every page.

Keep table composition in `TruthTable` and answer-input rendering in its sibling `AnswerCell`. Pass the cell label, value, feedback status/ID, expected value, and change callback explicitly; the cell does not own practice state or API requests. Preserve blank/T/F behavior and accessible feedback associations when extracting interactive components.

## Web: state-hook readability

Keep domain state and request lifecycles visible in each hook. Use named operations for session restoration, account transitions/logout reconciliation, class mutations, and page loading. Extract pure answer serialization and classroom-page merging into focused feature helpers; do not combine unrelated workflows into a generic state hook.

Abort prior requests before starting replacements and on unmount. Guard success, error, and final loading updates with the operation's abort signal. Preserve formula/answer-edit invalidation, solution/answer retention, signup/recovery transitions, logout reconciliation, and the different instructor-create/student-join pagination rules. Keep hook return interfaces stable during internal refactors.
