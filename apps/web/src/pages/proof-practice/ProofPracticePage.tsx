import { PracticeNavigation } from '../../features/practice/PracticeNavigation';
import { Page } from '../../components/layout/Page';
import { ProofPractice } from './components/ProofPractice';

export function ProofPracticePage() {
  return (
    <Page>
      <PracticeNavigation />
      <ProofPractice />
    </Page>
  );
}
