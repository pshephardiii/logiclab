import type { AccountView } from '../useAccount';

type Props = {
  view: AccountView; email: string; busy: boolean;
  onSubmit: (fields: Record<string, string>) => Promise<void>;
  onResend: (email: string) => Promise<void>;
};
const titles: Record<AccountView, string> = {
  login: 'Sign in', signup: 'Create account', confirm: 'Confirm email',
  'forgot-password': 'Send reset code', 'reset-password': 'Reset password',
};

export function AccountForm({ view, email, busy, onSubmit, onResend }: Props) {
  const needsPassword = ['login', 'signup', 'reset-password'].includes(view);
  const newPassword = view !== 'login';
  const needsCode = view === 'confirm' || view === 'reset-password';
  return (
    <form className="account-form" onSubmit={event => {
      event.preventDefault(); const form = event.currentTarget;
      const fields = Object.fromEntries(new FormData(form)) as Record<string, string>;
      void onSubmit(fields).finally(() => {
        const password = form.querySelector<HTMLInputElement>('input[type="password"]');
        if (password) password.value = '';
      });
    }}>
      <fieldset disabled={busy}>
        <label htmlFor="account-email">Email</label>
        <input id="account-email" name="email" type="email" defaultValue={email} required maxLength={254} autoComplete="email" />
        {view === 'signup' && <>
          <label htmlFor="account-role">Account role</label>
          <select id="account-role" name="role" defaultValue="student">
            <option value="student">Student</option><option value="instructor">Instructor</option>
          </select>
          <p className="help">Choose your role when creating your account. An instructor preview does not create a student account.</p>
        </>}
        {needsCode && <>
          <label htmlFor="account-code">Email code</label>
          <input id="account-code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" />
        </>}
        {needsPassword && <>
          <label htmlFor="account-password">{newPassword ? 'New password' : 'Password'}</label>
          <input id="account-password" name="password" type="password" required minLength={newPassword ? 12 : 1} maxLength={128}
            autoComplete={newPassword ? 'new-password' : 'current-password'} aria-describedby={newPassword ? 'password-help' : undefined} />
          {newPassword && <p id="password-help" className="help">Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.</p>}
        </>}
        <div className="practice-actions">
          <button type="submit">{busy ? 'Please wait…' : titles[view]}</button>
          {view === 'confirm' && <button type="button" className="secondary" onClick={event => {
            const form = event.currentTarget.form!;
            const input = form.querySelector<HTMLInputElement>('input[name="email"]')!;
            if (input.reportValidity()) void onResend(input.value);
          }}>Resend code</button>}
        </div>
      </fieldset>
    </form>
  );
}
