export const API_SHUTDOWN_TIMEOUT_MS = 10_000;

type Options = {
  close: () => Promise<void>;
  onError: () => void;
  onTimeout: () => void;
  forceExit: (code: number) => void;
  timeoutMs?: number;
};

/** One cleanup attempt; the unref'ed deadline also catches handles left open after cleanup. */
export function createShutdownHandler({
  close,
  onError,
  onTimeout,
  forceExit,
  timeoutMs = API_SHUTDOWN_TIMEOUT_MS,
}: Options) {
  let closing = false;
  return () => {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => {
      onTimeout();
      forceExit(1);
    }, timeoutMs);
    // Healthy shutdown exits naturally. A leftover socket/timer cannot keep it alive forever.
    deadline.unref();
    void Promise.resolve()
      .then(close)
      .catch(() => onError());
  };
}
