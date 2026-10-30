import { pointScore } from '../../../../test/assignment-score-fixture';
import { submitted, work } from '../../../../test/assignment-work-fixture';
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

test('mixed completion summaries count responses without correctness feedback', () => {
  const result = {
    gradingVersion: 'mixed_completion_v1' as const,
    items: [
      { type: 'true_false' as const, itemId: 'item', completedResponses: 1, totalResponses: 1 },
    ],
    summary: { completedResponses: 1, totalResponses: 1 },
  };
  render(<SubmissionSummary result={result} submittedAt="2026-10-29T12:00:00Z" />);
  expect(
    screen.getByText('Completed 1 of 1 responses. No correctness score is recorded.'),
  ).toBeTruthy();
  expect(screen.queryByText(/incorrect/)).toBeNull();
  expect(submissionFeedback(result, 'item')).toBeNull();
});

test('mixed graded results retain table feedback while conceptual statuses stay distinct', () => {
  const tableFeedback = {
    cells: [],
    summary: { correct: 0, incorrect: 0, unanswered: 1, total: 1 },
  };
  const result = {
    gradingVersion: 'mixed_v1' as const,
    items: [
      { type: 'truth_table' as const, itemId: 'table', feedback: tableFeedback },
      { type: 'true_false' as const, itemId: 'choice', feedback: { status: 'correct' as const } },
    ],
    summary: { correct: 1, incorrect: 0, unanswered: 1, total: 2 },
  };
  render(<SubmissionSummary result={result} submittedAt="2026-10-29T12:00:00Z" />);
  expect(screen.getByText('1 correct · 0 incorrect · 1 unanswered · 2 responses')).toBeTruthy();
  expect(submissionFeedback(result, 'table')).toEqual(tableFeedback);
  expect(submissionFeedback(result, 'choice')).toBeNull();
});

test('official point totals and occurrence scores remain distinct from correctness counts', () => {
  render(
    <SubmissionSummary
      result={submitted.result!}
      submittedAt={submitted.submittedAt!}
      score={pointScore}
      items={work.items}
    />,
  );
  expect(screen.getByText('5 / 25 points (20%)')).toBeInTheDocument();
  expect(screen.getByText(/Problem 1: First occurrence/)).toHaveTextContent('5 / 20 points');
  expect(screen.getByText(/Problem 2: Second occurrence/)).toHaveTextContent('0 / 5 points');
});

test('unresolved review has no invented zero total or percentage', () => {
  render(
    <SubmissionSummary
      result={submitted.result!}
      submittedAt={submitted.submittedAt!}
      score={{
        ...pointScore,
        items: [
          { ...pointScore.items[0]!, status: 'needs_review', earnedPoints: null },
          pointScore.items[1]!,
        ],
        summary: { status: 'needs_review', maxPoints: 25, earnedPoints: null, percentage: null },
      }}
    />,
  );
  expect(screen.getByText('Needs instructor review · 25 points available')).toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});
