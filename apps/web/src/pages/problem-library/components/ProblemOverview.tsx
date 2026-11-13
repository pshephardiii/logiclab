import { isProblemMethodAvailable } from '../../../features/proof/helpers/method-availability';
import type {
  LibraryProblemDraft,
  LibraryProblemVersion,
} from '@logiclab/contracts/problem-library';
import { useProblemHistory } from '../hooks/useProblemHistory';
import { DerivationSummary } from './DerivationSummary';
import { ConceptualQuestionSummary } from './ConceptualQuestionSummary';

/** Display the immutable published snapshot, not a potentially different editable draft. */
export function ProblemOverview({
  problem,
  published,
  onEdit,
}: {
  problem: LibraryProblemDraft;
  published: LibraryProblemVersion | null;
  onEdit: () => void;
}) {
  const history = useProblemHistory(problem.id);
  const latest = history.versions[0];
  const version = published && (!latest || published.version > latest.version) ? published : latest;
  return (
    <section className="panel problem-overview" aria-label="Published problem">
      {published && (
        <div role="status" className="publication-success">
          <strong>✓ Published version {published.version}.</strong>
          <p>Your problem is ready to add to an assignment.</p>
        </div>
      )}
      <div className="problem-overview-heading">
        <h2>{version?.title ?? 'Published problem'}</h2>
        <button type="button" className="secondary" onClick={onEdit}>
          {!isProblemMethodAvailable(problem.definition)
            ? 'View retained draft'
            : problem.archivedAt
              ? 'View archived draft'
              : 'Edit draft'}
        </button>
      </div>
      {problem.archivedAt && (
        <p>Archived. Existing published assignments retain their snapshots.</p>
      )}
      {history.error && (
        <p role="alert" className="error">
          {history.error}
        </p>
      )}
      {history.loading && !version && <p role="status">Loading published problem…</p>}
      {!history.loading && !version && !history.error && (
        <p>No published version was found. Reload to check publication status.</p>
      )}
      {version && (
        <>
          <p className="problem-status-badge">Published · Version {version.version}</p>
          {version.instructions && <p>{version.instructions}</p>}
          {version.definition.type === 'derivation' ? (
            <DerivationSummary definition={version.definition} />
          ) : version.definition.type === 'truth_table' ? (
            <p>
              <code>{version.definition.formula}</code>
            </p>
          ) : (
            <ConceptualQuestionSummary definition={version.definition} />
          )}
          <p className="help">Published {new Date(version.publishedAt).toLocaleString()}</p>
        </>
      )}
      {(history.error || (!history.loading && !version)) && (
        <button
          type="button"
          className="secondary"
          disabled={history.loading}
          onClick={() => void history.load()}
        >
          Reload published problem
        </button>
      )}
    </section>
  );
}
