import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import { useState } from 'react';
import type { ProblemArchiveFilter } from '@logiclab/contracts';
import { useProblemLibrary } from '../hooks/useProblemLibrary';
import { ProblemForm } from './ProblemForm';
import { ProblemHistory } from './ProblemHistory';
import { ProblemPreview } from './ProblemPreview';
import '../problem-library.css';

/** Composes the private library list, draft editor, immutable history, and isolated preview. */
export function ProblemLibrary() {
  const library = useProblemLibrary();
  const [dirty, setDirty] = useState(false);
  useUnsavedWork(dirty && !library.selected?.archivedAt);
  const confirmDiscard = useConfirmDiscard();
  const [editorKey, setEditorKey] = useState(0);
  const [preview, setPreview] = useState<{ formula: string; key: number } | null>(null);
  function showPreview(formula: string) {
    setPreview((previous) => ({ formula, key: (previous?.key ?? 0) + 1 }));
  }
  function select(problem: typeof library.selected) {
    confirmDiscard(() => {
      library.setSelected(problem);
      setDirty(false);
      setEditorKey((value) => value + 1);
      setPreview(null);
    });
  }
  return (
    <>
      <header>
        <p className="eyebrow">LogicLab / Instructor</p>
        <h1>Problem library</h1>
        <p>
          Private reusable problems. Publishing preserves a snapshot; sharing with classes comes
          later.
        </p>
      </header>
      {library.error && (
        <p role="alert" className="error">
          {library.error}
        </p>
      )}
      {library.notice && <p role="status">{library.notice}</p>}
      <section className="panel" aria-label="Your problems" aria-busy={library.loading}>
        <h2>Your problems</h2>
        <label htmlFor="library-filter">Show problems</label>
        <select
          id="library-filter"
          value={library.filter}
          disabled={library.busy}
          onChange={(event) => library.setFilter(event.target.value as ProblemArchiveFilter)}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        <div className="action-row">
          <button disabled={library.busy} onClick={() => select(null)}>
            New problem
          </button>
          <button
            className="secondary"
            disabled={library.loading || library.busy}
            onClick={() => void library.load()}
          >
            Reload problems
          </button>
        </div>
        {library.loading && <p role="status">Loading problems…</p>}
        {!library.loading && library.problems.length === 0 && <p>No problems in this view.</p>}
        <ul className="problem-list">
          {library.problems.map((problem) => (
            <li key={problem.id}>
              <button
                className="text-button"
                disabled={library.busy}
                onClick={() => select(problem)}
              >
                {problem.title}
                {problem.archivedAt ? ' (archived)' : ''}
              </button>
            </li>
          ))}
        </ul>
        {library.nextOffset !== null && (
          <button
            disabled={library.loading || library.busy}
            onClick={() => void library.load(library.nextOffset!)}
          >
            Load more problems
          </button>
        )}
      </section>
      {dirty && (
        <p className="help">
          Unsaved edits: save before publishing or archiving. Switching problems asks before
          discarding these edits.
        </p>
      )}
      <ProblemForm
        key={`${editorKey}:${library.selected?.id ?? 'new'}:${library.selected?.updatedAt ?? ''}`}
        problem={library.selected}
        busy={library.busy}
        saveError={library.saveError}
        onDirty={setDirty}
        onSave={library.save}
        onPreview={showPreview}
      />
      {library.selected && (
        <>
          <section className="panel">
            <h2>Library status</h2>
            <p>
              {library.selected.archivedAt
                ? 'Archived: restore to edit or publish. Published versions remain available.'
                : 'Active: available in your private library.'}
            </p>
            <button disabled={library.busy || dirty} onClick={() => void library.archive()}>
              {library.selected.archivedAt ? 'Restore problem' : 'Archive problem'}
            </button>
          </section>
          <ProblemHistory
            key={library.selected.id}
            problem={library.selected}
            disabled={library.busy || dirty}
            onPreview={showPreview}
          />
        </>
      )}
      {preview && (
        <>
          <button className="secondary" onClick={() => setPreview(null)}>
            Close preview
          </button>
          <ProblemPreview key={preview.key} formula={preview.formula} />
        </>
      )}
    </>
  );
}
