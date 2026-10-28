import type { ReactNode } from 'react';
import type { ClassroomSummary } from '@logiclab/contracts';
import { ClassroomList } from './ClassroomList';
import './classroom-panel.css';

type Props = {
  headingId: string;
  eyebrow: string;
  title: string;
  listTitle: string;
  busy: boolean;
  error: string | null;
  notice: string | null;
  classrooms: ClassroomSummary[];
  nextOffset: number | null;
  onReload: () => void;
  onMore: () => void;
  children: ReactNode;
  renderActions?: (classroom: ClassroomSummary) => ReactNode;
  emptyMessage?: string;
};

/**
 * Shares class-page headings, request messages, reload controls, and list presentation.
 * Pages supply their own form, state, and optional per-class actions.
 */
export function ClassroomPanel({
  headingId,
  eyebrow,
  title,
  listTitle,
  busy,
  error,
  notice,
  classrooms,
  nextOffset,
  onReload,
  onMore,
  children,
  renderActions,
  emptyMessage,
}: Props) {
  return (
    <section className="panel classroom-panel" aria-labelledby={headingId} aria-busy={busy}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={headingId}>{title}</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="classroom-editor">{children}</div>
      <div className="classroom-list-heading">
        <h2>{listTitle}</h2>
        <button className="text-button" disabled={busy} onClick={onReload}>
          Reload classes
        </button>
      </div>
      {busy && <p role="status">Loading…</p>}
      <ClassroomList
        classrooms={classrooms}
        busy={busy}
        nextOffset={nextOffset}
        onMore={onMore}
        renderActions={renderActions}
        emptyMessage={emptyMessage}
      />
    </section>
  );
}
