import {
  instructorGradingSchema,
  submissionGradingResponseSchema,
  submissionGradingHistoryEntrySchema,
  assignmentScoreSchema,
  type SubmissionGradingResponse,
} from '@logiclab/contracts';
import type {
  AssignmentAttempt,
  SubmissionGradingRevision as RevisionEntity,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import { effectiveAssignmentScore } from '../../application/assignment/instructor-grading';
import { SubmissionGradingError } from '../../application/assignment/grading-errors';
import type { DatabaseManager } from '../transactions';

export function submissionGradingState(automatic: unknown, record: RevisionEntity | null) {
  const grading = record?.grading ?? {
    gradingVersion: 'instructor_grading_v1',
    revision: 0,
    items: [],
  };
  try {
    const score = effectiveAssignmentScore(automatic, grading);
    const parsed = instructorGradingSchema.parse(grading);
    if (
      record &&
      (record.revision !== parsed.revision ||
        JSON.stringify(assignmentScoreSchema.parse(record.score)) !== JSON.stringify(score))
    )
      throw new SubmissionGradingError('invalid_grading');
    const response = submissionGradingResponseSchema.parse({ grading: parsed, score });
    if (record)
      submissionGradingHistoryEntrySchema.parse({
        ...response,
        id: record.id,
        reviewedBy: record.reviewer.id,
        reviewedAt: record.createdAt.toISOString(),
        changes: record.changes,
      });
    return response;
  } catch {
    throw new SubmissionGradingError('invalid_grading');
  }
}

/** Caller authorizes these final attempts. Fetch only the latest revision for each page item. */
export async function latestSubmissionGrading(em: DatabaseManager, attempts: AssignmentAttempt[]) {
  const final = attempts.filter((attempt) => attempt.submittedAt && attempt.score);
  const result = new Map<string, SubmissionGradingResponse>();
  if (!final.length) return result;
  const { SubmissionGradingRevision } = await import('@logiclab/db');
  const records = await em
    .createQueryBuilder(SubmissionGradingRevision)
    .select('*')
    .distinctOn('attempt')
    .where({ attempt: { $in: final.map((attempt) => attempt.id) } })
    .orderBy({ attempt: 'ASC', revision: 'DESC' })
    .getResultList();
  const byAttempt = new Map(records.map((record) => [record.attempt.id, record]));
  for (const attempt of final) {
    const record = byAttempt.get(attempt.id);
    if (record) result.set(attempt.id, submissionGradingState(attempt.score, record));
  }
  return result;
}

/** Called only after result-release authorization; never includes reviewer identity or history. */
export function releasedGradingFields(automatic: unknown, state?: SubmissionGradingResponse) {
  const score = assignmentScoreSchema.parse(automatic);
  if (!state || state.grading.revision === 0) return { score };
  return {
    score: state.score,
    automaticScore: score,
    instructorGrading: {
      gradingVersion: state.grading.gradingVersion,
      revision: state.grading.revision,
      items: state.grading.items.map(({ itemId, earnedPoints, comment }) => ({
        itemId,
        earnedPoints,
        comment,
      })),
    },
  };
}
