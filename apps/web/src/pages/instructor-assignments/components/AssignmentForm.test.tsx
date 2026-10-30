import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AssignmentDetail } from '@logiclab/contracts';
import { AssignmentForm } from './AssignmentForm';

vi.mock('./PublishedProblemPicker', () => ({ PublishedProblemPicker: () => null }));

const assignment: AssignmentDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  classId: '22222222-2222-4222-8222-222222222222',
  title: 'Immediate practice',
  instructions: null,
  assessmentMode: 'ungraded_practice',
  feedbackTiming: 'immediate',
  solutionAccess: 'never',
  publishedAt: null,
  archivedAt: null,
  createdAt: '2026-10-23T12:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
  items: [],
};

test('timing edits mark the draft dirty and survive a failed save for retry', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const onDirty = vi.fn();
  render(
    <AssignmentForm
      assignment={{ ...assignment, feedbackTiming: 'on_check' }}
      busy={false}
      onSave={onSave}
      onDirty={onDirty}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Feedback timing'), 'immediate');
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true));
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Feedback timing')).toHaveValue('immediate');
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({
      feedbackTiming: 'immediate',
      assessmentMode: 'ungraded_practice',
      solutionAccess: 'never',
    }),
    false,
  );
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  expect(onSave.mock.calls[1]).toEqual(onSave.mock.calls[0]);
});

test.each(['publishedAt', 'archivedAt'] as const)(
  '%s locks the restored immediate policy',
  (field) => {
    render(
      <AssignmentForm
        assignment={{ ...assignment, [field]: assignment.createdAt }}
        busy={false}
        onSave={vi.fn()}
        onDirty={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Feedback timing')).toHaveValue('immediate');
    expect(screen.getByLabelText('Feedback timing')).toBeDisabled();
    expect(screen.getByLabelText('Assessment mode')).toBeDisabled();
    expect(screen.getByLabelText('Answer reveal')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save assignment draft' })).not.toBeInTheDocument();
  },
);

test('grade timing and answer access save independently, retain failed edits and reset grade timing for completion', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(false);
  const onDirty = vi.fn();
  render(
    <AssignmentForm
      assignment={{ ...assignment, assessmentMode: 'graded', feedbackTiming: 'on_submission' }}
      busy={false}
      onSave={onSave}
      onDirty={onDirty}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Grade release'), 'instructor_release');
  expect(screen.getByLabelText('Answer reveal')).toHaveValue('never');
  await user.selectOptions(screen.getByLabelText('Answer reveal'), 'instructor_release');
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({
      gradeReleaseTiming: 'instructor_release',
      solutionAccess: 'instructor_release',
    }),
    false,
  );
  expect(screen.getByLabelText('Grade release')).toHaveValue('instructor_release');
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true));
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'completion_only');
  expect(screen.queryByLabelText('Grade release')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Feedback timing')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Answer reveal')).toHaveValue('instructor_release');
  await user.click(screen.getByRole('button', { name: 'Save assignment draft' }));
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({
      assessmentMode: 'completion_only',
      feedbackTiming: 'on_submission',
      gradeReleaseTiming: 'on_submission',
      solutionAccess: 'instructor_release',
    }),
    false,
  );
});

test('published work locks independent grade and answer policies', () => {
  render(
    <AssignmentForm
      assignment={{
        ...assignment,
        assessmentMode: 'graded',
        feedbackTiming: 'on_submission',
        gradeReleaseTiming: 'instructor_release',
        solutionAccess: 'instructor_release',
        publishedAt: assignment.createdAt,
      }}
      busy={false}
      onSave={vi.fn()}
      onDirty={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('Grade release')).toHaveValue('instructor_release');
  expect(screen.getByLabelText('Grade release')).toBeDisabled();
  expect(screen.getByLabelText('Answer reveal')).toHaveValue('instructor_release');
  expect(screen.getByLabelText('Answer reveal')).toBeDisabled();
});

const weighted: AssignmentDetail = {
  ...assignment,
  assessmentMode: 'graded',
  feedbackTiming: 'on_submission',
  items: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      position: 1,
      maxPoints: 20,
      problemVersion: {
        id: '44444444-4444-4444-8444-444444444444',
        problemId: '55555555-5555-4555-8555-555555555555',
        version: 1,
        title: 'Table',
        instructions: null,
        publishedAt: assignment.createdAt,
        definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
      },
    },
  ],
};

test.each(['0', '1001', '1.5'])(
  'invalid allocation %s blocks saving without losing the entry',
  async (value) => {
    const user = userEvent.setup();
    const save = vi.fn();
    const dirty = vi.fn();
    render(<AssignmentForm assignment={weighted} busy={false} onSave={save} onDirty={dirty} />);
    const input = screen.getByLabelText('Points for problem 1');
    await user.clear(input);
    await user.type(input, value);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter whole points');
    expect(screen.getByRole('button', { name: 'Save assignment draft' })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
    expect(dirty).toHaveBeenLastCalledWith(true);
    await user.clear(input);
    await user.type(input, '20');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(false));
  },
);

test.each(['publishedAt', 'archivedAt'] as const)('%s locks allocation controls', (field) => {
  render(
    <AssignmentForm
      assignment={{ ...weighted, [field]: assignment.createdAt }}
      busy={false}
      onSave={vi.fn()}
      onDirty={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('Points for problem 1')).toHaveValue(20);
  expect(screen.getByLabelText('Points for problem 1')).toBeDisabled();
});

test('score-free modes hide allocations and restoring graded mode retains the draft weight', async () => {
  const user = userEvent.setup();
  render(<AssignmentForm assignment={weighted} busy={false} onSave={vi.fn()} onDirty={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'completion_only');
  expect(screen.queryByLabelText('Points for problem 1')).not.toBeInTheDocument();
  expect(screen.queryByText(/Total available/)).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Assessment mode'), 'graded');
  expect(screen.getByLabelText('Points for problem 1')).toHaveValue(20);
});
