# Practice-only exposure verification

Branch: `037-feat-practice-only-exposure`

Final verification: November 24, 2026.

## Resulting behavior

The initial portfolio sandbox can expose only anonymous truth-table, Fitch/dependency and semantic-tableaux practice while retaining the full local product. Shared validated exposure values control API startup/registration and frontend composition independently. Practice-only API startup skips normal/demo dependency creation, including database/account/payment initialization. Supplying private contexts or retained cookies cannot restore the omitted resource routes.

Before mounting application providers, the frontend validates public `/api/product-exposure` metadata and requires agreement with its build. Either mismatch direction, malformed metadata or request failure blocks startup with manual retry. Practice-only mounts no account/demo providers and routes private/unknown URLs to a practice-facing not-found page. Full mode preserves session-scoped practice state, resource contexts and role guards. Existing practice editors/checkers and navigation protection remain shared.

## Final checks

| Check                                                        | Result                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `PRODUCT_EXPOSURE=full npm run check`                        | Passed: workspace types, 3,222 tests (1,133 engine, 1,268 API, 821 web), production builds |
| `npm run build -w @logiclab/web` (shared root configuration) | Passed                                                                                     |
| `npm run db:test`                                            | Passed: 348 PostgreSQL checks (184 database, 164 API/workflow)                             |
| `npm run format:check`                                       | Passed                                                                                     |
| Working-tree and branch whitespace                           | Passed                                                                                     |
| Changed local Markdown file targets                          | Passed                                                                                     |

The sandbox initially denied database connections and temporary API/watcher listeners. The full check and database suite were rerun with local permissions and passed. Those initial failures were environment restrictions, not counted as passing runs. PostgreSQL workflows used the configured disposable test database and existing isolated fixtures; no application database was reset or migrated. Existing Jest VM-module advisories remain.

Configuration tests cover local defaults, explicit full/restricted choices, missing production settings, invalid/blank values, unknown API environment names and sanitized errors. Before the single-setting cleanup, actual Vite builds also rejected missing/invalid production settings and a missing custom-staging setting. After cleanup, an actual staging build rejected an invalid shared override; missing-file/build-choice behavior is covered by configuration tests. HTTP tests verify the public allowlist, strict uncached metadata, existing formula/resource validation, full-mode authenticated registration and credential-bearing private requests across methods. Unusable resource contexts prove private plugins are not registered. Real startup subprocesses prove practice-only serves without valid full-product configuration or a database, production errors refuse to listen, full mode retains dependency validation and temporary processes stop.

Frontend tests cover agreement gating, both mismatches, malformed metadata, HTTP/network/JSON errors, manual retry, abort/late-response handling, anonymous routes and direct private paths without account/demo providers or session requests. The full existing web suite also passes. The single-setting follow-up reran the complete workspace check and both builds; its added tests cover Node environment-file parsing, shell precedence, missing root configuration and ignoring the obsolete frontend key. Vite does not mutate the public environment with root credentials. The PostgreSQL result above predates this configuration-only follow-up and was not repeated.

## Focused browser checks

Headless local Chrome used both real production frontend artifacts and a temporary real practice-only API. It verified:

- Truth-table creation, checking and solution requests through the real anonymous API.
- Entry to truth tables, derivations and truth trees with practice navigation.
- Proof setup navigation: Stay retains the entered conclusion; Discard permits navigation to truth trees.
- Account/demo/classes/library/assignment/student-work/billing deep URLs show the not-found page without private navigation or account/demo requests.
- Full frontend versus practice-only API blocks startup. Practice-only frontend versus a synthetic full metadata response also blocks startup. The latter tests disagreement only; it is not a complete full-product backend journey.
- Entry-page containment at 390px and screenshots of the table/proof/tree pages, plus the desktop table.
- No uncaught page errors; API requests were limited to exposure metadata and anonymous truth-table endpoints.

Temporary Chrome and HTTP/API listeners were cleaned up. Local scripts, logs and screenshots are ignored evidence in `.codex-local/verification/practice-only-exposure/`, not committed browser CI. The script expects a saved full artifact at `/private/tmp/exposure-full-dist` and a current practice-only artifact in `apps/web/dist`. The final local artifact is practice-only; rebuild explicitly for the mode you intend to preview.

## Rollout and limits

No migration, database JSON change or new external dependency. Rebuild matching contracts/API/frontend. For the initial sandbox, set `PRODUCT_EXPOSURE=practice-only` and `NODE_ENV=production` on API startup, and use that same setting when building the frontend. Full builds use `PRODUCT_EXPOSURE=full`. API startup and Vite read the same root `.env`, with shell values taking precedence. Vite injects only the validated exposure value; other root settings stay private. Every build requires an explicit choice. Restart the API and rebuild the frontend to change modes.

Deploy compatible API/frontend versions: an older API without the metadata endpoint cannot start this frontend. The metadata request is a startup agreement check, not continuous polling. Server registration guards remain authoritative. The full product's client code may remain in shipped assets; runtime exclusion is not source confidentiality. Explicit operator CLI commands are outside the HTTP startup guard. Existing request/resource limits are unchanged; this work does not select hosting or add deployment-specific traffic controls.

This is focused exposure verification, not exhaustive product QA or a hosted-release sign-off. No fresh clean installation, remote CI query, hosted deployment, live Cognito/email/payment verification, load/soak run or accessibility/browser matrix was performed. Matching full-product browser journeys were not repeated; existing automated full-product/API/database workflows passed. No infrastructure, deployment branch or external messages were created.

Next: proposed `038-feat-practice-sample-problems`, covering curated samples, verified separate completed examples and a click-through layer before reviewed sandbox preparation. See the [sample plan](../planning/practice-sample-problems.md), [release plan](../planning/practice-first-release.md) and [exposure API](../api/product-exposure-api.md).

The final shared-setting browser smoke repeated the focused checks above after building directly from root configuration, without a frontend-specific exposure override. Its logs use `single-setting-` filenames in the existing ignored evidence directory. Local exposure settings were updated at the user's request without displaying their values; the obsolete duplicate frontend setting was removed. Changing the root setting requires restarting development processes, and production frontend artifacts still require rebuilding.
