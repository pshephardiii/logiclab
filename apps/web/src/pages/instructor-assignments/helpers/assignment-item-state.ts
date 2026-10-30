import {
  ASSIGNMENT_POINT_LIMITS,
  assignmentItemPointsSchema,
  type AssignmentDetail,
} from '@logiclab/contracts';

/** Compare ordered occurrences, including separately weighted copies of one publication. */
export function assignmentItemState(
  items: readonly { key: string; maxPoints?: number }[],
  original: AssignmentDetail['items'],
  graded: boolean,
) {
  const points = items.map((item) => item.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints);
  return {
    itemsChanged:
      items.length !== original.length ||
      items.some((item, index) => item.key !== original[index]?.id),
    invalidPoints:
      graded && points.some((value) => !assignmentItemPointsSchema.safeParse(value).success),
    pointsChanged:
      graded &&
      points.some(
        (value, index) =>
          value !== (original[index]?.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints),
      ),
    totalPoints: points.reduce((sum, value) => sum + value, 0),
  };
}
