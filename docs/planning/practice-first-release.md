# Practice-first hosted release

Agreed November 23, 2026. This supersedes the earlier requirement to finish the demo teaching-flow and genuine-account UI audits before an initial portfolio sandbox. Those product areas remain local and under development; they are not deleted.

## Release sequence

1. Finish `036-feat-formula-grouping-and-decomposition`, including the agreed grouping behavior, compatibility decisions and focused cross-method verification.
2. Run a brief final practice UI scan covering truth tables, Fitch proofs, dependency proofs and semantic-tableaux truth trees. Include setup, representative successful/incorrect/incomplete work, keyboard/mobile use, reset/navigation protection and error feedback. Conceptual questions are instructor-assigned content, not part of anonymous practice. Natural-deduction trees remain unavailable for new work.
3. Add an explicit practice-only deployment mode. Keep the full product available locally. Guard navigation, direct URLs and backend resource routes rather than merely hiding links. Inventory the anonymous endpoints actually needed by practice, including truth-table generation/checking/solutions, before defining the allowlist. Preserve server validation, resource/rate limits and feedback behavior.
4. Add curated sample problems, completed examples and their click-through walkthroughs together in proposed `038-feat-practice-sample-problems`. Cover truth tables, Fitch/dependency derivations and semantic-tableaux truth trees, with clearly labeled load/view actions and Back/Next/Restart steps for visitors without logic experience. Videos remain deferred. See the [sample-practice plan](practice-sample-problems.md).
5. Prepare the inexpensive sandbox and deploy the practice experience with a short hosted smoke check. Do not deploy until configuration/hosting costs and the concrete deployment changes have been reviewed. This plan does not itself provision infrastructure or deploy anything.
6. Start a separate portfolio repository/deployment featuring LogicLab and authorized professional case studies. Private employer-owned repositories are not prerequisites for useful accounts of responsibilities, decisions and outcomes; do not copy private code, screenshots or confidential details without authorization.

Branch `037-feat-practice-only-exposure` is implemented and locally verified; see the [verification evidence](../verification/practice-only-exposure-verification.md). Follow it with proposed `038-feat-practice-sample-problems` before the initial hosted practice sandbox. Keep later branch numbers unassigned until the actual implementation split is known. The practice scan, exposure guards and deployment preparation are distinct outcomes, not additional scope to silently accumulate in 036.

## Environment-controlled exposure

Use an explicit product exposure setting rather than equating every hosted environment with a restricted product. Local development retains the full application; the initial public sandbox selects practice-only mode. Choose the setting names, defaults, validation and frontend/backend synchronization during the guard branch. A hosted build with incorrect/missing configuration must not accidentally expose the unfinished account/demo platform; settle fail-closed deployment validation there.

Practice-only mode must block direct account/demo/instructor/student/billing resource access on the server as well as removing UI entry points. Do not initialize unnecessary account, demo, payment or job workflows merely to serve anonymous practice. Retain only operational endpoints needed by the deployment, with appropriate exposure. Unknown/deep routes need a coherent practice-facing response without restoring hidden product navigation.

Full local mode continues supporting existing accounts, demo visitors, assignments and grading. Test both modes, including attempts to bypass UI guards, normal/demo route scopes and settings mismatches. Do not weaken existing authentication/authorization because the initial public mode happens not to use those features.

## Source control and release promotion

`main` remains the integration branch for ongoing local product work, with ordinary feature branches merged into it. Use a long-lived `deployment` branch as the intended release-promotion point, advancing it from tested snapshots of `main` only when ready to publish. Configure hosting to deploy that branch rather than every merge to `main`. Individual feature commits/branch-size adjustments do not need to redeploy the sandbox.

Keep application code and environment configuration shared; do not accumulate a separate deployment implementation or commit environment secrets into the promotion branch. Agree CI checks, deployment triggers, commit/tag traceability and rollback before creating or wiring it. Manual promotion of a chosen commit may replace the branch if the selected hosting platform makes that simpler, but it must preserve deliberate release control. No deployment branch or automated hosting is created by this planning update.

