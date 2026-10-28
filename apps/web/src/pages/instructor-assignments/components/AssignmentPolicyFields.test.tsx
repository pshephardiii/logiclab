import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { AssignmentLearningPolicy } from '@logiclab/contracts';
import { AssignmentPolicyFields } from './AssignmentPolicyFields';

function Editor({ initial }: { initial: AssignmentLearningPolicy }) {
  const [policy, setPolicy] = useState(initial);
  return <AssignmentPolicyFields policy={policy} onChange={setPolicy} />;
}

test('switching to practice removes impossible after-submission access and announces the safe replacement', async () => {
  const user = userEvent.setup();
  render(
    <Editor
      initial={{
        assessmentMode: 'graded',
        feedbackTiming: 'on_submission',
        solutionAccess: 'after_submission',
      }}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'completion_only');
  expect(screen.getByLabelText('Solution access')).toHaveValue('after_submission');
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('on_check');
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'ungraded_practice');
  expect(screen.getByLabelText('Solution access')).toHaveValue('never');
  expect(screen.queryByRole('option', { name: 'After final submission' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Solution access was changed to Never');
  await user.selectOptions(screen.getByLabelText('Solution access'), 'anytime');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'graded');
  expect(screen.getByLabelText('Solution access')).toHaveValue('anytime');
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('on_submission');
  expect(screen.getByLabelText('Feedback timing')).toBeDisabled();
});

test('restores saved practice policy and explains that answers are private with no final submission', () => {
  render(
    <Editor
      initial={{
        assessmentMode: 'ungraded_practice',
        feedbackTiming: 'on_check',
        solutionAccess: 'anytime',
      }}
    />,
  );
  expect(screen.getByLabelText('Assessment mode')).toHaveValue('ungraded_practice');
  expect(screen.getByLabelText('Solution access')).toHaveValue('anytime');
  expect(screen.getByText(/practice answers stay private/)).toBeInTheDocument();
});

test('preserves immediate timing between non-graded modes and resets it when choosing graded work', async () => {
  const user = userEvent.setup();
  render(
    <Editor
      initial={{
        assessmentMode: 'completion_only',
        feedbackTiming: 'on_check',
        solutionAccess: 'anytime',
      }}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Feedback timing'), 'immediate');
  expect(screen.getByText(/Manual Check answers remains available/)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'ungraded_practice');
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('immediate');
  expect(screen.getByLabelText('Solution access')).toHaveValue('anytime');
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'completion_only');
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('immediate');
  await user.selectOptions(screen.getByLabelText('Feedback timing'), 'on_check');
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('on_check');
  await user.selectOptions(screen.getByLabelText('Feedback timing'), 'immediate');
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'graded');
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('on_submission');
  expect(screen.getByLabelText('Feedback timing')).toBeDisabled();
  expect(
    screen.queryByRole('option', { name: 'Immediately after an answer changes' }),
  ).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'ungraded_practice');
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('on_check');
});

test('restores a saved immediate policy without changing solution access', () => {
  render(
    <Editor
      initial={{
        assessmentMode: 'completion_only',
        feedbackTiming: 'immediate',
        solutionAccess: 'after_submission',
      }}
    />,
  );
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('immediate');
  expect(screen.getByLabelText('Solution access')).toHaveValue('after_submission');
});

test('explains correctness feedback separately from solution release', async () => {
  const user = userEvent.setup();
  render(
    <Editor
      initial={{
        assessmentMode: 'graded',
        feedbackTiming: 'on_submission',
        solutionAccess: 'after_submission',
      }}
    />,
  );
  expect(screen.getByLabelText('Feedback timing')).toHaveAccessibleDescription(
    /correct\/incorrect feedback and a score only on final submission/,
  );
  expect(screen.getByLabelText('Solution access')).toHaveAccessibleDescription(
    /reveal the correct answers only after final submission/,
  );
  await user.selectOptions(screen.getByLabelText('Solution access'), 'never');
  expect(screen.getByLabelText('Solution access')).toHaveAccessibleDescription(
    /even after submission/,
  );
  await user.selectOptions(screen.getByLabelText('Solution access'), 'anytime');
  expect(screen.getByLabelText('Solution access')).toHaveAccessibleDescription(
    /before graded submission/,
  );
  expect(screen.getByLabelText('Feedback timing')).toBeDisabled();
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('on_submission');
});
