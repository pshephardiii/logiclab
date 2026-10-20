import { useEffect, useState } from 'react';
import {
  demoAction,
  endDemo,
  loadDemoSession,
  type DemoSessionResponse,
} from '../../../api/demo/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Restore and rotate the server cookie; no demo tokens or resource data enter browser storage. */
export function useDemo(enabled: boolean) {
  const [session, setSession] = useState<DemoSessionResponse | null>(null);
  const [busy, setBusy] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const { startRequest, cancelRequest } = useAbortableRequest();
  useEffect(() => {
    if (!enabled) {
      cancelRequest();
      setBusy(false);
      return;
    }
    const signal = startRequest();
    setBusy(true);
    void loadDemoSession(signal)
      .then((current) => {
        if (!signal.aborted) {
          setSession(current);
          setError(null);
        }
      })
      .catch(() => {
        if (!signal.aborted) setError('Could not restore your demo. Please try again.');
      })
      .finally(() => {
        if (!signal.aborted) setBusy(false);
      });
    return cancelRequest;
  }, [enabled, startRequest, cancelRequest]);
  async function run(
    action: 'start' | 'role' | 'reset' | 'logout',
    role?: 'student' | 'instructor',
  ) {
    const signal = startRequest();
    setBusy(true);
    setError(null);
    try {
      if (action === 'logout') {
        await endDemo(signal);
        if (!signal.aborted) setSession(null);
      } else {
        const current = await demoAction(action, signal, role);
        if (!signal.aborted) setSession(current);
      }
      return !signal.aborted;
    } catch (caught) {
      if (!signal.aborted) {
        // Rotation/reset may have committed even if the response was lost. Reconcile before retrying.
        try {
          const current = await loadDemoSession(signal);
          if (!signal.aborted) setSession(current);
        } catch {
          /* Keep the previous state until a retry succeeds. */
        }
        if (!signal.aborted)
          setError(
            caught instanceof Error ? caught.message : 'Demo request failed. Please try again.',
          );
      }
      return false;
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return { session, busy, error, run };
}
