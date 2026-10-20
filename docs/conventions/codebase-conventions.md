# Codebase conventions

These conventions record the structure and readability decisions from `004-refactor-codebase`. They cover shared tools, API modules, frontend ownership, readability, formatting, and regression tests; extend them when new decisions are agreed. Product behavior and conceptual persistence decisions belong in [Product Direction](../planning/product-direction.md) and [Data Design](../planning/data-design.md).

## General: ownership and refactor scope

Group code by responsibility and actual consumers. Keep page-specific UI and hooks with their page, shared domain behavior with its feature, transport with API clients, and external integrations separate from application workflows. Shared modules must not import the page or orchestration code that consumes them. Use explicit props, callbacks, and dependency interfaces to connect those boundaries.

Extract a component/helper when it is reused or isolates a meaningful responsibility. Keep small cohesive modules together; line count alone does not justify another directory, a helper per function, or a generic framework. Prefer named stages and descriptive inputs to nested implementation details. Local helper barrels are useful when they simplify imports; internal files import one another directly to avoid cycles.

Keep structural refactors separate from product changes and broad mechanical formatting where practical. Preserve public contracts, exports, error precedence, authorization, state-reset/cancellation behavior, and persistence guarantees. Update imports, comments, documentation, and relevant behavior tests together. Filename conventions follow the owning area: React components/pages and hooks retain names such as `AccountForm.tsx` and `useAccount.ts`; API domain/operation directories retain the existing camelCase layout.

## Tools: package responsibilities

| Package              | Responsibility                                                           | Keep outside it                                                           |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `tools/contracts`    | Zod API data contracts and inferred TypeScript types shared by consumers | Database entities, Fastify registration/configuration, endpoint execution |
| `tools/db`           | MikroORM entity mappings, database configuration/client, migrations      | API contracts, authentication-provider calls, HTTP handling               |
| `tools/logic-engine` | Pure parsing, evaluation, and deterministic truth-table generation       | Database access, network requests, account/assignment policy, React state |

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

## Tools: database source imports

Inside `tools/db`, use explicit `.ts` extensions for relative TypeScript imports and re-exports, including type-only imports, tests, and `mikro-orm.config.ts`. These paths name the source files contributors edit. Continue importing other workspace packages through their package names.

`tools/db/tsconfig.json` enables TypeScript's `rewriteRelativeImportExtensions`; the build configuration inherits it and emits runnable `.js` paths. Do not hand-edit output, add runtime aliases, or import workspace `src` files across package boundaries. Package entry points remain `dist/index.js` and `dist/index.d.ts`. Declaration files can retain `.ts` specifiers, which TypeScript resolves to corresponding declarations; declaration maps provide navigation to sources.

This convention is scoped to the database package. Existing extensionless imports in the other packages follow their current compiler/bundler setup. Keep existing migrations unchanged; new relative TypeScript imports in future migration source should use `.ts`. Rewriting covers relative import/export paths, not package aliases or arbitrary computed paths. Filesystem locations such as `new URL('./migrations', import.meta.url)` retain their actual runtime directory names.

When changing TypeScript or build tools, verify workspace consumers, native Node loading of built database output, declaration/source-map resolution, source execution through `tsx`, and MikroORM commands. The standard checks are `npm run check` and `npm run db:test`; the latter applies migrations to the disposable test database. CLI `migration:list` provides a read-only configuration-loading check. Database metadata and migrations are unaffected by this import convention.

## Tools: readable entity shapes and related types

Every entity has a compact `...Fields` interface. The decorated class uses `implements` plus `Assert<SameEntityFields<Entity, Fields>>` to reject extra/missing application members, type changes, and optionality changes. Keep interfaces and assertions beside their owning domain/class; do not duplicate database decorator metadata in the interfaces.

Use one directory per entity under `tools/db/src/types/`:

| Directory             | Contents                                                    |
| --------------------- | ----------------------------------------------------------- |
| `assignment/`         | Assignment fields and assessment/feedback enums             |
| `assignment-attempt/` | Attempt fields, saved answer types, and frozen result types |
| `assignment-item/`    | Assignment-item fields                                      |
| `classroom/`          | Classroom fields                                            |
| `enrollment/`         | Enrollment fields                                           |
| `problem/`            | Problem fields, authored definition, problem-type enum      |
| `problem-version/`    | Problem-version fields                                      |
| `user/`               | User fields and role enum                                   |
| `auth-session/`       | Session fields                                              |
| `shared/`             | Exact-shape assertion helpers used across entities          |

