# Dependency installation and script policy

Use Node 24.9+ and **npm 11.19.0+** from the repository root. The npm minimum is recorded in package.json because older clients must not be assumed to honor this install-script policy. An engine warning is not a substitute for checking `npm --version`.

Run `npm ci` for a reproducible install from package-lock.json. Root package.json records `allowScripts` decisions; root `.npmrc` enables `strict-allow-scripts=true`. Unreviewed dependency install scripts fail installation instead of becoming an overlooked warning. These are project settings, not global npm settings. Explicit `npm run` project commands still run normally.

## Reviewed decisions

Reviewed October 27, 2026 against the installed, lockfile-pinned sources:

| Package              | Decision              | Reviewed behavior and reason                                                                                                                                                                                                                   |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| esbuild@0.28.2       | Approve exact version | install.js prepares/optimizes and checks the platform binary. Normally uses the matching optional package; missing binaries can trigger an npm/registry fallback. Needed for predictable tooling setup.                                        |
| unrs-resolver@1.12.2 | Approve exact version | postinstall.js calls napi-postinstall@0.3.4 to locate the platform binding. Missing optional bindings can trigger package-manager/registry fallback. Review helper changes as well as the top-level script.                                    |
| @parcel/watcher      | Deny install scripts  | The reviewed 2.6.0 script only invokes node-gyp when npm_config_build_from_source=true. The supported setup uses its prebuilt optional platform binding and does not need this hook.                                                           |
| fsevents             | Deny install scripts  | The reviewed 2.3.3 package is macOS-only and ships fsevents.node; its installed package has no explicit install hook or binding.gyp. npm still marks it as install-script-bearing. No installation-time build is needed in the verified setup. |

Approvals are version-pinned, so upgrading those versions requires a new decision. Denials apply by package name and remain until explicitly changed. Denial does not mean a package was found malicious; it means this setup does not require its install code. Do not blanket-approve all packages or use a blanket script-execution bypass.

Native smoke checks on this Mac verified esbuild TypeScript transformation, unrs React resolution, and start/stop subscriptions for both watcher packages with their install hooks denied. Linux/Windows install behavior and source-build-only platforms were not exercised locally. Revisit the watcher denial deliberately if supporting a platform without the supplied prebuilt bindings or opting into source builds.

## When an upgrade introduces a pending script

1. Read the npm error and run `npm install-scripts ls --json` from the root.
2. Inspect the exact package script and any helper it invokes, the parent dependency, lockfile version/integrity, optional binaries, network fallbacks and filesystem/process effects. Do not infer safety from the package name alone.
3. For a reviewed necessary script, run `npm install-scripts approve <package-name>`; npm writes the installed version pin. For unnecessary code, use `npm install-scripts deny <package-name>`. Existing explicit denials take precedence; changing one requires an intentional policy edit.
4. Review package.json and lockfile changes. Update this decision table when behavior/version changes; do not approve merely to silence CI.
5. Run `npm ci`, then `npm install-scripts ls --json`, `npm audit`, and the relevant project checks. A normal successful policy check has no pending entries. An explicit denial is a completed decision, not a pending approval.
6. Record results and limitations in the QA ledger or PR. Commit the policy with the dependency change that needs it.

A deliberate `--ignore-scripts` install can stage package files for inspection, but it does not verify normal installation. Do not add it permanently to CI just to evade a review failure.

## Remaining warning and verification

The compatible security updates in QA-001 produced zero audit findings. The glob@10.5.0 deprecation remains through the current babel-plugin-istanbul → test-exclude dependency range; a newer test-exclude major is not yet supported by that parent. This warning is separate from script approvals and is not suppressed by this policy.

QA-002 verified a normal clean install: only esbuild and unrs postinstall hooks ran, no pending decisions remained, audit reported zero vulnerabilities, and all 700 tests/type checks/builds passed. A temporary offline fixture missing the esbuild approval failed with ESTRICTALLOWSCRIPTS. Source hashes, install/audit output, native smoke and negative-gate evidence are local under `.codex-local/qa/QA-RUN-002-install-policy/`. No remote CI or manual browser pass is claimed.

Reference: [npm install-script policy commands](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/).
