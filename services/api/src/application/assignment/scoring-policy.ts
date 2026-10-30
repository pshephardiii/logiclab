import { assignmentPointAllocationsSchema } from '@logiclab/contracts';

/** Metadata validation only; publication/finalization still authorize and lock the assignment. */
export function validAssignmentScoring(
  assignment: { assessmentMode: string },
  items: { id: string; maxPoints?: number | null }[],
): boolean {
  if (assignment.assessmentMode !== 'graded') return true;
  return assignmentPointAllocationsSchema.safeParse(
    items.map((item) => ({ itemId: item.id, maxPoints: item.maxPoints })),
  ).success;
}