Use `fields.ts` within each entity directory, even when entities are closely related. Shared authored content stays in `problem/definition.ts`, imported by both problem and problem-version fields rather than duplicated. Keep discrete supported values in domain `enums.ts` files; do not invent enums for free text, IDs, booleans, or definition-format version numbers. Keep serialized enum values stable. Adding an enum member does not implement its behavior: update database constraints and application policy deliberately.

Problem definition discriminants derive their string literal type from `ProblemType` so structurally typed API contracts remain assignable without casts or a dependency from contracts into the database package. `UserRole`, `AssessmentMode`, `FeedbackTiming`, `ProblemType`, and field interfaces are available through `@logiclab/db`. Preserve the existing `UserRole` entity-module re-export for current internal consumers. Relationships use entity types through type-only imports; field references are not API response contracts.

The exact-shape helper excludes only MikroORM's `[OptionalProps]` creation metadata; methods are not silently excluded. If methods or other metadata are introduced, decide their treatment explicitly. Compile-time regression cases in `tools/db/test/entity-fields.typecheck.ts` run through the database type check. Expected-error assertions prove that drift is rejected. These interfaces/assertions do not provide runtime validation; migration/schema and integration tests still verify decorators, defaults, nullability, and database constraints.

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

For durable jobs, keep pure cadence, occurrence identity, retry-budget/backoff, and handler-result validation policies in `application/jobs/`. Pass timestamps into policies rather than reading a clock there. Keep database time sampling, due-row selection, locks, lease fencing, and atomic run/finding updates in `persistence/jobs/`; evaluate decisions against the locked state inside the transaction.

Commit migrations and application snapshots; keep applied migrations immutable. Generate/review migrations for actual schema changes. For entity-only refactors, run `migration:check` and verify no migration is needed. Integration-test migration runs disable snapshot generation; ignored test snapshots are not a reason to ignore application snapshots or source tests. See [Local Database](../development/local-database.md).

### SQL readability

Apply the same SQL formatting conventions to trigger bodies, compound entity checks, migration statements, and raw queries in persistence code or tests:

- Keep short, simple expressions on one line. Use multiline template literals for longer statements rather than dense strings or concatenation.
- Put major clauses (`select`, `from`, `where`, `order by`, and locking clauses) on separate lines. Put each join on its own line with its `on` predicates indented beneath it. Split long select lists across lines.
- List table columns and table constraints on separate lines in `create table`. Separate long `alter table` actions, foreign-key references, and deletion rules into readable lines.
- Break compound checks into logical groups and place their `and`/`or` predicates on separate lines. Preserve parentheses and operator precedence.
- Indent procedural SQL to show `if`/`then`/`end if` and nested `declare`/`begin`/`end` blocks. Give returns and exceptions their own lines. Format SQL nested inside `execute format(...)` too, with formatting arguments, `into`, and `using` separated when helpful.
- Preserve existing keyword casing in formatting-only edits. Keep SQL identifiers, literal values, placeholders, parameter order, statement order, and behavior unchanged. Continue using bound values and safe identifier formatting; readability is not a reason to interpolate untrusted values.

Format new migration SQL before it is applied. Keep applied migration history unchanged by default; an explicitly requested historical formatting pass must remain a separate change and preserve SQL tokens, including nested procedural/dynamic SQL. Verify such a pass with a fresh migration replay and rollback in an isolated test schema, schema comparison, and relevant database/trigger tests. A whitespace-only change should not require a new schema migration or a rewritten snapshot.

Prettier formats the surrounding TypeScript but does not format SQL inside template literals; review the SQL layout directly. Migration history and generated snapshots are excluded from ordinary repository formatting.

## Tools: logic-engine structure and invariants

The parser directory separates the public entry point, tokenization, token parsing, types, errors, and limits. Precedence stages stay together in `parse-tokens.ts`, where their recursive relationships are visible. Its index exposes the public parser API, not tokenization internals.

Truth-table generation separates orchestration and output types from `helpers/expressions.ts`, `helpers/columns.ts`, and `helpers/rows.ts`. The helper index supplies the generator's combined imports. The evaluator remains a small single file with private variable-validation and binary-operation helpers.

