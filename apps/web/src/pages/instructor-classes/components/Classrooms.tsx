import { ClassroomInvitation } from './ClassroomInvitation';
import { useClassrooms } from '../useClassrooms';
import { ClassroomForm } from './ClassroomForm';
import { ClassroomList } from '../../../features/classroom/components/ClassroomList';
export function Classrooms() {
  const state = useClassrooms();
  return <>
    <section className="panel" aria-labelledby="classes-heading" aria-busy={state.busy}>
      <p className="eyebrow">LogicLab / Instructor</p>
      <h1 id="classes-heading">Your classes</h1>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
      <ClassroomForm busy={state.busy} onCreate={name => state.run('create', name)} />
      <h2>Owned classes</h2>
      <button className="text-button" disabled={state.busy} onClick={() => void state.run('list')}>Reload classes</button>
      {state.busy && <p role="status">Loading…</p>}
      <ClassroomList classrooms={state.classrooms} busy={state.busy} nextOffset={state.nextOffset} onMore={() => void state.run('more')}
        renderActions={classroom => <ClassroomInvitation classId={classroom.id} className={classroom.name} />} />
    </section>
  </>;
}
