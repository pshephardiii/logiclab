import type { ReactNode } from 'react';
import type { ClassroomSummary } from '@logiclab/contracts';
type Props = {
  classrooms: ClassroomSummary[];
  busy: boolean;
  renderActions?: (classroom: ClassroomSummary) => ReactNode;
  emptyMessage?: string;
  nextOffset: number | null;
  onMore: () => void;
};
/**
 * Renders class summaries and pagination, with optional page-supplied actions for each class.
 */
export function ClassroomList({
  classrooms,
  busy,
  nextOffset,
  onMore,
  renderActions,
  emptyMessage = 'You have no classes yet. Create your first class above.',
}: Props) {
  return (
    <>
      {classrooms.length ? (
        <ul>
          {classrooms.map((classroom) => (
            <li key={classroom.id}>
              <strong>{classroom.name}</strong> — Created{' '}
              {new Date(classroom.createdAt).toLocaleDateString()}
              {renderActions?.(classroom)}
            </li>
          ))}
        </ul>
      ) : (
        !busy && <p>{emptyMessage}</p>
      )}
      {nextOffset !== null && (
        <button className="secondary" disabled={busy} onClick={onMore}>
          Load more classes
        </button>
      )}
    </>
  );
}
