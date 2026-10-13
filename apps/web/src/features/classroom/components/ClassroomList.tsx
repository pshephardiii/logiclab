import { ClassroomInvitation } from './ClassroomInvitation';
import type { ClassroomSummary } from '@logiclab/contracts';
type Props = { classrooms: ClassroomSummary[]; busy: boolean; showInvitations?: boolean; emptyMessage?: string; nextOffset: number | null; onMore: () => void };
export function ClassroomList({ classrooms, busy, nextOffset, onMore, showInvitations = true, emptyMessage = 'You have no classes yet. Create your first class above.' }: Props) {
  return <>
    {classrooms.length ? <ul>{classrooms.map(classroom => <li key={classroom.id}>
      <strong>{classroom.name}</strong> — Created {new Date(classroom.createdAt).toLocaleDateString()}
      {showInvitations && <ClassroomInvitation classId={classroom.id} className={classroom.name} />}
    </li>)}</ul> : !busy && <p>{emptyMessage}</p>}
    {nextOffset !== null && <button className="secondary" disabled={busy} onClick={onMore}>Load more classes</button>}
  </>;
}
