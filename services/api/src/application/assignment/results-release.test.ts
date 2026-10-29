import { canViewAssignedSolution } from './learning-policy';
import { gradeReleaseTimingSchema } from '@logiclab/contracts';
import { canViewAssignmentResults } from './results-release';

test('grade timing accepts only supported grade release policies', () => {
  expect(gradeReleaseTimingSchema.parse('on_submission')).toBe('on_submission');
  expect(gradeReleaseTimingSchema.parse('instructor_release')).toBe('instructor_release');
  expect(gradeReleaseTimingSchema.safeParse('immediate').success).toBe(false);
  expect(gradeReleaseTimingSchema.safeParse(undefined).success).toBe(false);
});

test('graded work requires submission and the configured grade release condition', () => {
  for (const gradeReleaseTiming of ['on_submission', 'instructor_release'] as const) {
    for (const submitted of [false, true]) {
      for (const gradesReleased of [false, true]) {
        expect(
          canViewAssignmentResults({
            assessmentMode: 'graded',
            gradeReleaseTiming,
            submitted,
            gradesReleased,
          }),
        ).toBe(submitted && (gradeReleaseTiming === 'on_submission' || gradesReleased));
      }
    }
  }
});

test.each([false, true])('completion status is visible exactly when submitted=%s', (submitted) => {
  expect(canViewAssignmentResults({ assessmentMode: 'completion_only', submitted })).toBe(
    submitted,
  );
});

test.each([false, true])(
  'private practice has no official results even when submitted=%s',
  (submitted) => {
    expect(canViewAssignmentResults({ assessmentMode: 'ungraded_practice', submitted })).toBe(
      false,
    );
  },
);

test('manual answer reveal is independent of submission and grade release', () => {
  for (const assessmentMode of ['graded', 'completion_only'] as const) {
    for (const submitted of [false, true]) {
      for (const revealed of [false, true]) {
        expect(
          canViewAssignedSolution(
            {
              assessmentMode,
              feedbackTiming: 'on_submission',
              solutionAccess: 'instructor_release',
            },
            submitted,
            revealed,
          ),
        ).toBe(revealed);
      }
    }
  }
});
