import { AssignmentReleaseControls } from './AssignmentReleaseControls';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import { useAccountPath } from '../../../routing/hooks/useAccountPath';
import { Link } from 'react-router';
import { SubmissionReview } from './SubmissionReview';
import { useState } from 'react';
import type { AssignmentListQuery } from '@logiclab/contracts';
import { useAssignments } from '../hooks/useAssignments';
import { AssignmentForm } from './AssignmentForm';
import { useAssignmentReveal } from '../hooks/useAssignmentReveal';

type Props = { classId: string };

/** Composes the class-scoped assignment list, editor, and lifecycle controls. */
export function ClassAssignments({ classId }: Props) {
  const accountPath = useAccountPath();
  const state = useAssignments(classId);
  const detailView = useAssignmentReveal(
    state.selected?.id ?? null,
    state.detailLoading,
    state.revision,
  );
  const [dirty, setDirty] = useState(false);
  useUnsavedWork(dirty && !state.selected?.publishedAt && !state.selected?.archivedAt);
  const confirmDiscard = useConfirmDiscard();
  function select(id: string | null) {
    confirmDiscard(() => {
      detailView.prepareSelection(id);
      setDirty(false);
      void state.select(id);
    });
  }
  function duplicate() {
    confirmDiscard(() => void state.duplicate());
  }
  return (
    <>
      <p className="help">
        Unsaved edits are protected when you switch classes, assignments, or pages. New publication
        requires coverage; <Link to={accountPath('/billing')}>manage simulated class billing</Link>.
      </p>
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
      <div
        ref={detailView.panelRef}
        className="assignment-detail"
        aria-busy={state.detailLoading}
        style={
          state.detailLoading || (state.editingId && !state.selected)
            ? { minHeight: detailView.reservedHeight }
            : undefined
        }
      >
        {state.detailLoading && (
          <p className="panel assignment-loading" role="status">
            Loading assignment…
          </p>
        )}
        {!state.detailLoading && state.editingId && !state.selected && (
          <button onClick={() => select(state.editingId)}>Retry assignment</button>
        )}
        {!state.detailLoading && (!state.editingId || state.selected) && (
          <>
            {dirty && (
              <p className="help">
                Unsaved changes. Save the draft before publishing or archiving.
              </p>
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
                    Publish the saved draft to lock its problem order and policy. At least one
                    problem is required.
                  </p>
                )}
                <p className="help">
                  Published, active assignments are available to enrolled students.
                </p>
                <p className="help">
                  Duplicate as draft copies saved content into this class and opens a new editable
                  draft. Unsaved edits are not copied; the source is unchanged.
                </p>
                <div className="action-row">
                  <button className="secondary" disabled={state.busy} onClick={duplicate}>
                    Duplicate as draft
                  </button>
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
                    onClick={() =>
                      void state.act(state.selected!.archivedAt ? 'restore' : 'archive')
                    }
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
            {state.selected && (
              <AssignmentReleaseControls
                key={`${state.selected.id}:${state.selected.gradesReleasedAt}:${state.selected.answersRevealedAt}`}
                assignment={state.selected}
                busy={state.busy}
                onRelease={state.act}
              />
            )}
            {state.selected?.publishedAt &&
              state.selected.assessmentMode !== 'ungraded_practice' && (
                <SubmissionReview key={state.selected.id} assignmentId={state.selected.id} />
              )}
          </>
        )}
      </div>
    </>
  );
}
