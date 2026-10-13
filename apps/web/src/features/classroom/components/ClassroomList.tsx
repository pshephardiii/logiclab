import type { ClassroomSummary } from '@logiclab/contracts';
type Props = { classrooms: ClassroomSummary[]; busy: boolean; nextOffset: number | null; onMore: () => void };
export function ClassroomList({ classrooms, busy, nextOffset, onMore }: Props) {
  return <>
    {classrooms.length ? <ul>{classrooms.map(classroom => <li key={classroom.id}>
      <strong>{classroom.name}</strong> — Created {new Date(classroom.createdAt).toLocaleDateString()}
    </li>)}</ul> : !busy && <p>You have no classes yet. Create your first class above.</p>}
    {nextOffset !== null && <button className="secondary" disabled={busy} onClick={onMore}>Load more classes</button>}
  </>;
}
