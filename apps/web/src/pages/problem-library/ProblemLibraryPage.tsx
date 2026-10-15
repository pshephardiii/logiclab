import { Page } from '../../components/layout/Page';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { ProblemLibrary } from './components/ProblemLibrary';

export function ProblemLibraryPage() {
  const { user } = useAccountContext();
  return (
    <Page>
      <ProblemLibrary key={user?.id} />
    </Page>
  );
}
