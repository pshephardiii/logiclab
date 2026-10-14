import { useAbortableRequest } from '../../../hooks/useAbortableRequest';
import { useEffect, useState } from 'react';
import { AccountApiError } from '../../../api/errors';
import { accountAction, loadSession, login } from '../../../api/auth/api';
import type { SignedInUser } from '../../../api/auth/api';

export type AccountView = 'login' | 'signup' | 'confirm' | 'forgot-password' | 'reset-password';

/**
 * Manages session restoration and account-form workflows for the shared account provider.
 * Keeps recovery/signup transitions and logout reconciliation alongside request state.
 */
export function useAccount() {
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [view, setView] = useState<AccountView>('login');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { startRequest } = useAbortableRequest();

  useEffect(() => {
    const signal = startRequest();
    async function restoreSession() {
      try {
        const currentUser = await loadSession(signal);
        if (!signal.aborted) setUser(currentUser);
      } catch {
        if (!signal.aborted) setError('Could not check your account. Try signing in, or continue practicing.');
      } finally {
        if (!signal.aborted) setBusy(false);
      }
    }
    void restoreSession();
  }, [startRequest]);

  function navigate(next: AccountView) {
    setView(next);
    setError(null);
    setNotice(null);
  }

  function applyAccountAction(action: AccountView | 'resend' | 'logout', message: string) {
    setNotice(message);
    if (action === 'signup') setView('confirm');
    if (action === 'confirm') setView('login');
    if (action === 'forgot-password') setView('reset-password');
    if (action === 'reset-password' || action === 'logout') {
      setUser(null);
      setView('login');
    }
  }

  async function reconcileLogout(signal: AbortSignal) {
    // Logout clears the browser cookie even when provider cleanup fails.
    try {
      const currentUser = await loadSession(signal);
      if (!signal.aborted) setUser(currentUser);
    } catch {
      if (!signal.aborted) setUser(null);
    }
  }

  async function run(action: AccountView | 'resend' | 'logout', fields: Record<string, string>) {
    const signal = startRequest();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (fields.email) setEmail(fields.email.trim().toLowerCase());
    try {
      if (action === 'login') {
        const result = await login(fields, signal);
        if (!signal.aborted) setUser(result);
      } else {
        const message = await accountAction(action, fields, signal);
        if (signal.aborted) return;
        applyAccountAction(action, message);
      }
    } catch (caught) {
      if (!signal.aborted) {
        setError(caught instanceof AccountApiError ? caught.message : 'Could not complete the request. Please try again.');
        if (action === 'logout') await reconcileLogout(signal);
      }
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return { user, view, email, busy, error, notice, navigate, run };
}
