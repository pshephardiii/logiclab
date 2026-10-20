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
  const workspaceId = demo.session?.workspace.id;
  const generation = demo.session?.workspace.generation;
  const userId = demo.session?.user.id;

  // Reset page state when the demo workspace, reset generation, or selected user changes.
  const demoSessionKey = `demo:${workspaceId}:${generation}:${userId}`;
  const pageSessionKey = demoMode ? demoSessionKey : 'normal';

  return (
    <PracticeProvider key={pageSessionKey}>
      <AppRoutes />
    </PracticeProvider>
  );
}
