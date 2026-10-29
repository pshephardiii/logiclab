# Development processes and shutdown

Run `npm run dev` from the repository root. It starts the shared-package compilers, Vite and the API. The API uses Node's native `--watch` mode with `tsx` as its TypeScript loader. Changes to imported source or compiled dependencies restart the API; an initial shared-package build can also cause a restart.

After changing the dev launcher, stop the existing session and run `npm run dev` again. An already-running watcher does not adopt package-script edits.

## Stopping the API

Press Ctrl+C in the terminal running development. SIGINT and SIGTERM request one cleanup attempt: the API closes its listener and shared dependencies. Repeated signals do not duplicate cleanup or extend its deadline. A signal during initialization prevents subsequent startup stages from opening a listener once initialization returns.

Healthy shutdown exits naturally. If initialization, cleanup or a leftover handle keeps the API alive, a ten-second deadline prints `API shutdown exceeded 10 seconds; forcing exit.` and exits with status 1. Cleanup failures print `API shutdown failed.` and set a failure exit status. The deadline belongs to the API process; it is not a general timeout for every compiler or frontend process in the root launcher.

If development gets stuck, inspect the specific process tree and listening ports before terminating anything. Avoid `killall node`, which can stop unrelated projects and editor tooling.

## Why the watcher changed

A local investigation reproduced a shutdown failure in the installed `tsx` CLI watcher (4.23.15): after its child had already exited by signal, the watcher could wait for an exit event that had already happened. Node's native watcher exited correctly in the same case. The original incident's child-exit trigger was not captured, so this reproduction identifies a matching failure mode rather than proving what initially killed that child.

The API script now uses `node --watch --import tsx`; environment-file loading is retained. No dependency upgrade or lockfile change is required.

Verification included native reloads for TypeScript and compiled dependencies, actual API startup/health/shutdown, watcher termination after a deliberately killed test child, bounded hung cleanup and leftover handles, and shutdown during delayed or blocked initialization. Temporary process fixtures used isolated ports and no database or external identity/payment calls. The API test suite includes a process regression using the actual dev script with application startup and environment-file loading removed, plus unit coverage for the shutdown deadline.
