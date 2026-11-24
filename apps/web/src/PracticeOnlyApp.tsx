import { PracticeProvider } from './features/truthTable/PracticeProvider';
import { PracticeRoutes } from './routing/PracticeRoutes';

export function PracticeOnlyApp() {
  return (
    <PracticeProvider>
      <PracticeRoutes />
    </PracticeProvider>
  );
}
