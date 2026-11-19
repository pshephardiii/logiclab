import { AssessmentMode } from '@logiclab/contracts/assignment-policy-values';
import { GradeReleaseTiming } from '@logiclab/contracts';

type ResultVisibilityInput =
  | {
      assessmentMode: typeof AssessmentMode.Graded;
      gradeReleaseTiming: GradeReleaseTiming;
      gradesReleased: boolean;
      submitted: boolean;
    }
  | {
      assessmentMode: typeof AssessmentMode.CompletionOnly;
      submitted: boolean;
    }
  | {
      assessmentMode: typeof AssessmentMode.UngradedPractice;
      submitted: boolean;
    };

/** Disclosure only: callers still authorize enrollment and project the student response. */
export function canViewAssignmentResults(input: ResultVisibilityInput): boolean {
  if (!input.submitted || input.assessmentMode === AssessmentMode.UngradedPractice) return false;

  if (input.assessmentMode === AssessmentMode.CompletionOnly) return true;

  return input.gradeReleaseTiming === GradeReleaseTiming.OnSubmission || input.gradesReleased;
}
