import { useConfirmDiscard } from '../../features/unsaved-work/hooks/useConfirmDiscard';
import { useResourceApi } from '../../api/ResourceApiProvider';
import { useAccountPath } from '../../routing/hooks/useAccountPath';
import { useState } from 'react';
import { Link } from 'react-router';
import { Page } from '../../components/layout/Page';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { ClassSelection } from '../../features/classroom/components/ClassSelection';
import * as enrollmentsApi from '../../api/enrollments/api';
import { routeDefinitions } from '../../routing/route-definitions';
import { StudentAssignments } from './components/StudentAssignments';
import '../../features/assignment/assignment.css';

function StudentWork() {
  const { listEnrollments } = useResourceApi(enrollmentsApi);
  const accountPath = useAccountPath();
  const confirmDiscard = useConfirmDiscard();
  const [classId, setClassId] = useState('');
  return (
    <>
      <header>
        <p className="eyebrow">LogicLab / Student</p>
        <h1>Assigned work</h1>
        <p>
          Choose a class to work on published assignments, save answers, and submit your final work.
        </p>
      </header>
      <ClassSelection
        value={classId}
        onChange={(id) => {
          if (id !== classId) confirmDiscard(() => setClassId(id));
        }}
        loadPage={listEnrollments}
        emptyMessage={
          <>
            You have not joined a class yet.{' '}
            <Link to={accountPath(routeDefinitions.studentClasses.path)}>Join a class</Link>
          </>
        }
      />
      {classId && <StudentAssignments key={classId} classId={classId} />}
    </>
  );
}
export function StudentWorkPage() {
  const { user } = useAccountContext();
  return (
    <Page>
      <StudentWork key={user?.id} />
    </Page>
  );
}
