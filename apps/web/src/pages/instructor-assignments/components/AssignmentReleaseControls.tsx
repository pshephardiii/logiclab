import { useState } from 'react';
import type { AssignmentDetail } from '@logiclab/contracts';

type ReleaseAction = 'release-grades' | 'reveal-answers';
type Props = {
  assignment: AssignmentDetail;
  busy: boolean;
  onRelease: (action: ReleaseAction) => Promise<boolean>;
};

/** Independent, irreversible class-wide actions; failed requests remain explicitly retryable. */
export function AssignmentReleaseControls({ assignment, busy, onRelease }: Props) {
  const [pending, setPending] = useState<ReleaseAction | null>(null);
  if (!assignment.publishedAt || assignment.assessmentMode === 'ungraded_practice') return null;
  const manualGrades =
    assignment.assessmentMode === 'graded' &&
    assignment.gradeReleaseTiming === 'instructor_release';
  const manualAnswers = assignment.solutionAccess === 'instructor_release';
  if (!manualGrades && !manualAnswers) return null;
  const disabled = busy || Boolean(assignment.archivedAt);
  async function confirm() {
    if (!pending || disabled) return;
    if (await onRelease(pending)) setPending(null);
  }
  return (
    <section
      className="panel"
      aria-label={
        assignment.assessmentMode === 'graded' ? 'Grade release and answer reveal' : 'Answer reveal'
      }
    >
      <h2>
        {assignment.assessmentMode === 'graded'
          ? 'Grade release and answer reveal'
          : 'Answer reveal'}
      </h2>
      <p>
        {assignment.assessmentMode === 'graded'
          ? 'Grade release and answer reveal are independent.'
          : 'Answer reveal does not affect completion status.'}{' '}
        Release cannot be undone and applies to the whole assignment, including students who submit
        later.
      </p>
      {assignment.archivedAt && (
        <p>
          {assignment.assessmentMode === 'graded'
            ? 'Restore this assignment before releasing grades or revealing answers.'
            : 'Restore this assignment before revealing answers.'}
        </p>
      )}
      {manualGrades &&
        (assignment.gradesReleasedAt ? (
          <p>Grades released {new Date(assignment.gradesReleasedAt).toLocaleString()}.</p>
        ) : (
          <button disabled={disabled} onClick={() => setPending('release-grades')}>
            Release grades
          </button>
        ))}
      {manualAnswers &&
        (assignment.answersRevealedAt ? (
          <p>Answers revealed {new Date(assignment.answersRevealedAt).toLocaleString()}.</p>
        ) : (
          <button disabled={disabled} onClick={() => setPending('reveal-answers')}>
            Reveal answers
          </button>
        ))}
      {pending && (
        <div role="group" aria-label="Confirm release">
          <p>
            {pending === 'release-grades'
              ? 'Release grades for all submitted work? Answer access will not change.'
              : 'Reveal correct answers to enrolled students? Grade release will not change.'}{' '}
            Students may still have unfinished work.
          </p>
          <button disabled={disabled} onClick={() => void confirm()}>
            Confirm {pending === 'release-grades' ? 'grade release' : 'answer reveal'}
          </button>
          <button className="secondary" disabled={busy} onClick={() => setPending(null)}>
            Cancel release
          </button>
        </div>
      )}
    </section>
  );
}
