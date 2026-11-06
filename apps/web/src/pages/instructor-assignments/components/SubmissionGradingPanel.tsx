import './submission-grading.css';
import type { AssignmentScore, SubmissionGradingResponse } from '@logiclab/contracts';
import { INSTRUCTOR_GRADING_LIMITS } from '@logiclab/contracts';
import { useSubmissionGrading } from '../hooks/useSubmissionGrading';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import { SubmissionGradingHistory } from './SubmissionGradingHistory';

/** Explicit per-occurrence awards/comments, independent of the retained automatic proof reports. */
export function SubmissionGradingPanel({
  assignmentId,
  submissionId,
  automaticScore,
  items,
  archived,
  onUpdated,
}: {
  assignmentId: string;
  submissionId: string;
  automaticScore: AssignmentScore;
  items: readonly { id: string; title: string }[];
  archived: boolean;
  onUpdated: (id: string, value: SubmissionGradingResponse) => void;
}) {
  const state = useSubmissionGrading(assignmentId, submissionId, automaticScore, onUpdated);

  useUnsavedWork(state.dirty);

  const confirmDiscard = useConfirmDiscard();

  return (
    <section className="panel submission-grading" aria-label="Instructor grading">
      <h2>Instructor grading</h2>
      <p>
        Adjust points and comments for any problem. Automatic scores and checker findings are
        retained.
      </p>
      <p>
        Saved points and comments follow grade release. Changes to released grades appear
        immediately. Answer reveal is controlled separately.
      </p>
      {archived && <p>Restore this assignment before changing grading.</p>}
      <button
        type="button"
        className="secondary"
        disabled={state.busy}
        onClick={() => confirmDiscard(() => void state.load())}
      >
        Reload current grading
      </button>
      {state.busy && <p role="status">Loading or saving grading…</p>}
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state.needsReload && (
        <p role="status">
          The save was not confirmed. Your edits are kept. Reload current grading to reconcile any
          saved changes before saving again.
        </p>
      )}
      {state.notice && <p role="status">{state.notice}</p>}
      {state.current && (
        <form
          onSubmit={(event) => {
            event.preventDefault();

            if (!archived) void state.save();
          }}
        >
          <p>
            Grading revision {state.current.grading.revision}.
            {state.dirty ? ' Unsaved grading changes.' : ''}
          </p>
          <fieldset disabled={archived || state.busy || state.needsReload}>
            <legend>Problem awards and comments</legend>
            {state.draft.map((row) => {
              const position = items.findIndex((item) => item.id === row.itemId);
              const automatic = automaticScore.items.find((item) => item.itemId === row.itemId)!;

              const effective = state.current!.score.items.find(
                (item) => item.itemId === row.itemId,
              )!;

              return (
                <fieldset className="grading-problem" key={row.itemId}>
                  <legend>
                    Problem {position + 1}: {items[position]?.title ?? row.itemId}
                  </legend>
                  <p>
                    Automatic award:{' '}
                    {automatic.status === 'needs_review'
                      ? 'Needs instructor review'
                      : `${automatic.earnedPoints} / ${automatic.maxPoints} points`}
                    . Current award:{' '}
                    {effective.status === 'needs_review'
                      ? 'Needs instructor review'
                      : `${effective.earnedPoints} / ${effective.maxPoints} points`}
                    .
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={row.automatic}
                      onChange={(event) =>
                        state.change(row.itemId, { automatic: event.target.checked })
                      }
                    />
                    Use automatic award for problem {position + 1}
                  </label>
                  {!row.automatic && (
                    <label>
                      Points for problem {position + 1}
                      <input
                        type="number"
                        min={0}
                        max={automatic.maxPoints}
                        step="0.01"
                        required
                        value={row.points}
                        aria-invalid={Boolean(state.errors[row.itemId])}
                        aria-describedby={
                          state.errors[row.itemId] ? `grading-error-${row.itemId}` : undefined
                        }
                        onChange={(event) =>
                          state.change(row.itemId, { points: event.target.value })
                        }
                      />
                    </label>
                  )}
                  <label htmlFor={`grading-comment-${row.itemId}`}>
                    Comment for problem {position + 1}
                  </label>
                  <textarea
                    id={`grading-comment-${row.itemId}`}
                    value={row.comment}
                    maxLength={INSTRUCTOR_GRADING_LIMITS.maxCommentLength}
                    onChange={(event) => state.change(row.itemId, { comment: event.target.value })}
                  />
                  {state.errors[row.itemId] && (
                    <p id={`grading-error-${row.itemId}`} className="error" role="alert">
                      {state.errors[row.itemId]}
                    </p>
                  )}
                </fieldset>
              );
            })}
          </fieldset>
          <p className="help">
            Use automatic award to restore the original points. An unverified proof returns to
            pending review. Zero points is a resolved award. Clear the comment to remove it.
          </p>
          <button
            type="submit"
            disabled={
              archived ||
              state.busy ||
              state.needsReload ||
              !state.dirty ||
              Object.keys(state.errors).length > 0
            }
          >
            Save instructor grading
          </button>
        </form>
      )}
      <SubmissionGradingHistory
        key={state.current?.grading.revision ?? 'initial'}
        assignmentId={assignmentId}
        submissionId={submissionId}
        items={items}
      />
    </section>
  );
}
