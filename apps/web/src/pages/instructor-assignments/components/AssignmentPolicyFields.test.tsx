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
  expect(screen.getByText('Feedback: On explicit Check answers.')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'ungraded_practice');
  expect(screen.getByLabelText('Solution access')).toHaveValue('never');
  expect(screen.queryByRole('option', { name: 'After final submission' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Solution access was changed to Never');
  await user.selectOptions(screen.getByLabelText('Solution access'), 'anytime');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'graded');
  expect(screen.getByLabelText('Solution access')).toHaveValue('anytime');
  expect(screen.getByText('Feedback: On final submission.')).toBeInTheDocument();
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