## Deferred product work

After the practice release and initial portfolio work, continue the demo teaching-flow and genuine-account product UI audits before publicly enabling those areas. Keep the existing assignment list/settings/due-date backlog and wider QA findings. A practice-only portfolio release is not sign-off on the instructor platform, account/billing journeys or exhaustive browser/accessibility coverage.

## Branch 037 — slice 1: exposure configuration foundation

The shared contract defines `ProductExposure.Full` (`full`) and `ProductExposure.PracticeOnly` (`practice-only`), strict validation and a public metadata response containing only `productExposure`. A dedicated `@logiclab/contracts/product-exposure` entry supports API/frontend consumers without duplicating wire values.

| Setting                     | Reader behavior                                                                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API `PRODUCT_EXPOSURE`      | Missing values default to `full` outside production; `NODE_ENV=production` requires an explicit valid choice. Unknown `NODE_ENV` values are rejected rather than treated as local development. |
| Frontend `PRODUCT_EXPOSURE` | Missing values default to `full` when serving locally. Every build command requires an explicit valid choice, including builds using a custom Vite mode.                                       |

Blank, misspelled, non-string or unknown explicit values never fall back to full. Errors identify the setting without echoing its supplied value. Auth/demo/billing flags do not choose exposure implicitly. The metadata schema rejects extra fields; credentials and service settings do not belong in the later public response.

This slice adds configuration readers/contracts and tests only. They are not yet called by API startup, Vite configuration or routing: setting either variable does not restrict the running application yet, and current build commands remain unchanged. Environment examples will be updated when their consumers are wired. The API guard/bootstrap slice comes next, followed by frontend routes/providers and runtime mode-mismatch handling. No environment file, deployment branch, database or hosted resource was changed.

Validation: 28 focused contract/API/frontend configuration tests passed, covering local defaults, explicit choices, missing production configuration, invalid values, sanitized errors and the strict public metadata shape. Workspace type checks and contracts/API/frontend production builds passed; formatting and whitespace checked. No browser or database run was needed for these unconsumed configuration helpers.

## Branch 037 — slice 2: API exposure and startup

API startup now resolves `PRODUCT_EXPOSURE` before creating dependencies. Practice-only skips both normal and demo dependency factories, so account/Cognito, database, simulator/billing and demo workspace initialization do not run even if their feature flags or unused credentials are present. Full mode retains the existing feature-flag validation, initialization and shutdown behavior. Production startup rejects missing/invalid exposure before listening, with setting-only error messages.

`buildApp` also gates full-product route registration independently of startup. Supplying auth/demo/classroom/problem/assignment/student-work/billing contexts cannot register those route groups in practice-only mode. Direct resource requests return 404 without authenticating or issuing cookies. The practice-only API surface is:

- `POST /api/truth-tables/exercise`, `/api/truth-tables/check` and `/api/truth-tables/solution`.
- `GET /api/health` (existing process health semantics).
- `GET /api/product-exposure`, returning only `{ "productExposure": "practice-only" }` with `Cache-Control: no-store`; full mode reports `full`. GET routes retain Fastify's normal HEAD support.

Formula/grouping validation and existing request/resource limits remain in the unchanged practice route group. Normal/demo data and operator job commands are not modified. Root/API environment examples now document the API setting; no actual `.env` file was changed.

Frontend navigation, direct-URL guards, build-time enforcement and runtime mode agreement are the next slice. They are not wired yet: the current frontend can still display full-product links and request unavailable session routes against a practice-only API. Keep the complete hosted release pending that integration and the planned final checks; local API mode still defaults to full.

