import { submissionFeedback } from '../../../features/assignment/helpers/submission-feedback';
import { useState } from 'react';
import { useSubmissionReview } from '../hooks/useSubmissionReview';
import { answerMap } from '../../../features/assignment/helpers/answers';
import { AssignedItemTable } from '../../../features/assignment/components/AssignedItemTable';
import { SubmissionSummary } from '../../../features/assignment/components/SubmissionSummary';

/** Owner-scoped review uses frozen answers/results; unsaved student work is never requested. */
export function SubmissionReview({ assignmentId }: { assignmentId: string }) {
  const state = useSubmissionReview(assignmentId);
  const [position, setPosition] = useState(0);
  function select(id: string) {
    setPosition(0);
    void state.select(id);
  }
  const review = state.review;
  const item = review?.assignment.items[position];
  return (
    <section aria-label="Final submission review">
      <section className="panel">
        <h2>Final submissions</h2>
        <p>Only final submissions are listed. Students' unfinished answers remain private.</p>
        <button className="secondary" disabled={state.loading} onClick={() => void state.load()}>
          Reload submissions
        </button>
        {state.loading && <p role="status">Loading submissions…</p>}
        {state.error && (
          <p role="alert" className="error">
            {state.error}
          </p>
        )}
        {!state.loading && !state.error && !state.submissions.length && (
          <p>No final submissions yet.</p>
        )}
        <ul>
          {state.submissions.map((submission) => (
            <li key={submission.id}>
              <button className="text-button" onClick={() => select(submission.id)}>
                {submission.student.email ?? `Student ${submission.student.id}`}
              </button>
              <p>
                {'completedCells' in submission.summary
                  ? `Completed ${submission.summary.completedCells} of ${submission.summary.totalCells} cells · No correctness score`
                  : `${submission.summary.correct} correct · ${submission.summary.incorrect} incorrect · ${submission.summary.unanswered} unanswered`}
              </p>
            </li>
          ))}
        </ul>
        {state.next !== null && (
          <button disabled={state.loading} onClick={() => void state.load(state.next!)}>
            Load more submissions
          </button>
        )}
        {state.detailLoading && <p role="status">Loading submission…</p>}
        {!state.detailLoading && state.selected && !review && (
          <button onClick={() => select(state.selected!)}>Retry submission</button>
        )}
      </section>
      {review && (
        <>
          <p>
            Reviewing {review.submission.student.email ?? `Student ${review.submission.student.id}`}
          </p>
          {review.attempt.result && review.attempt.submittedAt && (
            <SubmissionSummary
              result={review.attempt.result}
              submittedAt={review.attempt.submittedAt}
            />
          )}
          <section className="panel">
            <label htmlFor="review-item">Submitted problem</label>
            <select
              id="review-item"
              className="assignment-choice"
              value={item?.id ?? ''}
              onChange={(event) =>
                setPosition(
                  review.assignment.items.findIndex((value) => value.id === event.target.value),
                )
              }
            >
              {review.assignment.items.map((value, index) => (
                <option key={value.id} value={value.id}>
                  {index + 1}. {value.title}
                </option>
              ))}
            </select>
          </section>
          {item && (
            <AssignedItemTable
              item={item}
              answers={answerMap(review.attempt.answers[item.id] ?? [])}
              feedback={submissionFeedback(review.attempt.result, item.id)}
              readOnly
              onAnswer={() => {}}
            />
          )}
        </>
      )}
    </section>
  );
}
