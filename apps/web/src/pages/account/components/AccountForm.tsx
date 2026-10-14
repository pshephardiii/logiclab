import { PasswordFields } from './PasswordFields';
import type { FormEvent, MouseEvent } from 'react';
import type { AccountView } from '../../../features/auth/hooks/useAccount';

type Props = {
  view: AccountView;
  email: string;
  busy: boolean;
  onSubmit: (fields: Record<string, string>) => Promise<void>;
  onResend: (email: string) => Promise<void>;
};

const titles: Record<AccountView, string> = {
  login: 'Sign in',
  signup: 'Create account',
  confirm: 'Confirm email',
  'forgot-password': 'Send reset code',
  'reset-password': 'Reset password',
};

/**
 * Renders fields for the selected account workflow and delegates submission to its caller.
 * Password fields are cleared after each submitted request settles.
 */
export function AccountForm({ view, email, busy, onSubmit, onResend }: Props) {
  const needsPassword = ['login', 'signup', 'reset-password'].includes(view);
  const newPassword = view !== 'login';
  const needsCode = view === 'confirm' || view === 'reset-password';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form)) as Record<string, string>;
    void onSubmit(fields).finally(() => {
      const password = form.querySelector<HTMLInputElement>('input[type="password"]');
      if (password) password.value = '';
    });
  }

  function handleResend(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form!;
    const input = form.querySelector<HTMLInputElement>('input[name="email"]')!;
    if (input.reportValidity()) void onResend(input.value);
  }

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <fieldset disabled={busy}>
        <label htmlFor="account-email">Email</label>
        <input
          id="account-email"
          name="email"
          type="email"
          defaultValue={email}
          required
          maxLength={254}
          autoComplete="email"
        />
        {view === 'signup' && (
          <>
            <label htmlFor="account-role">Account role</label>
            <select id="account-role" name="role" defaultValue="student">
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
            <p className="help">
              Choose your role when creating your account. An instructor preview does not create a
              student account.
            </p>
          </>
        )}
        {needsCode && (
          <>
            <label htmlFor="account-code">Email code</label>
            <input
              id="account-code"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
            />
          </>
        )}
        {needsPassword && <PasswordFields newPassword={newPassword} />}
        <div className="action-row">
          <button type="submit">{busy ? 'Please wait…' : titles[view]}</button>
          {view === 'confirm' && (
            <button type="button" className="secondary" onClick={handleResend}>
              Resend code
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