Validation: all 1,268 API tests passed, including 33 focused route/config/startup/shutdown cases run during development. HTTP tests exercise practice-only behavior with deliberately unusable resource contexts and credential-bearing requests across normal/demo resource paths. Real subprocess tests verify production practice startup and HTTP without valid full-product configuration or a database, missing/invalid-mode refusal, full-mode dependency validation and SIGTERM cleanup. API type checks, production build, formatting and whitespace passed. Temporary API processes were cleaned up. No browser or PostgreSQL workflow rerun in this backend slice; frontend integration and broader branch verification remain pending.

## Branch 037 — slice 3: frontend exposure and deployment agreement

Vite now consumes `PRODUCT_EXPOSURE`: local serving defaults to `full`, while every build requires an explicit `full` or `practice-only`, including custom modes such as staging. Supply it once in the root `.env` or shell; API startup and Vite share the setting. Other root settings are not injected into the browser. For example, `PRODUCT_EXPOSURE=full npm run check` verifies the full product. CI explicitly builds full mode through the normal check, then also builds the practice-only frontend. Invalid explicit values never fall back to full.

Before mounting application providers, the browser requests `/api/product-exposure` through the existing API transport. The response must pass the strict public schema and match the frontend build. Errors, malformed metadata and either mismatch direction show an unavailable/retry screen without mounting account/demo or practice providers. Retry is deliberate; obsolete/unmounted requests are aborted and their late responses ignored. An older API without this endpoint cannot start the new frontend; deploy matching versions.

Practice-only mounts the shared truth-table state provider and the three anonymous practice routes, with practice navigation and a practice-facing not-found page for all other URLs. It never mounts the account/demo providers. Full mode retains the previous session-scoped provider behavior, resource contexts and role guards. Both modes reuse the same practice route definitions and existing unsaved-work boundary. The full-product component loads lazily after mode agreement; this restricts runtime access, not confidentiality of shipped client source. The independent API guards remain authoritative.

Validation: all 819 web tests passed, including deployment agreement, failure/retry, stale-response cancellation, private direct URLs and absence of account/demo requests. Web type checking and both production builds passed. Actual Vite builds refused missing/invalid production settings and missing custom-staging settings. Focused headless Chrome against the built frontend and a temporary real practice-only API verified table generation, all three practice entry pages, private deep URLs, both mode-mismatch directions, no account/demo requests and no page errors. Temporary listeners/browser were cleaned up. Formatting and whitespace passed. No PostgreSQL, live account/payment or full product browser sweep was repeated; broader branch verification and final PR notes remain a later slice. No actual environment file, hosted resource or deployment branch changed.

## Branch 037 — closeout

The API/frontend exposure slices are complete. Final workspace checks, including the single-setting follow-up, passed 3,222 tests and matching production builds; the separate practice-only build and all 348 PostgreSQL checks passed. Focused Chrome verified real table endpoints, practice entry/navigation, Stay/Discard, private direct URLs, 390px containment and mode disagreement without account/demo requests. Formatting, whitespace and changed Markdown targets passed. See the [verification report](../verification/practice-only-exposure-verification.md) for exact coverage, evidence, rollout and limitations; earlier slice notes describe their state at that time.

No hosting, infrastructure or release-promotion branch was created. Next is the agreed sample/completed-example/click-through branch `038-feat-practice-sample-problems`, then reviewed sandbox preparation. Full product browser QA and the broader demo/account UI audits remain deferred. Local PR notes are prepared separately; this closeout does not publish a PR or create the next branch.

### Single exposure setting

Post-review configuration cleanup uses only root `PRODUCT_EXPOSURE` for both API startup and Vite. Shell overrides take precedence, matching Node's API environment-file behavior. Vite reads the root file with Node's parser and injects only the validated public choice; it does not add root credentials to the public environment. The obsolete separate frontend key is removed from local configuration and is no longer consumed. Local serving still defaults to full when no choice exists; production API startup and every frontend build require an explicit choice. Runtime agreement remains necessary for stale frontend artifacts or separately configured deployment processes. Restart `npm run dev` after changing the root setting.
