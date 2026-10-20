import type { JobHandler } from '../types';

/** Deletes one bounded batch. Retries are safe even if deletion committed before history did. */
export function createDemoCleanupHandler(
  cleanup: (signal: AbortSignal) => Promise<{ removed: number }>,
): JobHandler {
  return async ({ signal }) => {
    signal.throwIfAborted();
    const { removed } = await cleanup(signal);
    return { recordsChecked: removed, findings: [] };
  };
}
