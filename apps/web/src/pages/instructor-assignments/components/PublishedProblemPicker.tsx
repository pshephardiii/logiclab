import { useAccountPath } from '../../../routing/hooks/useAccountPath';
import { Link } from 'react-router';
import type { PublishedProblemVersion } from '@logiclab/contracts';
import { usePublishedProblemChoices } from '../hooks/usePublishedProblemChoices';
import { routeDefinitions } from '../../../routing/route-definitions';

type Props = { disabled: boolean; onAdd: (version: PublishedProblemVersion) => void };

/** Selects immutable publications, including retained versions of archived library problems. */
export function PublishedProblemPicker({ disabled, onAdd }: Props) {
  const accountPath = useAccountPath();
  const choices = usePublishedProblemChoices();
  return (
    <section aria-label="Add published problems">
      <h3>Add published problems</h3>
      <p className="help assignment-picker-help">
        Choose a library problem, then select Add version to append it to the ordered list above.
        Need a new problem?{' '}
        <Link to={accountPath(routeDefinitions.problemLibrary.path)}>Open problem library</Link> to
        create and publish it first. Save your assignment draft before leaving to keep your edits.
      </p>
      <label htmlFor="assignment-library-problem">Library problem</label>
      <select
        id="assignment-library-problem"
        value={choices.problemId}
        disabled={disabled}
        onChange={(event) => choices.selectProblem(event.target.value)}
      >
        <option value="">Choose a library problem</option>
        {choices.problems.map((problem) => (
          <option key={problem.id} value={problem.id}>
            {problem.title}
            {problem.archivedAt ? ' (archived)' : ''}
          </option>
        ))}
      </select>
      {choices.problemLoading && <p role="status">Loading library…</p>}
      {choices.problemError && (
        <>
          <p role="alert" className="error">
            {choices.problemError}
          </p>
          <button type="button" onClick={() => void choices.loadProblems(choices.problemNext ?? 0)}>
            Retry library
          </button>
        </>
      )}
      {!choices.problemLoading && !choices.problemError && choices.problems.length === 0 && (
        <p>No library problems yet. Create and publish one in the problem library first.</p>
      )}
      {choices.problemNext !== null && (
        <button
          type="button"
          disabled={choices.problemLoading || disabled}
          onClick={() => void choices.loadProblems(choices.problemNext!)}
        >
          Load more library problems
        </button>
      )}
      {choices.versionLoading && <p role="status">Loading publications…</p>}
      {choices.versionError && (
        <>
          <p role="alert" className="error">
            {choices.versionError}
          </p>
          <button type="button" onClick={() => void choices.loadVersions(choices.versionNext ?? 0)}>
            Retry publications
          </button>
        </>
      )}
      {choices.problemId &&
        !choices.versionLoading &&
        !choices.versionError &&
        choices.versions.length === 0 && (
          <p>No published versions. Publish this problem in the library first.</p>
        )}
      <ul>
        {choices.versions.map((version) => (
          <li key={version.id}>
            <strong>
              {version.title} · version {version.version}
            </strong>{' '}
            <code>
              {version.definition.type === 'truth_table'
                ? version.definition.formula
                : version.definition.question}
            </code>
            <button type="button" disabled={disabled} onClick={() => onAdd(version)}>
              Add version {version.version}
            </button>
          </li>
        ))}
      </ul>
      {choices.versionNext !== null && (
        <button
          type="button"
          disabled={disabled || choices.versionLoading}
          onClick={() => void choices.loadVersions(choices.versionNext!)}
        >
          Load more publications
        </button>
      )}
    </section>
  );
}
