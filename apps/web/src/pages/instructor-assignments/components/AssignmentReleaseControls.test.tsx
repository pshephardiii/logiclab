import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AssignmentDetail } from '@logiclab/contracts';
import { AssignmentReleaseControls } from './AssignmentReleaseControls';

const assignment: AssignmentDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  classId: '22222222-2222-4222-8222-222222222222',
  title: 'Independent release',
  instructions: null,
  items: [],
  assessmentMode: 'graded',
  feedbackTiming: 'on_submission',
  gradeReleaseTiming: 'instructor_release',
  solutionAccess: 'instructor_release',
  publishedAt: '2026-10-29T12:00:00Z',
  archivedAt: null,
  createdAt: '2026-10-29T12:00:00Z',
  updatedAt: '2026-10-29T12:00:00Z',
};

test('each action requires its own confirmation and supports cancel and explicit retry', async () => {
  const user = userEvent.setup();
  const onRelease = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  render(<AssignmentReleaseControls assignment={assignment} busy={false} onRelease={onRelease} />);
  await user.click(screen.getByRole('button', { name: 'Release grades' }));
  expect(onRelease).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Cancel release' }));
  expect(screen.queryByRole('group', { name: 'Confirm release' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reveal answers' }));
  await user.click(screen.getByRole('button', { name: 'Confirm answer reveal' }));
  expect(onRelease).toHaveBeenLastCalledWith('reveal-answers');
  expect(screen.getByRole('group', { name: 'Confirm release' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Confirm answer reveal' }));
  expect(onRelease).toHaveBeenCalledTimes(2);
  await user.click(screen.getByRole('button', { name: 'Release grades' }));
  await user.click(screen.getByRole('button', { name: 'Confirm grade release' }));
  expect(onRelease).toHaveBeenLastCalledWith('release-grades');
});

test('completion only has answer actions and busy/archive/released states block duplicate actions', () => {
  const onRelease = vi.fn();
  const { rerender } = render(
    <AssignmentReleaseControls
      assignment={{
        ...assignment,
        assessmentMode: 'completion_only',
        gradeReleaseTiming: 'on_submission',
      }}
      busy={false}
      onRelease={onRelease}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Release grades' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Answer reveal' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reveal answers' })).toBeEnabled();
  rerender(<AssignmentReleaseControls assignment={assignment} busy={true} onRelease={onRelease} />);
  expect(screen.getByRole('button', { name: 'Release grades' })).toBeDisabled();
  rerender(
    <AssignmentReleaseControls
      assignment={{ ...assignment, archivedAt: assignment.createdAt }}
      busy={false}
      onRelease={onRelease}
    />,
  );
  expect(screen.getByRole('button', { name: 'Reveal answers' })).toBeDisabled();
  rerender(
    <AssignmentReleaseControls
      assignment={{
        ...assignment,
        gradesReleasedAt: assignment.createdAt,
        answersRevealedAt: assignment.createdAt,
      }}
      busy={false}
      onRelease={onRelease}
    />,
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText(/Grades released/)).toBeInTheDocument();
  expect(screen.getByText(/Answers revealed/)).toBeInTheDocument();
});

test('completion answer confirmation does not imply a grade-release control', async () => {
  const user = userEvent.setup();
  render(
    <AssignmentReleaseControls
      assignment={{
        ...assignment,
        assessmentMode: 'completion_only',
        gradeReleaseTiming: 'on_submission',
      }}
      busy={false}
      onRelease={vi.fn()}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Reveal answers' }));
  expect(screen.getByRole('group', { name: 'Confirm release' })).toHaveTextContent(
    'Completion status will not change',
  );
  expect(screen.getByRole('group', { name: 'Confirm release' })).not.toHaveTextContent(
    'Grade release',
  );
});
