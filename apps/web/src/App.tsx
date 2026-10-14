import { AccountProvider } from './features/auth/AccountProvider';
import { PracticeProvider } from './features/truthTable/PracticeProvider';
import { AppRoutes } from './routing/AppRoutes';

export function App() {
  return <AccountProvider>
    <PracticeProvider>
      <AppRoutes />
    </PracticeProvider>
  </AccountProvider>;
}
