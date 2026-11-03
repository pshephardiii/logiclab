import { SubmissionGradingPanel } from './SubmissionGradingPanel';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import { AssignedDerivation } from '../../../features/assignment/components/AssignedDerivation';
import { blankDerivationAnswer } from '../../../features/assignment/helpers/proof-answers';
import { AssignedConceptualQuestion } from '../../../features/assignment/components/AssignedConceptualQuestion';
import {
  submissionFeedback,
  proofSubmissionFeedback,
  conceptualSubmissionFeedback,
} from '../../../features/assignment/helpers/submission-feedback';
import { useState } from 'react';
import { useSubmissionReview } from '../hooks/useSubmissionReview';
import { answerMap } from '../../../features/assignment/helpers/answers';
import { AssignedItemTable } from '../../../features/assignment/components/AssignedItemTable';
import { SubmissionSummary } from '../../../features/assignment/components/SubmissionSummary';
import { PointScore } from '../../../features/assignment/components/PointScore';

/** Owner-scoped review uses frozen answers/results; unsaved student work is never requested. */
export function SubmissionReview({
  assignmentId,
  archived,
}: {
  assignmentId: string;
  archived?: boolean;
}) {
  const state = useSubmissionReview(assignmentId);
  const confirmDiscard = useConfirmDiscard();
  const [position, setPosition] = useState(0);
  function select(id: string) {
    confirmDiscard(() => {
      setPosition(0);
      void state.select(id);
    });
  }
  const review = state.review;
  const item = review?.assignment.items[position];
  const response = item ? review?.attempt.answers[item.id] : undefined;
  const proofAnswer =
    response && !Array.isArray(response) && response.type === 'derivation'
      ? response
      : blankDerivationAnswer();
  const proofReport = item ? proofSubmissionFeedback(review?.attempt.result, item.id) : null;
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
              {submission.score && <PointScore score={submission.score} showItems={false} />}
              <p>
                {'completedCells' in submission.summary
                  ? `Completed ${submission.summary.completedCells} of ${submission.summary.totalCells} cells · No correctness score`
                  : 'completedResponses' in submission.summary
                    ? `Completed ${submission.summary.completedResponses} of ${submission.summary.totalResponses} responses · No correctness score`
                    : 'proofs' in submission.summary
                      ? `Original proof checks: ${submission.summary.proofs.accepted} verified · ${submission.summary.proofs.needsReview} flagged · ${submission.summary.proofs.unassessable} unavailable`
                      : `${submission.summary.correct} correct · ${submission.summary.incorrect} incorrect · ${submission.summary.unanswered} unanswered`}
              </p>
              {'proofVerification' in submission.summary && (
                <p>
                  {submission.summary.proofVerification.verified > 0 && (
                    <span>
                      Completed — verified: {submission.summary.proofVerification.verified}.{' '}
                    </span>
                  )}
                  {submission.summary.proofVerification.errorsFound > 0 && (
                    <span>
                      Completed — errors found: {submission.summary.proofVerification.errorsFound}
                      .{' '}
                    </span>
                  )}
                  {submission.summary.proofVerification.unavailable > 0 && (
                    <span>
                      Completed — verification unavailable:{' '}
                      {submission.summary.proofVerification.unavailable}.{' '}
                    </span>
                  )}
                </p>
              )}
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
              score={review.attempt.score}
              automaticScore={review.attempt.automaticScore}
              instructorGrading={review.attempt.instructorGrading}
              items={review.assignment.items}
            />
          )}
          {review.assignment.assessmentMode === 'graded' && review.attempt.score && (
            <SubmissionGradingPanel
              key={review.attempt.id}
              assignmentId={assignmentId}
              submissionId={review.attempt.id}
              automaticScore={review.attempt.automaticScore ?? review.attempt.score}
              items={review.assignment.items}
              archived={archived ?? Boolean(review.assignment.archivedAt)}
              onUpdated={state.applyGrading}
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
          {item &&
            ('exercise' in item ? (
              <AssignedItemTable
                item={item}
                answers={answerMap(review.attempt.answers[item.id] ?? [])}
                feedback={submissionFeedback(review.attempt.result, item.id)}
                readOnly
                onAnswer={() => {}}
              />
            ) : item.content.type === 'derivation' ? (
              <AssignedDerivation
                item={{ ...item, content: item.content }}
                answer={proofAnswer}
                feedback={proofReport ? { proof: proofAnswer.proof, report: proofReport } : null}
                readOnly
                onAnswer={() => {}}
              />
            ) : (
              <AssignedConceptualQuestion
                item={{ ...item, content: item.content }}
                answer={
                  response && !Array.isArray(response) && response.type !== 'derivation'
                    ? response
                    : undefined
                }
                feedback={conceptualSubmissionFeedback(review.attempt.result, item.id)}
                readOnly
                onAnswer={() => {}}
              />
            ))}
        </>
      )}
    </section>
  );
}
