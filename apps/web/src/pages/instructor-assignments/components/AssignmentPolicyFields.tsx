import { useState, type ChangeEvent } from 'react';
import {
  assignmentLearningPolicySchema,
  solutionAccessSchema,
  type AssignmentLearningPolicy,
} from '@logiclab/contracts';

const modes = [
  {
    value: 'graded',
    label: 'Graded',
    description:
      'Final submission records correctness and a score. Feedback arrives on submission.',
  },
  {
    value: 'completion_only',
    label: 'Completion only',
    description:
      'Students can check answers before submitting. Every cell must be filled; correctness does not affect completion.',
  },
  {
    value: 'ungraded_practice',
    label: 'Ungraded practice',
    description:
      'Students can save and check repeatedly. There is no final submission or official score; practice answers stay private.',
  },
] as const;

type Props = {
  policy: AssignmentLearningPolicy;
  onChange: (policy: AssignmentLearningPolicy) => void;
};

/** Keep feedback and solution choices valid when the instructor changes assessment mode. */
export function AssignmentPolicyFields({ policy, onChange }: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  function changeMode(event: ChangeEvent<HTMLSelectElement>) {
    const mode = modes.find((choice) => choice.value === event.target.value)?.value;
    if (!mode) return;
    const resetSolutions =
      mode === 'ungraded_practice' && policy.solutionAccess === 'after_submission';
    onChange(
      assignmentLearningPolicySchema.parse({
        assessmentMode: mode,
        feedbackTiming:
          mode === 'graded'
            ? 'on_submission'
            : policy.feedbackTiming === 'immediate'
              ? 'immediate'
              : 'on_check',
        solutionAccess: resetSolutions ? 'never' : policy.solutionAccess,
      }),
    );
    setNotice(
      resetSolutions
        ? 'Practice has no final submission. Solution access was changed to Never.'
        : null,
    );
  }
  function changeTiming(event: ChangeEvent<HTMLSelectElement>) {
    onChange(
      assignmentLearningPolicySchema.parse({
        ...policy,
        feedbackTiming: event.target.value,
      }),
    );
    setNotice(null);
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
        {modes.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
      <p id="assignment-mode-help" className="help">
        {modes.find((mode) => mode.value === policy.assessmentMode)?.description}
      </p>
      <label htmlFor="assignment-feedback">Feedback timing</label>
      <select
        id="assignment-feedback"
        value={policy.feedbackTiming}
        onChange={changeTiming}
        disabled={policy.assessmentMode === 'graded'}
        aria-describedby="assignment-feedback-help"
      >
        {policy.assessmentMode === 'graded' ? (
          <option value="on_submission">On final submission</option>
        ) : (
          <>
            <option value="on_check">On explicit Check answers</option>
            <option value="immediate">Immediately after an answer changes</option>
          </>
        )}
      </select>
      <p id="assignment-feedback-help" className="help">
        {policy.feedbackTiming === 'on_submission'
          ? 'Graded work receives feedback only on final submission.'
          : policy.feedbackTiming === 'immediate'
            ? 'Incorrect entries are highlighted without revealing the answer. Manual Check answers remains available; saving is still explicit.'
            : 'Students choose Check answers to receive feedback. Saving is still explicit.'}
      </p>
      <label htmlFor="assignment-solutions">Solution access</label>
      <select
        id="assignment-solutions"
        value={policy.solutionAccess}
        onChange={changeSolutions}
        aria-describedby="assignment-solutions-help"
      >
        <option value="never">Never</option>
        {policy.assessmentMode !== 'ungraded_practice' && (
          <option value="after_submission">After final submission</option>
        )}
        <option value="anytime">Anytime</option>
      </select>
      <p id="assignment-solutions-help" className="help">
        Solution access defaults to Never. Assessment, feedback and solution settings are locked
        after publication.
      </p>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
