import { useStudentClasses } from '../useStudentClasses';
import { JoinClassForm } from './JoinClassForm';
import { ClassroomList } from '../../../features/classroom/components/ClassroomList';
export function StudentClasses() {
  const state = useStudentClasses();
  return <><section className="panel" aria-labelledby="student-classes-heading" aria-busy={state.busy}>
    <p className="eyebrow">LogicLab / Student</p><h1 id="student-classes-heading">My classes</h1>
    {state.error && <p role="alert" className="error">{state.error}</p>}
    {state.notice && <p role="status">{state.notice}</p>}
    <JoinClassForm busy={state.busy} onJoin={code => state.run('join', code)} />
    <h2>Enrolled classes</h2>
    <button className="text-button" disabled={state.busy} onClick={() => void state.run('list')}>Reload classes</button>
    {state.busy && <p role="status">Loading…</p>}
    <ClassroomList classrooms={state.classrooms} busy={state.busy} nextOffset={state.nextOffset} onMore={() => void state.run('more')} emptyMessage="You have not joined any classes yet." />
  </section></>;
}
