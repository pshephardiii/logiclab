import { ConceptualQuestionSummary } from './ConceptualQuestionSummary';
import type {
  LibraryProblemDraft,
  LibraryProblemDefinition,
} from '@logiclab/contracts/problem-library';
import { DerivationSummary } from './DerivationSummary';
import { useProblemHistory } from '../hooks/useProblemHistory';

type Props = {
  problem: LibraryProblemDraft;
  disabled: boolean;
  onPreview: (definition: LibraryProblemDefinition) => void;
};

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
        Publication does not grant student access. Derivations cannot be assigned yet.
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
            {version.definition.type === 'derivation' ? (
              <DerivationSummary definition={version.definition} />
            ) : version.definition.type === 'truth_table' ? (
              <code>{version.definition.formula}</code>
            ) : (
              <ConceptualQuestionSummary definition={version.definition} />
            )}
            <p className="help">Published {new Date(version.publishedAt).toLocaleString()}</p>
            <button className="secondary" onClick={() => onPreview(version.definition)}>
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
