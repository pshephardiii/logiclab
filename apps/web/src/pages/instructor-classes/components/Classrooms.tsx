import { ClassroomPanel } from '../../../features/classroom/components/ClassroomPanel';
import { ClassroomInvitation } from './ClassroomInvitation';
import { ClassroomForm } from './ClassroomForm';
import { useClassrooms } from '../useClassrooms';

export function Classrooms() {
  const state = useClassrooms();
  return (
    <ClassroomPanel
      headingId="classes-heading"
      eyebrow="LogicLab / Instructor"
      title="Your classes"
      listTitle="Owned classes"
      busy={state.busy}
      error={state.error}
      notice={state.notice}
      classrooms={state.classrooms}
      nextOffset={state.nextOffset}
      onReload={() => void state.run('list')}
      onMore={() => void state.run('more')}
      renderActions={classroom => <ClassroomInvitation classId={classroom.id} className={classroom.name} />}
    >
      <ClassroomForm busy={state.busy} onCreate={name => state.run('create', name)} />
    </ClassroomPanel>
  );
}
