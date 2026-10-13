import { AccountProvider } from './features/auth/AccountProvider';
import { PracticeProvider } from './features/truthTable/PracticeProvider';
import { Navigation } from './components/Navigation';
import { AppRoutes } from './routing/AppRoutes';

export function App() {
  return <AccountProvider>
    <PracticeProvider>
      <Navigation />
      <AppRoutes />
    </PracticeProvider>
  </AccountProvider>;
}
