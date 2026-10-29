import type { GradeReleaseTiming } from '@logiclab/contracts';

type ResultVisibilityInput =
  | {
      assessmentMode: 'graded';
      gradeReleaseTiming: GradeReleaseTiming;
      gradesReleased: boolean;
      submitted: boolean;
    }
  | {
      assessmentMode: 'completion_only';
      submitted: boolean;
    }
  | {
      assessmentMode: 'ungraded_practice';
      submitted: boolean;
    };

/** Disclosure only: callers still authorize enrollment and project the student response. */
export function canViewAssignmentResults(input: ResultVisibilityInput): boolean {
  if (!input.submitted || input.assessmentMode === 'ungraded_practice') return false;
  if (input.assessmentMode === 'completion_only') return true;
  return input.gradeReleaseTiming === 'on_submission' || input.gradesReleased;
}
