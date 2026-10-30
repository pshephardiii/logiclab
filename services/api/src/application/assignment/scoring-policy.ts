import { assignmentPointAllocationsSchema } from '@logiclab/contracts';

/** Metadata validation only; publication/finalization still authorize and lock the assignment. */
export function validAssignmentScoring(
  assignment: { assessmentMode: string; scoringVersion?: string | null },
  items: { id: string; maxPoints?: number | null }[],
): boolean {
  if (!assignment.scoringVersion) return items.every((item) => item.maxPoints == null);
  return (
    assignment.scoringVersion === 'points_v1' &&
    assignment.assessmentMode === 'graded' &&
    assignmentPointAllocationsSchema.safeParse(
      items.map((item) => ({ itemId: item.id, maxPoints: item.maxPoints })),
    ).success
  );
}
