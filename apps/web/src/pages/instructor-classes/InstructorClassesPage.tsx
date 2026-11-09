import { Page } from '../../components/layout/Page';
import { Classrooms } from './components/Classrooms';
import { useAccountContext } from '../../features/auth/AccountProvider';

export function InstructorClassesPage() {
  const account = useAccountContext();

  return (
    <Page className="classes-page">
      <Classrooms key={account.user?.id} />
    </Page>
  );
}
