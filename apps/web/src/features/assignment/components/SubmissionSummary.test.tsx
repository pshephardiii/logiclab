import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { SubmissionSummary } from './SubmissionSummary';
import { submissionFeedback } from '../helpers/submission-feedback';

test('completion summaries show completion without a correctness score or feedback', () => {
  const result = {
    gradingVersion: 'completion_v1' as const,
    items: [{ itemId: 'item', completedCells: 4, totalCells: 4 }],
    summary: { completedCells: 4, totalCells: 4 },
  };
  render(<SubmissionSummary result={result} submittedAt="2026-10-22T12:00:00Z" />);
  expect(
    screen.getByText('Completed 4 of 4 cells. No correctness score is recorded.'),
  ).toBeTruthy();
  expect(screen.queryByText(/incorrect/)).toBeNull();
  expect(submissionFeedback(result, 'item')).toBeNull();
});
