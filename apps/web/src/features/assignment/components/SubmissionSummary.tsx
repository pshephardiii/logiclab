import type { SubmissionResult } from '@logiclab/contracts';

export function SubmissionSummary({
  result,
  submittedAt,
}: {
  result: SubmissionResult;
  submittedAt: string;
}) {
  return (
    <section className="panel" aria-label="Submission result">
      <h2>Final submission</h2>
      <p>Submitted {new Date(submittedAt).toLocaleString()}. Answers are locked.</p>
      <p>
        {result.summary.correct} correct · {result.summary.incorrect} incorrect ·{' '}
        {result.summary.unanswered} unanswered · {result.summary.total} cells
      </p>
      <p className="help">Completion records submission; correctness is shown separately.</p>
    </section>
  );
}
