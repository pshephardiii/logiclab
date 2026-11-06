import {
  instructorItemGradeSchema,
  type AssignmentScore,
  type InstructorGrading,
  type InstructorItemGrade,
} from '@logiclab/contracts';

export type GradingDraft = { itemId: string; automatic: boolean; points: string; comment: string };

export function submissionGradingDraft(
  score: AssignmentScore,
  grading: InstructorGrading,
): GradingDraft[] {
  return score.items.map((item) => {
    const saved = grading.items.find((value) => value.itemId === item.itemId);

    return {
      itemId: item.itemId,
      automatic: saved?.earnedPoints == null,
      points: saved?.earnedPoints?.toString() ?? '',
      comment: saved?.comment ?? '',
    };
  });
}

function comparable(item: GradingDraft) {
  return JSON.stringify({
    automatic: item.automatic,
    points: item.automatic ? null : item.points.trim() === '' ? '' : Number(item.points),
    comment: item.comment.trim() || null,
  });
}

/** Compare occurrence-level decisions; unused point text and trimmed comment whitespace do not dirty a form. */
export function changedGradingItems(draft: GradingDraft[], baseline: GradingDraft[]) {
  return draft.filter(
    (item) =>
      comparable(item) !== comparable(baseline.find((saved) => saved.itemId === item.itemId)!),
  );
}

export function gradingDraftChanges(
  draft: GradingDraft[],
  baseline: GradingDraft[],
  score: AssignmentScore,
) {
  const items: InstructorItemGrade[] = [];
  const errors: Record<string, string> = {};

  for (const item of changedGradingItems(draft, baseline)) {
    const maximum = score.items.find((value) => value.itemId === item.itemId)?.maxPoints;

    const value = instructorItemGradeSchema.safeParse({
      itemId: item.itemId,
      earnedPoints: item.automatic ? null : item.points.trim() === '' ? NaN : Number(item.points),
      comment: item.comment.trim() || null,
    });

    if (!value.success || maximum == null || (value.data.earnedPoints ?? 0) > maximum) {
      errors[item.itemId] =
        `Enter points from 0 to ${maximum ?? 0} in hundredths, or use the automatic award. Comments must be at most 4,000 characters.`;
    } else items.push(value.data);
  }

  return { items, errors };
}
