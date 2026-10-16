import { Link } from 'react-router';
import { routeDefinitions } from '../../../routing/route-definitions';
import { useAssignmentClasses } from '../hooks/useAssignmentClasses';

type Props = { value: string; onChange: (id: string) => void };

/** Presents paginated owned-class choices and setup guidance. */
export function ClassSelector({ value, onChange }: Props) {
  const { classes, next, loading, error, load } = useAssignmentClasses();
  return (
    <section className="panel" aria-label="Assignment classroom">
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
      {!loading && !error && classes.length === 0 && (
        <p>
          Create a class before authoring assignments.{' '}
          <Link to={routeDefinitions.instructorClasses.path}>Manage classes</Link>
        </p>
      )}
      {next !== null && (
        <button disabled={loading} onClick={() => void load(next)}>
          Load more classes
        </button>
      )}
    </section>
  );
}
