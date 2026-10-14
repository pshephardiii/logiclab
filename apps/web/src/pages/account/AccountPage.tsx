import { Page } from '../../components/layout/Page';
import { AccountPanel } from './components/AccountPanel';
import { useAccountContext } from '../../features/auth/AccountProvider';

export function AccountPage() {
  const account = useAccountContext();
  return <Page className="account-page"><AccountPanel account={account} /></Page>;
}
