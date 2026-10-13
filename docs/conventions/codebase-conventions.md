# Codebase conventions

These conventions record the structure and readability decisions from `004-refactor-codebase`. The current scope covers `tools/` and the agreed API module boundaries; extend frontend/backend conventions as further refactors are agreed. Product behavior and conceptual persistence decisions belong in [Product Direction](../planning/product-direction.md) and [Data Design](../planning/data-design.md).

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
