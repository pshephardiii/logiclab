import { InstructorGradingFeedback } from './InstructorGradingFeedback';
import type {
  AssignmentScore,
  SubmissionResult,
  ReleasedInstructorGrading,
} from '@logiclab/contracts';
import type {
  ProofSubmissionResult,
  ProofCompletionSubmissionResult,
} from '@logiclab/contracts/proof-submission';
import { PointScore } from './PointScore';

export function SubmissionSummary({
  result,
  submittedAt,
  score,
  items,
  automaticScore,
  instructorGrading,
}: {
  result: SubmissionResult | ProofSubmissionResult | ProofCompletionSubmissionResult;
  submittedAt: string;
  score?: AssignmentScore | null;
  automaticScore?: AssignmentScore;
  instructorGrading?: ReleasedInstructorGrading;
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
      ) : result.gradingVersion === 'proof_completion_v1' ? (
        <>
          <p>
            Completed {result.summary.completedResponses} of {result.summary.totalResponses}{' '}
            responses. No correctness score is recorded.
          </p>
          <p>
            Completed proofs: {result.summary.proofVerification.verified} verified ·{' '}
            {result.summary.proofVerification.errorsFound} with errors found ·{' '}
            {result.summary.proofVerification.unavailable} with verification unavailable.
          </p>
          <p className="help">
            Verification is separate from completion. Errors and unavailable verification do not
            remove completion status.
          </p>
        </>
      ) : result.gradingVersion === 'proof_mixed_v1' ? (
        <>
          {score && <PointScore score={score} items={items} />}
          <p>
            Original proof checks: {result.summary.proofs.accepted} verified ·{' '}
            {result.summary.proofs.needsReview} flagged for review ·{' '}
            {result.summary.proofs.unassessable} could not be fully assessed.
          </p>
          <p>
            Other responses: {result.summary.objective.correct} correct ·{' '}
            {result.summary.objective.incorrect} incorrect · {result.summary.objective.unanswered}{' '}
            unanswered.
          </p>
          <p className="help">
            Unverified proofs receive no automatic zero or partial score. Instructor awards
            determine their points; the original checker findings stay unchanged.
          </p>
        </>
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
      {automaticScore && instructorGrading && (
        <InstructorGradingFeedback
          grading={instructorGrading}
          automaticScore={automaticScore}
          items={items}
        />
      )}
    </section>
  );
}