Preserve grammar, precedence/associativity, error codes/messages/UTF-16 positions, and complexity limits. Evaluate both binary operands before applying an operator so short-circuiting cannot hide missing inputs. Preserve alphabetical variables, child-before-parent distinct expressions, T-first rows, canonical labels, versioned structural IDs, independent output allocations, and the single-variable answer-column rule.

Keep expected-answer generation separate from disclosure policy: callers decide what students may receive. Changes to stable IDs or historical interpretation need explicit design decisions, not incidental refactoring.

## Tools: verification

Use existing behavior tests as the baseline. Add tests for material gaps or changed guarantees, rather than tests that only mirror helper implementation. A refactor should preserve public exports and intended behavior.

- `npm run check` verifies workspace types, engine/API Jest tests, frontend Vitest tests, and production builds.
- `npm run db:test` verifies real PostgreSQL behavior using a separate disposable database.
- MikroORM `migration:check` verifies entity mappings against the database.

Keep documentation and import paths current when modules move. Report the checks actually run; local browser/concurrency evidence is distinct from committed tests and remote CI results.

## API: module responsibilities

Group code under `services/api/src` by responsibility, with domain subdirectories where needed:

| Directory                                     | Responsibility                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `bootstrap/`                                  | Construct shared resources and route dependencies; own initialization-failure and shutdown cleanup                 |
| `application/auth/`                           | Coordinate auth operations through provider/store interfaces; keep supporting session crypto and domain types here |
| `integrations/cognito/`                       | Translate application identity operations to AWS SDK calls                                                         |
| `persistence/auth/`, `persistence/classroom/` | Implement database operations using MikroORM                                                                       |
| `config/`                                     | Validate backend environment settings                                                                              |
| `routes/`                                     | HTTP registration, route schemas, handlers, transport helpers, and group policies                                  |

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

Classroom/enrollment list handlers share response slicing and next-offset calculation through `routes/classroom/pagination.ts`. Keep role authorization and scoped store calls explicit in each handler; fetch `limit + 1` rows so the helper can identify a following page without a count query.

Auth/classroom groups apply `routes/account-http.ts` directly to their existing Fastify scope for Zod compilers, cookies, rate-limit defaults, cache headers, and origin checks. Apply shared policy before registering endpoints, preserving plugin/hook ordering. Group-specific limiter options stay explicit; authorization and error mapping remain in each group. This setup does not authenticate users and is not installed on anonymous practice routes.

## API: contexts, helpers, and behavior

Use a domain's `context.ts` to describe the dependencies its routes receive. Construct those dependencies in bootstrap and pass them into registration and handler factories. Handlers should use the supplied capabilities rather than initialize SDK clients or database connections.

Keep domain-specific transport concerns in the route group: cookies, role checks, and response/error policy. Put transport capabilities used by multiple groups in focused modules under `routes/`. A cohesive `helpers.ts` is sufficient until distinct responsibilities justify splitting it. Use descriptive filenames or a helper directory when extracting; avoid an unrelated general utilities collection. Local indexes can simplify imports, while files within a group import their supporting modules directly to avoid circular dependencies.

Keep reusable application workflows in `application/<domain>/`, provider-specific requests in `integrations/<provider>/`, and database operations in `persistence/<domain>/`. Add an application layer when there is a workflow to coordinate; do not require every simple route/store call to pass through an otherwise empty service. Keep SDK response interpretation in the integration and persistence guarantees in the store.

Place cross-domain request parsing and error inspection in `routes/helpers/`: `parseRequest` validates bodies, queries, and path parameters; `errorName` safely inspects thrown errors. Auth response construction belongs in `routes/auth/responses.ts`, and account-discovery suppression policy in `routes/auth/errors.ts`. Parsing currently preserves `AuthError('INVALID_REQUEST')` for compatibility with both groups' error mapping.

Keep status-to-error-contract mappings together in `routes/error-responses.ts`. Routes import their named group mapping directly and keep success responses local. Preserve the group-specific status codes and contracts, including optional parser positions; shared mappings do not install error handlers, authorization, or rate limits. Import `RouteSchema` from `routes/setup.ts` rather than introducing domain aliases or `schemas.ts` files that only repeat error status maps.

Keep route error classification in each group's `errors.ts`; registration keeps cookie clearing and sanitized logging explicit. Preserve classification precedence when extracting it. Name substantial session-refresh and invitation-redemption stages, retaining expiry checks and shared transaction managers.

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

