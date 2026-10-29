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
