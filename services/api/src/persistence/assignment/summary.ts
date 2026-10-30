import type { Assignment as AssignmentEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { assignmentPolicySchema, type AssignmentSummary } from '@logiclab/contracts';

export function assignmentSummary(assignment: AssignmentEntity): AssignmentSummary {
  return {
    id: assignment.id,
    classId: assignment.classroom.id,
    title: assignment.title,
    instructions: assignment.instructions ?? null,
    // Validate persisted policy before exposing it through shared contracts.
    ...assignmentPolicySchema.parse({
      assessmentMode: assignment.assessmentMode,
      feedbackTiming: assignment.feedbackTiming,
      solutionAccess: assignment.solutionAccess,
      gradeReleaseTiming: assignment.gradeReleaseTiming,
    }),
    gradesReleasedAt: assignment.gradesReleasedAt?.toISOString() ?? null,
    answersRevealedAt: assignment.answersRevealedAt?.toISOString() ?? null,
    publishedAt: assignment.publishedAt?.toISOString() ?? null,
    archivedAt: assignment.archivedAt?.toISOString() ?? null,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}
