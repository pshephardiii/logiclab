import { TruthTablePractice } from './features/truthTable/TruthTablePractice';
import { AccountPanel } from './features/auth/AccountPanel';
import { useAccount } from './features/auth/useAccount';
import { useState } from 'react';

export function App() {
  const account = useAccount();
  const [page, setPage] = useState<'practice' | 'account'>('practice');
  return <>
    <nav className="app-nav" aria-label="Main navigation">
      <button className="text-button" aria-current={page === 'practice' ? 'page' : undefined} onClick={() => setPage('practice')}>Practice</button>
      <button className="text-button" aria-current={page === 'account' ? 'page' : undefined} onClick={() => setPage('account')}>
        {account.user ? `Account · ${account.user.role}` : 'Sign in / Create account'}
      </button>
    </nav>
    <div hidden={page !== 'practice'}><TruthTablePractice /></div>
    {page === 'account' && <AccountPanel account={account} />}
  </>;
}
