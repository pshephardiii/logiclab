import './class-selection.css';
import type { ReactNode } from 'react';
import type { ClassroomListResponse } from '@logiclab/contracts';
import { useClassChoices } from '../hooks/useClassChoices';

type Props = {
  value: string;
  onChange: (id: string) => void;
  loadPage: (signal: AbortSignal, offset?: number) => Promise<ClassroomListResponse>;
  emptyMessage: ReactNode;
};

/** Presents paginated class choices and setup guidance. */
export function ClassSelection({ value, onChange, loadPage, emptyMessage }: Props) {
  const { classes, next, loading, error, load } = useClassChoices(loadPage);
  return (
    <section className="panel class-selection" aria-label="Assignment classroom">
      <label htmlFor="assignment-class">Class</label>
      <select
        id="assignment-class"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose a class</option>
        {classes.map((classroom) => (
          <option key={classroom.id} value={classroom.id}>
            {classroom.name}
          </option>
        ))}
      </select>
      {loading && <p role="status">Loading classes…</p>}
      {error && (
        <>
          <p role="alert" className="error">
            {error}
          </p>
          <button onClick={() => void load(next ?? 0)}>Retry classes</button>
        </>
      )}
      {!loading && !error && classes.length === 0 && <p>{emptyMessage}</p>}
      {next !== null && (
        <button disabled={loading} onClick={() => void load(next)}>
          Load more classes
        </button>
      )}
    </section>
  );
}
