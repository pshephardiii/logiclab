import { installDialogStub, renderWithUnsavedWork as render } from '../../../../test/unsaved-work';
import { initialGrading, adjustedGrading } from '../../../../test/submission-grading-fixture';
import { pointScore } from '../../../../test/assignment-score-fixture';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import * as api from '../../../api/submission-review/api';
import { review } from '../../../../test/assignment-work-fixture';
import { SubmissionReview } from './SubmissionReview';

installDialogStub();

vi.mock('../../../api/submission-review/api', () => ({
  listSubmissions: vi.fn(),
  readSubmission: vi.fn(),
  readGrading: vi.fn(),
  saveGrading: vi.fn(),
  readGradingHistory: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.readGrading).mockImplementation(async () => structuredClone(initialGrading));
  vi.mocked(api.saveGrading).mockResolvedValue(adjustedGrading);
  vi.mocked(api.readGradingHistory).mockResolvedValue({ revisions: [], nextOffset: null });
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

test.each(['fitch', 'dependency', 'tree'] as const)(
  'completion review flags retained proof mistakes and displays read-only diagnostics without points or reference answers (%s)',
  async (format) => {
    const source = await import('../../../../test/proof-work-fixture');
    const { dependencyAnswer } = await import('../../../../test/dependency-work-fixture');
    const proofCompletionWork =
      format === 'fitch'
        ? source.proofCompletionWork
        : {
            ...source.proofCompletionWork,
            items: source.proofCompletionWork.items.map((item) =>
              'content' in item && item.content.type === 'derivation'
                ? {
                    ...item,
                    content:
                      format === 'tree'
                        ? { ...item.content, format: 'tree' as const }
                        : { ...item.content, format: 'dependency' as const },
                  }
                : item,
            ),
          };
    const proofCompletionFinal =
      format === 'fitch'
        ? source.proofCompletionFinal
        : {
            ...source.proofCompletionFinal,
            answers: Object.fromEntries(
              Object.keys(source.proofCompletionFinal.answers).map((id) => [
                id,
                structuredClone(format === 'tree' ? source.treeAnswer : dependencyAnswer),
              ]),
            ),
          };
    if (proofCompletionFinal.result?.gradingVersion !== 'proof_completion_v1')
      throw new Error('Expected completion');
    const submission = {
      ...review.submission,
      id: proofCompletionFinal.id,
      submittedAt: proofCompletionFinal.submittedAt!,
      summary: proofCompletionFinal.result.summary,
    };
    vi.mocked(api.listSubmissions).mockResolvedValue({
      submissions: [submission],
      nextOffset: null,
    });
    vi.mocked(api.readSubmission).mockResolvedValue({
      submission,
      assignment: proofCompletionWork,
      attempt: {
        ...proofCompletionFinal,
        result: proofCompletionFinal.result,
        submittedAt: proofCompletionFinal.submittedAt!,
        gradePending: false,
        score: undefined,
      },
    });
    const user = userEvent.setup();
    render(<SubmissionReview assignmentId={proofCompletionWork.id} />);
    expect(await screen.findByText(/Completed — verified: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Completed — errors found: 1/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'student@example.test' }));
    await screen.findByRole('heading', { name: 'Problem 1: First proof' });
    await user.selectOptions(
      screen.getByLabelText('Submitted problem'),
      proofCompletionWork.items[1]!.id,
    );
    expect(await screen.findByText(/Premise does not match/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Point score')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Formula for line 1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Formula for node 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
    expect(screen.queryByText('Instructor solution')).not.toBeInTheDocument();
  },
);

test('unavailable completion verification is labeled separately from logical mistakes', async () => {
  vi.mocked(api.listSubmissions).mockResolvedValue({
    submissions: [
      {
        ...review.submission,
        summary: {
          completedResponses: 1,
          totalResponses: 1,
          proofVerification: { verified: 0, errorsFound: 0, unavailable: 1, total: 1 },
        },
      },
    ],
    nextOffset: null,
  });
  render(<SubmissionReview assignmentId={review.assignment.id} />);
  expect(await screen.findByText(/Completed — verification unavailable: 1/)).toBeInTheDocument();
  expect(screen.queryByText(/Completed — errors found/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Point score')).not.toBeInTheDocument();
});

test('grading edits survive problem selection and Stay, while a saved correction updates list and detail', async () => {
  const scored = {
    ...review,
    submission: { ...review.submission, score: pointScore },
    attempt: { ...review.attempt, score: pointScore },
  };
  vi.mocked(api.listSubmissions).mockResolvedValue({
    submissions: [scored.submission],
    nextOffset: null,
  });
  vi.mocked(api.readSubmission).mockResolvedValue(scored);
  const user = userEvent.setup();
  render(<SubmissionReview assignmentId={review.assignment.id} />);
  await user.click(await screen.findByRole('button', { name: 'student@example.test' }));
  await screen.findByText('Grading revision 0.');
  await user.type(screen.getByLabelText('Comment for problem 1'), 'Keep draft');
  await user.selectOptions(
    screen.getByLabelText('Submitted problem'),
    review.assignment.items[1]!.id,
  );
  expect(screen.getByLabelText('Comment for problem 1')).toHaveValue('Keep draft');
  await user.click(screen.getByRole('button', { name: 'student@example.test' }));
  await user.click(screen.getByRole('button', { name: 'Stay' }));
  expect(api.readSubmission).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Submitted problem')).toHaveValue(review.assignment.items[1]!.id);
  await user.click(screen.getByLabelText('Use automatic award for problem 1'));
  await user.type(screen.getByLabelText('Points for problem 1'), '12.25');
  await user.clear(screen.getByLabelText('Comment for problem 1'));
  await user.type(screen.getByLabelText('Comment for problem 1'), 'Review the justification.');
  await user.click(screen.getByRole('button', { name: 'Save instructor grading' }));
  await screen.findByText('Instructor grading saved.');
  expect(screen.getAllByText('12.25 / 25 points (49%)')).toHaveLength(2);
  await user.selectOptions(
    screen.getByLabelText('Submitted problem'),
    review.assignment.items[0]!.id,
  );
  expect(screen.getByText('Incorrect', { exact: true })).toBeInTheDocument();
});

test('an explicit zero resolves a flagged proof, while restoring automatic grading reopens review without changing diagnostics', async () => {
  const { proofWork, proofFinal, itemB } = await import('../../../../test/proof-work-fixture');
  if (!proofFinal.score || proofFinal.result?.gradingVersion !== 'proof_mixed_v1')
    throw new Error('Expected graded proof fixture.');
  const assignment = {
    ...proofWork,
    assessmentMode: 'graded' as const,
    feedbackTiming: 'on_submission' as const,
  };
  const submission = {
    ...review.submission,
    id: proofFinal.id,
    submittedAt: proofFinal.submittedAt!,
    summary: proofFinal.result.summary,
    score: proofFinal.score,
  };
  vi.mocked(api.listSubmissions).mockResolvedValue({ submissions: [submission], nextOffset: null });
  vi.mocked(api.readSubmission).mockResolvedValue({ submission, assignment, attempt: proofFinal });
  vi.mocked(api.readGrading).mockResolvedValue({ ...initialGrading, score: proofFinal.score });
  const decision = {
    itemId: itemB,
    earnedPoints: 0,
    comment: 'Missing the derivation.',
    reviewedBy: review.submission.student.id,
    reviewedAt: '2026-11-03T12:00:00.000Z',
  };
  const resolved = {
    grading: { ...initialGrading.grading, revision: 1, items: [decision] },
    score: {
      ...proofFinal.score,
      items: proofFinal.score.items.map((item) =>
        item.itemId === itemB ? { ...item, status: 'graded' as const, earnedPoints: 0 } : item,
      ),
      summary: { status: 'graded' as const, maxPoints: 35, earnedPoints: 20, percentage: 57.14 },
    },
  };
  vi.mocked(api.saveGrading)
    .mockResolvedValueOnce(resolved)
    .mockResolvedValueOnce({
      grading: { ...resolved.grading, revision: 2, items: [{ ...decision, earnedPoints: null }] },
      score: proofFinal.score,
    });
  const user = userEvent.setup();
  render(<SubmissionReview assignmentId={assignment.id} />);
  await user.click(await screen.findByRole('button', { name: 'student@example.test' }));
  await screen.findByText('Grading revision 0.');
  await user.selectOptions(screen.getByLabelText('Submitted problem'), itemB);
  expect(screen.getByText('No proof entered.')).toBeInTheDocument();
  await user.click(screen.getByLabelText('Use automatic award for problem 2'));
  await user.type(screen.getByLabelText('Points for problem 2'), '0');
  await user.type(screen.getByLabelText('Comment for problem 2'), 'Missing the derivation.');
  await user.click(screen.getByRole('button', { name: 'Save instructor grading' }));
  await screen.findByText('Grading revision 1.');
  expect(screen.getAllByText('20 / 35 points (57.14%)')).toHaveLength(2);
  expect(screen.getByText('No proof entered.')).toBeInTheDocument();
  await user.click(screen.getByLabelText('Use automatic award for problem 2'));
  await user.click(screen.getByRole('button', { name: 'Save instructor grading' }));
  await screen.findByText('Grading revision 2.');
  expect(screen.getAllByText('Needs instructor review · 35 points available')).toHaveLength(2);
  expect(screen.getByText('No proof entered.')).toBeInTheDocument();
  expect(api.readGrading).toHaveBeenCalledTimes(1);
});