Keep table composition in `TruthTable` and answer-input rendering in its sibling `AnswerCell`. Pass the cell label, value, feedback status/ID, expected value, and change callback explicitly; the cell does not own practice state or API requests. Preserve blank/T/F behavior and accessible feedback associations when extracting interactive components.

`ClassroomPanel` shares the instructor/student class-page presentation: headings, notices/errors, reload/loading states, and the paginated list. Pages supply their form as children and optional per-class actions. Keep page-specific hooks and mutations outside this presentation component.

For readable JSX, move multi-step submission/click logic into named event handlers. Keep simple value-setting callbacks inline. Format complex element props and nested conditional markup across lines, and name substantial display expressions before rendering. Preserve form validation, async success/failure cleanup, accessible attributes, and visible text during readability changes.

Password fields belong beside the account form so constraints, autocomplete, and help text remain cohesive.

## Web: API clients

Group domain clients under `src/api/auth/`, `classrooms/`, `enrollments/`, and `truth-tables/`. Each domain's `api.ts` exposes named operations and selects response contracts and domain error messages. `api/http-client.ts` handles base URLs, JSON request encoding, same-origin credentials, response decoding, and abort signals. `api/account-request.ts` applies shared account/class error handling with domain fallback messages and optional overrides. Error types and parsing belong in `api/errors.ts`, so classroom code does not depend on the auth client.

Keep domain differences explicit: authentication maps a missing service to its existing message and session 401 to a signed-out state; practice preserves formula-error positions and unexpected-response messages. Account/class requests tolerate malformed JSON as null, while practice retains JSON parse failures. Do not add retries or change cancellation, authentication, or response semantics during transport extraction.

Use `api/validated-request.ts` to validate successful payloads and infer their return types from a response schema. It builds on the raw HTTP client; domain clients choose schemas and optional validation-error mapping. Account/class requests propagate schema errors, while practice translates them to its existing unexpected-response message. HTTP/network/JSON-decoding failures are not remapped as schema failures.

API clients are plain asynchronous functions, not React hooks. Hooks call them and own UI state. Keep request transport, successful-response validation, domain error mapping, and UI transitions separately understandable. Infer validated response types from schemas rather than casting untrusted JSON.

## Web: style ownership

Keep resets, typography, and base form controls in `styles/global.css`, and reusable panels, messages, form rows, and action rows in `styles/shared-ui.css`. Import these once from `main.tsx`. Layout styles live beside layout components; `Navigation.tsx` lives beside `Header`, `Page`, and `Footer` in `components/layout/` and imports its sibling stylesheet. Shared compact-page sizing belongs to the page layout because account and both class pages use it.

Keep account-specific form/link styling beside the account page and truth-table styling beside the truth-table feature, imported by their composition components. Put responsive rules beside the selectors they modify. These remain ordinary global CSS stylesheets; use descriptive selectors and account for cascade order. Split by actual ownership rather than creating empty stylesheets for every page.

## Web: state-hook readability

Keep hooks in a local `hooks/` directory within their owning page or feature. Reserve a root hooks directory for behavior shared across unrelated features if that need arises. Keep domain state and request lifecycles visible in each hook. Use named operations for session restoration, account transitions/logout reconciliation, class mutations, and page loading. Extract pure answer serialization and classroom-page merging into focused feature helpers; do not combine unrelated workflows into a generic state hook.

Abort prior requests before starting replacements and on unmount. Guard success, error, and final loading updates with the operation's abort signal. Preserve formula/answer-edit invalidation, solution/answer retention, signup/recovery transitions, logout reconciliation, and the different instructor-create/student-join pagination rules. Keep hook return interfaces stable during internal refactors.

Use `src/hooks/useAbortableRequest.ts` for the request lifecycle shared across unrelated workflows: starting a replacement aborts the previous request, explicit cancellation supports edits, and unmount aborts pending work. The returned callbacks are stable. Each consumer still owns loading/error/success state and explicit `signal.aborted` guards; the helper does not run domain operations or prescribe their state transitions.

Use `void` when an event/effect intentionally ignores an asynchronous operation's result, provided rejection handling remains explicit in the operation or caller. `void` neither catches errors nor cancels work. Preserve returned success flags where forms use them to clear input only after success, and preserve password cleanup after submission settles.

## Explanatory comments

Add brief documentation above exported hooks and substantial components when their responsibility or behavior is not obvious from the name. Describe what they own, what callers supply, and important lifecycle behavior. Use inline comments to explain invariants and decisions such as cancellation guards, pagination adjustments, authorization ordering, and transaction locks.

