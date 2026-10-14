import { createContext, useContext, type ReactNode } from 'react';
import { useAccount } from './hooks/useAccount';
const AccountContext = createContext<ReturnType<typeof useAccount> | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
export function useAccountContext() {
  const account = useContext(AccountContext);
  if (!account) throw new Error('AccountProvider is required.');
  return account;
}
