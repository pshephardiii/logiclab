import { useAccountContext } from './features/auth/AccountProvider';
import { AccountProvider } from './features/auth/AccountProvider';
import { PracticeProvider } from './features/truthTable/PracticeProvider';
import { AppRoutes } from './routing/AppRoutes';

export function App() {
  return (
    <AccountProvider>
      <SessionPages />
    </AccountProvider>
  );
}

function SessionPages() {
  const { demo, demoMode } = useAccountContext();
  const key = demoMode
    ? `demo:${demo.session?.workspace.id}:${demo.session?.workspace.generation}:${demo.session?.user.id}`
    : 'normal';
  return (
    <PracticeProvider key={key}>
      <AppRoutes />
    </PracticeProvider>
  );
}
