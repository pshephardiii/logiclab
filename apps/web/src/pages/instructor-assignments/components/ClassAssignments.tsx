import { useState } from 'react';
import type { AssignmentListQuery } from '@logiclab/contracts';
import { useAssignments } from '../hooks/useAssignments';
import { AssignmentForm } from './AssignmentForm';

type Props = { classId: string };

/** Composes the class-scoped assignment list, editor, and lifecycle controls. */
export function ClassAssignments({ classId }: Props) {
  const state = useAssignments(classId);
  const [dirty, setDirty] = useState(false);
  function select(id: string | null) {
    setDirty(false);
    void state.select(id);
  }
  return (
    <>
      <p className="help">Switching classes, assignments, or pages discards unsaved edits.</p>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state.notice && <p role="status">{state.notice}</p>}
      <section className="panel" aria-label="Class assignments" aria-busy={state.loading}>
        <h2>Class assignments</h2>
        <label htmlFor="assignment-filter">Show assignments</label>
        <select
          id="assignment-filter"
          value={state.filter}
          disabled={state.busy}
          onChange={(event) =>
            state.setFilter(event.target.value as AssignmentListQuery['archive'])
          }
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        <div className="action-row">
          <button disabled={state.busy} onClick={() => select(null)}>
            New assignment
          </button>
          <button
            className="secondary"
            disabled={state.busy || state.loading}
            onClick={() => void state.load()}
          >
            Reload assignments
          </button>
        </div>
        {state.loading && <p role="status">Loading assignments…</p>}
        {!state.loading && !state.error && state.assignments.length === 0 && (
          <p>No assignments in this view.</p>
        )}
        <ul>
          {state.assignments.map((assignment) => (
            <li key={assignment.id}>
              <button
                className="text-button"
                disabled={state.busy}
                onClick={() => select(assignment.id)}
              >
                {assignment.title} (
                {assignment.archivedAt
                  ? 'archived'
                  : assignment.publishedAt
                    ? 'published'
                    : 'draft'}
                )
              </button>
            </li>
          ))}
        </ul>
        {state.next !== null && (
          <button
            disabled={state.busy || state.loading}
            onClick={() => void state.load(state.next!)}
          >
            Load more assignments
          </button>
        )}
      </section>
      {state.detailLoading && <p role="status">Loading assignment…</p>}
      {!state.detailLoading && state.editingId && !state.selected && (
        <button onClick={() => select(state.editingId)}>Retry assignment</button>
      )}
      {!state.detailLoading && (!state.editingId || state.selected) && (
        <>
          {dirty && (
            <p className="help">Unsaved changes. Save the draft before publishing or archiving.</p>
          )}
          <AssignmentForm
            key={state.revision}
            assignment={state.selected}
            busy={state.busy}
            onDirty={setDirty}
            onSave={state.save}
          />
          {state.selected && (
            <section className="panel" aria-label="Assignment publication">
              <h2>Publication and archive</h2>
              {state.selected.publishedAt && (
                <p>Published {new Date(state.selected.publishedAt).toLocaleString()}</p>
              )}
              {!state.selected.publishedAt && (
                <p>
                  Publish the saved draft to lock its problem order and policy. At least one problem
                  is required.
                </p>
              )}
              <p className="help">Student access to assignments is not available yet.</p>
              <div className="action-row">
                {!state.selected.publishedAt && (
                  <button
                    disabled={
                      dirty ||
                      state.busy ||
                      Boolean(state.selected.archivedAt) ||
                      !state.selected.items.length
                    }
                    onClick={() => void state.act('publish')}
                  >
                    Publish assignment
                  </button>
                )}
                <button
                  className="secondary"
                  disabled={dirty || state.busy}
                  onClick={() => void state.act(state.selected!.archivedAt ? 'restore' : 'archive')}
                >
                  {state.selected.archivedAt ? 'Restore assignment' : 'Archive assignment'}
                </button>
                <button
                  className="secondary"
                  disabled={state.busy}
                  onClick={() => select(state.selected!.id)}
                >
                  Reload saved assignment
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
