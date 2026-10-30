import type { AssignmentScore, SubmissionResult } from '@logiclab/contracts';
import { PointScore } from './PointScore';

export function SubmissionSummary({
  result,
  submittedAt,
  score,
  items,
}: {
  result: SubmissionResult;
  submittedAt: string;
  score?: AssignmentScore | null;
  items?: readonly { id: string; title: string }[];
}) {
  return (
    <section className="panel" aria-label="Submission result">
      <h2>Final submission</h2>
      <p>Submitted {new Date(submittedAt).toLocaleString()}. Answers are locked.</p>
      {result.gradingVersion === 'completion_v1' ? (
        <p>
          Completed {result.summary.completedCells} of {result.summary.totalCells} cells. No
          correctness score is recorded.
        </p>
      ) : result.gradingVersion === 'mixed_completion_v1' ? (
        <p>
          Completed {result.summary.completedResponses} of {result.summary.totalResponses}{' '}
          responses. No correctness score is recorded.
        </p>
      ) : (
        <>
          {score && <PointScore score={score} items={items} />}
          <p>
            {result.summary.correct} correct · {result.summary.incorrect} incorrect ·{' '}
            {result.summary.unanswered} unanswered · {result.summary.total}{' '}
            {result.gradingVersion === 'mixed_v1' ? 'responses' : 'cells'}
          </p>
          <p className="help">
            Correctness counts describe responses; problem point allocations determine the
            assignment grade.
          </p>
        </>
      )}
    </section>
  );
}
