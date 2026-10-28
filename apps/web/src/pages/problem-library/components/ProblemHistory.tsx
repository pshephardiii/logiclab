import type { ProblemDraft } from '@logiclab/contracts';
import { useProblemHistory } from '../hooks/useProblemHistory';

type Props = { problem: ProblemDraft; disabled: boolean; onPreview: (formula: string) => void };

/** Presents saved publication controls and immutable snapshot content. */
export function ProblemHistory({ problem, disabled, onPreview }: Props) {
  const { versions, next, loading, publishing, error, notice, load, publish } = useProblemHistory(
    problem.id,
  );
  return (
    <section className="panel" aria-label="Published versions" aria-busy={loading || publishing}>
      <h2>Published versions</h2>
      <p>
        Publish the saved draft “{problem.title}”. Each click creates a new immutable version.
        Students do not receive access.
      </p>
      <div className="action-row">
        <button
          disabled={disabled || publishing || loading || Boolean(problem.archivedAt)}
          onClick={() => void publish()}
        >
          {publishing ? 'Publishing…' : 'Publish saved draft'}
        </button>
        <button className="secondary" disabled={publishing || loading} onClick={() => void load()}>
          Reload history
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading versions…</p>}
      {!loading && !error && versions.length === 0 && <p>No published versions yet.</p>}
      <ol className="problem-versions" role="list">
        {versions.map((version) => (
          <li key={version.id}>
            <h3>
              Version {version.version}: {version.title}
            </h3>
            <p>{version.instructions || 'No instructions.'}</p>
            <code>{version.definition.formula}</code>
            <p className="help">Published {new Date(version.publishedAt).toLocaleString()}</p>
            <button className="secondary" onClick={() => onPreview(version.definition.formula)}>
              Preview version {version.version}
            </button>
          </li>
        ))}
      </ol>
      {next !== null && (
        <button disabled={loading || publishing} onClick={() => void load(next)}>
          Load more versions
        </button>
      )}
    </section>
  );
}
