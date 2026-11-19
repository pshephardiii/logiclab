import {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
} from '@logiclab/contracts/assignment-policy-values';
import { ProblemType } from '@logiclab/contracts/problem-type';
import {
  ASSIGNMENT_POINT_LIMITS,
  type AssignmentDetail,
  type AssignmentLearningPolicy,
  GradeReleaseTiming,
} from '@logiclab/contracts';
import type { LibraryProblemVersion } from '@logiclab/contracts/problem-library';
import { assignmentItemState } from './assignment-item-state';

export type SelectedProblem = { key: string; maxPoints?: number; version: LibraryProblemVersion };

type FormValues = {
  title: string;
  instructions: string;
  policy: AssignmentLearningPolicy;
  gradeReleaseTiming: GradeReleaseTiming;
  items: SelectedProblem[];
};

function assignmentMetadata(assignment: AssignmentDetail | null) {
  const gradeReleaseTiming: GradeReleaseTiming =
    assignment?.gradeReleaseTiming ?? GradeReleaseTiming.OnSubmission;

  return {
    title: assignment?.title ?? '',
    instructions: assignment?.instructions ?? '',
    policy: {
      assessmentMode: assignment?.assessmentMode ?? AssessmentMode.Graded,
      feedbackTiming: assignment?.feedbackTiming ?? FeedbackTiming.OnSubmission,
      solutionAccess: assignment?.solutionAccess ?? SolutionAccess.Never,
    },
    gradeReleaseTiming,
  };
}

/** Normalize the saved baseline without mutating it or resetting React state. */
export function assignmentFormDefaults(assignment: AssignmentDetail | null) {
  const items: SelectedProblem[] =
    assignment?.items.map((item) => ({
      key: item.id,
      version: item.problemVersion,
      maxPoints: item.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints,
    })) ?? [];

  return { ...assignmentMetadata(assignment), items };
}

export function allowsAssignmentProofs(
  policy: Pick<AssignmentLearningPolicy, 'assessmentMode' | 'feedbackTiming'>,
) {
  return (
    policy.assessmentMode === AssessmentMode.UngradedPractice ||
    ([AssessmentMode.Graded, AssessmentMode.CompletionOnly].some(
      (candidate) => candidate === policy.assessmentMode,
    ) &&
      policy.feedbackTiming === FeedbackTiming.OnSubmission)
  );
}

/** Derive dirty/eligibility state; occurrence and point comparisons keep their existing rules. */
export function assignmentFormState(assignment: AssignmentDetail | null, values: FormValues) {
  const original = assignmentMetadata(assignment);

  const itemState = assignmentItemState(
    values.items,
    assignment?.items ?? [],
    values.policy.assessmentMode === AssessmentMode.Graded,
  );

  const containsProof = values.items.some(
    (item) =>
      item.version.definition.type === ProblemType.Derivation ||
      item.version.definition.type === ProblemType.TruthTree,
  );
  const allowsProofs = allowsAssignmentProofs(values.policy);

  return {
    ...itemState,
    containsProof,
    allowsProofs,
    invalidProofMode: containsProof && !allowsProofs,
    dirty:
      values.title !== original.title ||
      values.instructions !== original.instructions ||
      values.policy.assessmentMode !== original.policy.assessmentMode ||
      values.policy.feedbackTiming !== original.policy.feedbackTiming ||
      values.policy.solutionAccess !== original.policy.solutionAccess ||
      values.gradeReleaseTiming !== original.gradeReleaseTiming ||
      itemState.itemsChanged ||
      itemState.pointsChanged,
  };
}
