import { Page } from '../../components/layout/Page';
import { TruthTablePractice } from '../../features/truthTable/TruthTablePractice';
import { PracticeNavigation } from '../../features/practice/PracticeNavigation';

export function PracticePage() {
  return (
    <Page>
      <PracticeNavigation />
      <TruthTablePractice />
    </Page>
  );
}
