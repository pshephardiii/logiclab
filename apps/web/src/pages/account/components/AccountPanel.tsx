import { AccountForm } from './AccountForm';
import type { useAccount, AccountView } from '../../../features/auth/hooks/useAccount';

type Props = { account: ReturnType<typeof useAccount> };
const headings: Record<AccountView, string> = {
  login: 'Welcome back',
  signup: 'Join LogicLab',
  confirm: 'Check your email',
  'forgot-password': 'Recover your account',
  'reset-password': 'Choose a new password',
};

/**
 * Composes account status, workflow navigation, and forms from provider-owned state.
 */
export function AccountPanel({ account }: Props) {
  return (
    <>
      <section className="panel" aria-labelledby="account-heading" aria-busy={account.busy}>
        <p className="eyebrow">LogicLab / Your account</p>
        <h1 id="account-heading">{account.user ? 'You’re signed in' : headings[account.view]}</h1>
        {account.error && (
          <p className="error" role="alert">
            {account.error}
          </p>
        )}
        {account.notice && <p role="status">{account.notice}</p>}
        {account.user ? (
          <>
            <p>
              Account role: <strong>{account.user.role}</strong>.
            </p>
            <button disabled={account.busy} onClick={() => void account.run('logout', {})}>
              Sign out
            </button>
          </>
        ) : (
          <>
            {(account.view === 'confirm' || account.view === 'reset-password') && (
              <p>Enter the six-digit code from your email.</p>
            )}
            <AccountForm
              key={account.view}
              view={account.view}
              email={account.email}
              busy={account.busy}
              onSubmit={(fields) => account.run(account.view, fields)}
              onResend={(email) => account.run('resend', { email })}
            />
            <div className="account-links">
              {(['login', 'signup', 'confirm', 'forgot-password'] as const)
                .filter((view) => view !== account.view)
                .map((view) => (
                  <button
                    className="text-button"
                    key={view}
                    disabled={account.busy}
                    onClick={() => account.navigate(view)}
                  >
                    {
                      {
                        login: 'Sign in',
                        signup: 'Create account',
                        confirm: 'Confirm email',
                        'forgot-password': 'Forgot password?',
                      }[view]
                    }
                  </button>
                ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
