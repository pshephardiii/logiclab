import { useConfirmDiscard } from '../../features/unsaved-work/hooks/useConfirmDiscard';
import { useState } from 'react';
import { Page } from '../../components/layout/Page';
import { useAccountContext } from '../../features/auth/AccountProvider';
import { ClassSelector } from './components/ClassSelector';
import { ClassAssignments } from './components/ClassAssignments';
import './instructor-assignments.css';

function InstructorAssignments() {
  const [classId, setClassId] = useState('');
  const confirmDiscard = useConfirmDiscard();
  return (
    <>
      <header>
        <p className="eyebrow">LogicLab / Instructor</p>
        <h1>Assignments</h1>
        <p>
          Build class assignments from saved problem publications, then publish to lock their
          content and policy.
        </p>
      </header>
      <ClassSelector
        value={classId}
        onChange={(id) => {
          if (id !== classId) confirmDiscard(() => setClassId(id));
        }}
      />
      {classId && <ClassAssignments key={classId} classId={classId} />}
    </>
  );
}

export function InstructorAssignmentsPage() {
  const { user } = useAccountContext();
  return (
    <Page>
      <InstructorAssignments key={user?.id} />
    </Page>
  );
}