Do not narrate obvious statements or add comments to every trivial component. Keep explanations accurate to the current implementation, distinguish presentation from authorization, and update comments when behavior changes. Prefer a clear name or focused helper over a comment that compensates for confusing code.

## Repository formatting

Use the pinned root Prettier dependency and `.prettierrc.json` for consistent formatting: two-space indentation, single quotes in JavaScript/TypeScript, semicolons, trailing commas, LF endings, and a 100-column target. Markdown prose wrapping is preserved. Run `npm run format` to apply formatting and `npm run format:check` to verify it; CI runs the latter before functional checks.

The committed VS Code settings enable format-on-save with the recommended Prettier extension. Other editors should use the same repository configuration and installed version. Generated output, dependencies, local secrets/drafts, the lockfile, and immutable database migration history are excluded by `.prettierignore`. Review formatter changes separately from behavior changes. Formatting complements named handlers and focused helpers; it does not replace clear structure.

Separate the import block from the first declaration or its documentation with a blank line. Use blank lines between top-level functions, classes, and type/interface declarations, and between distinct stages within substantial functions. Keep related imports and small related declarations together. Prettier preserves these boundaries but does not create them automatically.

Use braces for multiline conditional branches; Prettier does not add them automatically.

## Committed regression coverage

Frontend behavior tests use Vitest with jsdom and React Testing Library, colocated with the code they exercise. Shared DOM cleanup lives in `apps/web/test/setup.ts`. `npm run check` includes frontend tests; `npm run test:watch -w @logiclab/web` runs them interactively. These tests cover DOM behavior and async lifecycle guarantees, not real-browser rendering or live Cognito.

`npm run db:test` runs the DB package's migration/entity tests followed by the API's real PostgreSQL enrollment suite. API database tests live in `services/api/test/integration/`, run with Node's test runner, and are excluded from Jest. They require a disposable database ending in `_test`, use synthetic identity/session data, and clean up their records. The enrollment race test observes a PostgreSQL lock wait before committing replacement instead of assuming a fixed delay proves serialization.

Test observable guarantees rather than file boundaries: role guards, request replacement/unmount cleanup (including StrictMode), late-response rejection, HTTP versus schema error handling, form input retention, and accessible feedback. Prefer deferred promises to arbitrary delays in asynchronous tests. Add pagination tests for empty, partially full, exactly full final, and following pages. Keep existing handler/service tests when they already exercise extracted helpers; remove tests only when their behavior is obsolete or duplicated without useful coverage.

Integration-test commands must build every imported workspace dependency on a fresh checkout. The API database suite imports `buildApp`, whose registered practice routes require `@logiclab/logic-engine` even when tests only exercise enrollment. Do not rely on artifacts produced by another CI job or a previous local build.

Enable `declarationMap` in declaration-emitting shared-package builds (`logic-engine`, `contracts`, and `db`). Generated `.d.ts.map` files connect package declarations to workspace sources for IDE navigation without bypassing package imports. Rebuild/watch the package after source changes; edit `src/` rather than generated `dist/` files. These maps support local workspace navigation while sources are present; packaged distribution would need to include or otherwise expose those sources. Application packages do not need declaration maps unless they begin exporting declaration files to consumers.

Shared-package builds also emit JavaScript source maps (`sourceMap`) for debugger navigation from compiled JavaScript to TypeScript; declaration maps serve editor definition navigation instead. Use a source-map-aware debugger/runtime when debugging built code. VS Code hides `dist/` from explorer and search to reduce generated-file clutter; this does not change module resolution, builds, or the ability to open generated files explicitly.

## Assignment work and review UI

Keep student completion orchestration in `pages/student-work/` and instructor review controls with `pages/instructor-assignments/`. Share assigned table rendering, answer normalization, and result presentation through `features/assignment/`; the practice provider remains independent. Shared `features/classroom/components/ClassSelection.tsx` presentation and `features/classroom/hooks/useClassChoices.ts` accept an owned/enrolled-class API loader so student pages do not import instructor page internals.

Unsaved answers and the server baseline remain separate. Compare normalized blank/false values by assignment-item ID, preserve other items when saving one, and require explicit final confirmation only after all edits are saved. Render official feedback from the retained result rather than calling public practice checks. Read-only tables and solution buttons reflect policy, while backend role/enrollment/ownership/submission checks remain authoritative. Instructor review reads final submissions only, never private drafts.
