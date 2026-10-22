import type { Assignment as AssignmentEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { assignmentPolicySchema, type AssignmentSummary } from '@logiclab/contracts';

export function assignmentSummary(assignment: AssignmentEntity): AssignmentSummary {
  // The legacy boolean cannot represent pre-submission solution access.
  if (assignment.solutionAccess === 'anytime')
    throw new Error('Assignment solution policy is not supported by the current API.');
  return {
    id: assignment.id,
    classId: assignment.classroom.id,
    title: assignment.title,
    instructions: assignment.instructions ?? null,
    // Active API contracts remain graded-only until student workflows support other modes.
    ...assignmentPolicySchema.parse({
      assessmentMode: assignment.assessmentMode,
      feedbackTiming: assignment.feedbackTiming,
      allowSolutions: assignment.solutionAccess === 'after_submission',
    }),
    publishedAt: assignment.publishedAt?.toISOString() ?? null,
    archivedAt: assignment.archivedAt?.toISOString() ?? null,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}
