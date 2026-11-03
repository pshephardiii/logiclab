import { submissionSummary, objectiveReviewAttempt } from './response';
import {
  proofCompletionReviewSummary,
  proofCompletionReviewResponse,
} from './proof-completion-response';
import { submissionSummarySchema, submissionReviewSchema } from '@logiclab/contracts';
import type { DatabaseManager } from '../transactions';
import type { createDatabase } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { SubmissionListQuery, SubmissionSummary, SubmissionReview } from '@logiclab/contracts';
import { AssignmentOperationError } from '../../application/assignment/errors';
import { assignmentExercises, savedAssignmentExercises } from '../assignment/exercise-response';

export interface SubmissionReviewStore {
  listSubmissions(
    ownerId: string,
    assignmentId: string,
    query: SubmissionListQuery,
  ): Promise<SubmissionSummary[]>;
  findSubmission(
    ownerId: string,
    assignmentId: string,
    submissionId: string,
  ): Promise<SubmissionReview>;
}

/** Only retained final submissions are visible; draft answers never cross the instructor boundary. */
export async function createSubmissionReviewStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<SubmissionReviewStore> {
  const { Assignment, AssignmentItem, AssignmentAttempt } = await import('@logiclab/db');
  async function owned(em: typeof orm.em, ownerId: string, id: string) {
    const assignment = await em.findOne(Assignment, { id, classroom: { owner: ownerId } });
    if (!assignment || assignment.assessmentMode === 'ungraded_practice')
      throw new AssignmentOperationError('not_found');
    return assignment;
  }
  return {
    async listSubmissions(ownerId, assignmentId, query) {
      const em = transaction ?? orm.em.fork();
      const assignment = await owned(em, ownerId, assignmentId);
      const submissions = await em.find(
        AssignmentAttempt,
        {
          assignment: { id: assignmentId, classroom: { owner: ownerId } },
          submittedAt: { $ne: null },
        },
        {
          limit: query.limit,
          offset: query.offset,
          orderBy: { submittedAt: 'DESC', id: 'DESC' },
          populate: ['student'],
        },
      );
      return submissions.map((attempt) =>
        attempt.result?.gradingVersion === 'proof_completion_v1'
          ? submissionSummarySchema.parse(proofCompletionReviewSummary(attempt, assignment))
          : submissionSummary(attempt),
      );
    },
    async findSubmission(ownerId, assignmentId, submissionId) {
      const em = transaction ?? orm.em.fork();
      const assignment = await owned(em, ownerId, assignmentId);
      const attempt = await em.findOne(
        AssignmentAttempt,
        {
          id: submissionId,
          assignment: { id: assignmentId, classroom: { owner: ownerId } },
          submittedAt: { $ne: null },
        },
        { populate: ['student'] },
      );
      if (!attempt) throw new AssignmentOperationError('not_found');
      const items = await em.find(
        AssignmentItem,
        { assignment: assignmentId },
        { orderBy: { position: 'ASC' }, populate: ['problemVersion'] },
      );
      if (attempt.result?.gradingVersion === 'proof_completion_v1')
        return submissionReviewSchema.parse({
          ...proofCompletionReviewResponse(attempt, assignment),
          assignment: savedAssignmentExercises(assignment, items),
        });
      return {
        submission: submissionSummary(attempt),
        assignment: assignmentExercises(assignment, items),
        attempt: objectiveReviewAttempt(attempt),
      };
    },
  };
}
