import { useLocation } from 'react-router';
import { useDemo } from '../demo/hooks/useDemo';
import { isDemoPath } from '../../routing/demo-path';
import { createContext, useContext, type ReactNode } from 'react';
import { useAccount } from './hooks/useAccount';

type AccountState = ReturnType<typeof useAccount> & {
  demo: ReturnType<typeof useDemo>;
  demoMode: boolean;
};
const AccountContext = createContext<AccountState | null>(null);
/**
 * Shares one account workflow across pages, navigation, and access guards.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const demoMode = isDemoPath(useLocation().pathname);
  const demo = useDemo(demoMode);
  const current = {
    ...account,
    ...(demoMode ? { user: demo.session?.user ?? null, busy: demo.busy } : {}),
    demo,
    demoMode,
  };
  return <AccountContext.Provider value={current}>{children}</AccountContext.Provider>;
}

export function useAccountContext() {
  const account = useContext(AccountContext);
  if (!account) throw new Error('AccountProvider is required.');
  return account;
}
