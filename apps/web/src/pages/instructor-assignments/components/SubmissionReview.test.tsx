import { pointScore } from '../../../../test/assignment-score-fixture';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import * as api from '../../../api/submission-review/api';
import { review } from '../../../../test/assignment-work-fixture';
import { SubmissionReview } from './SubmissionReview';

vi.mock('../../../api/submission-review/api', () => ({
  listSubmissions: vi.fn(),
  readSubmission: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listSubmissions).mockResolvedValue({
    submissions: [review.submission],
    nextOffset: null,
  });
  vi.mocked(api.readSubmission).mockResolvedValue(review);
});

test('instructor review displays frozen answers and feedback read-only', async () => {
  const user = userEvent.setup();
  render(<SubmissionReview assignmentId={review.assignment.id} />);
  await user.click(await screen.findByRole('button', { name: 'student@example.test' }));
  await screen.findByRole('heading', { name: 'Problem 1: First occurrence' });
  const answers = within(screen.getByRole('group', { name: 'Truth-table answers' })).getAllByRole(
    'combobox',
  );
  expect(answers[0]).toHaveValue('F');
  expect(answers[0]).toBeDisabled();
  expect(screen.getByText('Incorrect', { exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save problem' })).not.toBeInTheDocument();
  expect(api.readSubmission).toHaveBeenCalledWith(
    review.assignment.id,
    review.attempt.id,
    expect.any(AbortSignal),
  );
});

test('final-submission lists paginate and failed detail reads can be retried', async () => {
  const second = {
    ...review.submission,
    id: 'b1111111-1111-4111-8111-111111111111',
    student: { ...review.submission.student, email: 'other@example.test' },
  };
  vi.mocked(api.listSubmissions)
    .mockResolvedValueOnce({ submissions: [review.submission], nextOffset: 20 })
    .mockResolvedValueOnce({ submissions: [second], nextOffset: null });
  vi.mocked(api.readSubmission)
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce({ ...review, submission: second });
  const user = userEvent.setup();
  render(<SubmissionReview assignmentId={review.assignment.id} />);
  await user.click(await screen.findByRole('button', { name: 'Load more submissions' }));
  await user.click(await screen.findByRole('button', { name: 'other@example.test' }));
  await user.click(await screen.findByRole('button', { name: 'Retry submission' }));
  await screen.findByRole('heading', { name: 'Problem 1: First occurrence' });
  expect(screen.queryByRole('button', { name: 'Load more submissions' })).not.toBeInTheDocument();
});

test('conceptual final review shows the frozen selection/status without an explanation or editable controls', async () => {
  const { conceptualWork, conceptualSaved } =
    await import('../../../../test/conceptual-work-fixture');
  const result = {
    gradingVersion: 'mixed_v1' as const,
    items: [
      {
        type: 'true_false' as const,
        itemId: conceptualWork.items[0]!.id,
        feedback: { status: 'correct' as const },
      },
    ],
    summary: { correct: 1, incorrect: 0, unanswered: 1, total: 2 },
  };
  vi.mocked(api.readSubmission).mockResolvedValue({
    ...review,
    assignment: conceptualWork,
    attempt: { ...conceptualSaved, submittedAt: review.attempt.submittedAt, result },
  });
  const user = userEvent.setup();
  render(<SubmissionReview assignmentId={conceptualWork.id} />);
  await user.click(await screen.findByRole('button', { name: 'student@example.test' }));
  expect(await screen.findByLabelText('False')).toBeChecked();
  expect(screen.getByLabelText('False')).toBeDisabled();
  expect(screen.getByText('✓ Correct')).toBeInTheDocument();
  expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Clear answer' })).not.toBeInTheDocument();
});

test('instructor list and detail show the retained point score', async () => {
  vi.mocked(api.listSubmissions).mockResolvedValue({
    submissions: [{ ...review.submission, score: pointScore }],
    nextOffset: null,
  });
  vi.mocked(api.readSubmission).mockResolvedValue({
    ...review,
    attempt: { ...review.attempt, score: pointScore },
  });
  const user = userEvent.setup();
  render(<SubmissionReview assignmentId={review.assignment.id} />);
  expect(await screen.findByText('5 / 25 points (20%)')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'student@example.test' }));
  await screen.findByRole('heading', { name: 'Problem 1: First occurrence' });
  expect(screen.getAllByText('5 / 25 points (20%)')).toHaveLength(2);
});
