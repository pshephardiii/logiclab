import { Page } from '../../components/layout/Page';
import { StudentClasses } from './components/StudentClasses';
import { useAccountContext } from '../../features/auth/AccountProvider';

export function StudentClassesPage() {
  const account = useAccountContext();

  return (
    <Page className="classes-page">
      <StudentClasses key={account.user?.id} />
    </Page>
  );
}
