import { useAccountPath } from '../../routing/hooks/useAccountPath';
import { useState } from 'react';
import { Link } from 'react-router';
import { Page } from '../../components/layout/Page';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { ClassSelection } from '../../features/classroom/components/ClassSelection';
import { listClassrooms } from '../../api/classrooms/api';
import { ClassBilling } from './components/ClassBilling';
import './instructor-billing.css';

function InstructorBilling() {
  const accountPath = useAccountPath();
  const [classId, setClassId] = useState('');
  return (
    <>
      <header>
        <p className="eyebrow">LogicLab / Instructor</p>
        <h1>Class billing</h1>
        <p>
          <strong>Simulation only — no real charges.</strong> Do not enter payment details.
        </p>
        <p>
          Choose a class to manage one-time publishing coverage. Institution subscriptions are
          planned for later.
        </p>
      </header>
      <ClassSelection
        value={classId}
        onChange={setClassId}
        loadPage={listClassrooms}
        emptyMessage={<Link to={accountPath('/classes')}>Create a class first</Link>}
      />
      <p className="help">
        Reload billing after an uncertain outcome. Switching classes or leaving this page cancels
        browser requests, but server processing may continue; inspect purchase history before
        starting another checkout.
      </p>
      {classId && <ClassBilling key={classId} classId={classId} />}
    </>
  );
}
export function InstructorBillingPage() {
  const { user } = useAccountContext();
  return (
    <Page>
      <InstructorBilling key={user?.id} />
    </Page>
  );
}
