import {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
} from '@logiclab/contracts/assignment-policy-values';
import { assignmentPolicyTransition } from '../helpers/assignment-policy-transition';
import { useState, type ChangeEvent } from 'react';
import {
  assignmentLearningPolicySchema,
  gradeReleaseTimingSchema,
  solutionAccessSchema,
  type AssignmentLearningPolicy,
  GradeReleaseTiming,
} from '@logiclab/contracts';

type Props = {
  policy: AssignmentLearningPolicy;
  containsProof?: boolean;
  onChange: (policy: AssignmentLearningPolicy) => void;
  gradeReleaseTiming: GradeReleaseTiming;
  onGradeReleaseChange: (timing: GradeReleaseTiming) => void;
};

/** Mode changes establish valid defaults; restored legacy assistance remains explicit. */
export function AssignmentPolicyFields({
  policy,
  containsProof = false,
  onChange,
  gradeReleaseTiming,
  onGradeReleaseChange,
}: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const practice = policy.assessmentMode === AssessmentMode.UngradedPractice;
  const graded = policy.assessmentMode === AssessmentMode.Graded;

  const legacyAssistance =
    policy.assessmentMode === AssessmentMode.CompletionOnly &&
    policy.feedbackTiming !== FeedbackTiming.OnSubmission;

  function changeMode(event: ChangeEvent<HTMLSelectElement>) {
    const assessmentMode = event.target.value;
    const next = assignmentPolicyTransition(policy, assessmentMode);

    onChange(next.policy);

    if (assessmentMode !== AssessmentMode.Graded)
      onGradeReleaseChange(GradeReleaseTiming.OnSubmission);

    setNotice(
      next.resetSolutions
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
        <option value={AssessmentMode.Graded}>Graded</option>
        <option value={AssessmentMode.CompletionOnly}>Completion only</option>
        <option value={AssessmentMode.UngradedPractice}>Ungraded practice</option>
      </select>
      <p id="assignment-mode-help" className="help">
        {graded
          ? 'Final submission records correctness and a score. Grade release and answer reveal are independent.'
          : practice
            ? 'Students can save and check repeatedly. There is no final submission or official score; practice answers stay private.'
            : containsProof
              ? 'Fill every cell, answer every question and finish each proof attempt before submission. Proof diagnostics appear after submission; logical mistakes do not remove completion credit. No correctness score or grade-release control.'
              : 'Fill every cell and answer every question. Correctness does not affect completion. No correctness score or grade-release control.'}
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
            <option value={GradeReleaseTiming.OnSubmission}>At submission</option>
            <option value={GradeReleaseTiming.InstructorRelease}>When I release grades</option>
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
              <option value={FeedbackTiming.OnSubmission}>
                At submission (no pre-submission checks)
              </option>
            )}
            <option value={FeedbackTiming.OnCheck}>On explicit Check answers</option>
            <option value={FeedbackTiming.Immediate}>Immediately after an answer changes</option>
          </select>
          <p id="assignment-feedback-help" className="help">
            {legacyAssistance &&
              'This saved completion policy retains legacy pre-submission assistance. '}
            {policy.feedbackTiming === FeedbackTiming.Immediate
              ? 'Incorrect entries are highlighted without revealing the answer key. Manual Check answers remains available; saving is still explicit.'
              : 'Students choose Check answers for correctness feedback. Saving is still explicit.'}
            {containsProof && ' Derivations and truth trees use explicit check buttons.'}
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
        <option value={SolutionAccess.Never}>Never</option>
        {!practice && (
          <>
            <option value={SolutionAccess.AfterSubmission}>After final submission</option>
            <option value={SolutionAccess.InstructorRelease}>When I reveal answers</option>
          </>
        )}
        <option value={SolutionAccess.Anytime}>Anytime</option>
      </select>
      <p id="assignment-solutions-help" className="help">
        {policy.solutionAccess === SolutionAccess.Never
          ? 'Students cannot reveal the correct answers through solution controls, even after submission.'
          : policy.solutionAccess === SolutionAccess.AfterSubmission
            ? 'Students may reveal the correct answers only after final submission.'
            : policy.solutionAccess === SolutionAccess.InstructorRelease
              ? 'Answers remain hidden until you explicitly reveal them. This is independent of grade release.'
              : 'Students may reveal the correct answers at any time, even before attempting the problems.'}{' '}
        These settings are locked after publication.
        {graded &&
          policy.solutionAccess === SolutionAccess.Anytime &&
          ' Anytime allows answers to be viewed before graded submission.'}
      </p>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
