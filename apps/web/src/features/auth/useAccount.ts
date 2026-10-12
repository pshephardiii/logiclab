import { useEffect, useRef, useState } from 'react';
import { AccountApiError, accountAction, loadSession, login } from './api';
import type { SignedInUser } from './api';

export type AccountView = 'login' | 'signup' | 'confirm' | 'forgot-password' | 'reset-password';

export function useAccount() {
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [view, setView] = useState<AccountView>('login');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController(); requestRef.current = controller;
    void loadSession(controller.signal).then(value => {
      if (!controller.signal.aborted) setUser(value);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Could not check your account. Try signing in, or continue practicing.');
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => requestRef.current?.abort();
  }, []);

  function navigate(next: AccountView) { setView(next); setError(null); setNotice(null); }

  async function run(action: AccountView | 'resend' | 'logout', fields: Record<string, string>) {
    requestRef.current?.abort(); const controller = new AbortController(); requestRef.current = controller;
    setBusy(true); setError(null); setNotice(null);
    if (fields.email) setEmail(fields.email.trim().toLowerCase());
    try {
      if (action === 'login') {
        const result = await login(fields, controller.signal);
        if (!controller.signal.aborted) setUser(result);
      } else {
        const message = await accountAction(action, fields, controller.signal);
        if (controller.signal.aborted) return;
        setNotice(message);
        if (action === 'signup') setView('confirm');
        if (action === 'confirm') setView('login');
        if (action === 'forgot-password') setView('reset-password');
        if (action === 'reset-password' || action === 'logout') { setUser(null); setView('login'); }
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof AccountApiError ? caught.message : 'Could not complete the request. Please try again.');
        // Logout clears the browser cookie even when provider cleanup fails.
        if (action === 'logout') {
          try {
            const currentUser = await loadSession(controller.signal);
            if (!controller.signal.aborted) setUser(currentUser);
          } catch { if (!controller.signal.aborted) setUser(null); }
        }
      }
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return { user, view, email, busy, error, notice, navigate, run };
}
