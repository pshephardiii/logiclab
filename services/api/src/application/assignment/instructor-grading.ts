import {
  assignmentScoreSchema,
  instructorGradingSchema,
  type AssignmentScore,
} from '@logiclab/contracts';
import { summarizeAssignmentScore } from './scoring';

export class InstructorGradingError extends Error {
  constructor() {
    super('Instructor grading must match the frozen assigned occurrences and point bounds.');
    this.name = 'InstructorGradingError';
  }
}

/** Pure staged calculation; callers authorize final graded work and enforce result disclosure. */
export function effectiveAssignmentScore(
  automaticInput: unknown,
  gradingInput: unknown,
): AssignmentScore {
  const automatic = assignmentScoreSchema.safeParse(automaticInput);
  const grading = instructorGradingSchema.safeParse(gradingInput);

  if (!automatic.success || !grading.success) throw new InstructorGradingError();

  const allocations = new Map(automatic.data.items.map((item) => [item.itemId, item.maxPoints]));

  for (const entry of grading.data.items) {
    const maxPoints = allocations.get(entry.itemId);

    if (maxPoints === undefined || (entry.earnedPoints !== null && entry.earnedPoints > maxPoints))
      throw new InstructorGradingError();
  }

  const entries = new Map(grading.data.items.map((entry) => [entry.itemId, entry]));

  return summarizeAssignmentScore(
    automatic.data.items.map((item) => {
      const earnedPoints = entries.get(item.itemId)?.earnedPoints;

      return earnedPoints === undefined || earnedPoints === null
        ? item
        : { ...item, status: 'graded' as const, earnedPoints };
    }),
  );
}
