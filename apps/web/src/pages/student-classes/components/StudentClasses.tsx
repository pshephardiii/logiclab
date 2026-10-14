import { ClassroomPanel } from '../../../features/classroom/components/ClassroomPanel';
import { JoinClassForm } from './JoinClassForm';
import { useStudentClasses } from '../useStudentClasses';

export function StudentClasses() {
  const state = useStudentClasses();
  return (
    <ClassroomPanel
      headingId="student-classes-heading"
      eyebrow="LogicLab / Student"
      title="My classes"
      listTitle="Enrolled classes"
      busy={state.busy}
      error={state.error}
      notice={state.notice}
      classrooms={state.classrooms}
      nextOffset={state.nextOffset}
      onReload={() => void state.run('list')}
      onMore={() => void state.run('more')}
      emptyMessage="You have not joined any classes yet."
    >
      <JoinClassForm busy={state.busy} onJoin={code => state.run('join', code)} />
    </ClassroomPanel>
  );
}
