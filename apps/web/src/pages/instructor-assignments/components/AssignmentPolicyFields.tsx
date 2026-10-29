import { useState, type ChangeEvent } from 'react';
import {
  assignmentLearningPolicySchema,
  gradeReleaseTimingSchema,
  solutionAccessSchema,
  type AssignmentLearningPolicy,
  type GradeReleaseTiming,
} from '@logiclab/contracts';

type Props = {
  policy: AssignmentLearningPolicy;
  onChange: (policy: AssignmentLearningPolicy) => void;
  gradeReleaseTiming: GradeReleaseTiming;
  onGradeReleaseChange: (timing: GradeReleaseTiming) => void;
};

/** Mode changes establish valid defaults; restored legacy assistance remains explicit. */
export function AssignmentPolicyFields({
  policy,
  onChange,
  gradeReleaseTiming,
  onGradeReleaseChange,
}: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const practice = policy.assessmentMode === 'ungraded_practice';
  const graded = policy.assessmentMode === 'graded';
  const legacyAssistance =
    policy.assessmentMode === 'completion_only' && policy.feedbackTiming !== 'on_submission';
  function changeMode(event: ChangeEvent<HTMLSelectElement>) {
    const assessmentMode = event.target.value;
    const resetSolutions =
      assessmentMode === 'ungraded_practice' &&
      !['never', 'anytime'].includes(policy.solutionAccess);
    onChange(
      assignmentLearningPolicySchema.parse({
        assessmentMode,
        feedbackTiming:
          assessmentMode === 'ungraded_practice'
            ? policy.feedbackTiming === 'immediate'
              ? 'immediate'
              : 'on_check'
            : 'on_submission',
        solutionAccess: resetSolutions ? 'never' : policy.solutionAccess,
      }),
    );
    if (assessmentMode !== 'graded') onGradeReleaseChange('on_submission');
    setNotice(
      resetSolutions
        ? 'Practice has no final submission or instructor answer release. Answer reveal was changed to Never.'
        : null,
    );
  }
  function changeTiming(event: ChangeEvent<HTMLSelectElement>) {
    onChange(
      assignmentLearningPolicySchema.parse({ ...policy, feedbackTiming: event.target.value }),
    );
  }
  function changeSolutions(event: ChangeEvent<HTMLSelectElement>) {
    onChange(
      assignmentLearningPolicySchema.parse({
        ...policy,
        solutionAccess: solutionAccessSchema.parse(event.target.value),
      }),
    );
    setNotice(null);
  }
  return (
    <div className="assignment-policy">
      <label htmlFor="assignment-mode">Assessment mode</label>
      <select
        id="assignment-mode"
        value={policy.assessmentMode}
        onChange={changeMode}
        aria-describedby="assignment-mode-help"
      >
        <option value="graded">Graded</option>
        <option value="completion_only">Completion only</option>
        <option value="ungraded_practice">Ungraded practice</option>
      </select>
      <p id="assignment-mode-help" className="help">
        {graded
          ? 'Final submission records correctness and a score. Grade release and answer reveal are independent.'
          : practice
            ? 'Students can save and check repeatedly. There is no final submission or official score; practice answers stay private.'
            : 'Every cell must be filled; correctness does not affect completion. Completion is acknowledged at submission, with no grade-release control.'}
      </p>
      {graded && (
        <>
          <label htmlFor="assignment-grade-release">Grade release</label>
          <select
            id="assignment-grade-release"
            value={gradeReleaseTiming}
            aria-describedby="assignment-grade-help"
            onChange={(event) =>
              onGradeReleaseChange(gradeReleaseTimingSchema.parse(event.target.value))
            }
          >
            <option value="on_submission">At submission</option>
            <option value="instructor_release">When I release grades</option>
          </select>
          <p id="assignment-grade-help" className="help">
            Grades include correctness feedback. For true/false entries, this can reveal answers by
            inference even when answer reveal is locked.
          </p>
        </>
      )}
      {(practice || legacyAssistance) && (
        <>
          <label htmlFor="assignment-feedback">Feedback timing</label>
          <select
            id="assignment-feedback"
            value={policy.feedbackTiming}
            onChange={changeTiming}
            aria-describedby="assignment-feedback-help"
          >
            {legacyAssistance && (
              <option value="on_submission">At submission (no pre-submission checks)</option>
            )}
            <option value="on_check">On explicit Check answers</option>
            <option value="immediate">Immediately after an answer changes</option>
          </select>
          <p id="assignment-feedback-help" className="help">
            {legacyAssistance &&
              'This saved completion policy retains legacy pre-submission assistance. '}
            {policy.feedbackTiming === 'immediate'
              ? 'Incorrect entries are highlighted without revealing the answer key. Manual Check answers remains available; saving is still explicit.'
              : 'Students choose Check answers for correctness feedback. Saving is still explicit.'}
          </p>
        </>
      )}
      <label htmlFor="assignment-solutions">Answer reveal</label>
      <select
        id="assignment-solutions"
        value={policy.solutionAccess}
        onChange={changeSolutions}
        aria-describedby="assignment-solutions-help"
      >
        <option value="never">Never</option>
        {!practice && (
          <>
            <option value="after_submission">After final submission</option>
            <option value="instructor_release">When I reveal answers</option>
          </>
        )}
        <option value="anytime">Anytime</option>
      </select>
      <p id="assignment-solutions-help" className="help">
        {policy.solutionAccess === 'never'
          ? 'Students cannot reveal the correct answers through solution controls, even after submission.'
          : policy.solutionAccess === 'after_submission'
            ? 'Students may reveal the correct answers only after final submission.'
            : policy.solutionAccess === 'instructor_release'
              ? 'Answers remain hidden until you explicitly reveal them. This is independent of grade release.'
              : 'Students may reveal the correct answers at any time, even before attempting the problems.'}{' '}
        These settings are locked after publication.
        {graded &&
          policy.solutionAccess === 'anytime' &&
          ' Anytime allows answers to be viewed before graded submission.'}
      </p>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
