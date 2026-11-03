import { latestSubmissionGrading } from './grading-state';
import type { SubmissionReviewStore } from './types';
import { ownedReviewAssignment } from './queries';
import { submissionSummary, finalReviewAttempt } from './response';
import {
  proofCompletionReviewSummary,
  proofCompletionReviewResponse,
} from './proof-completion-response';
import { submissionSummarySchema, submissionReviewSchema } from '@logiclab/contracts';
import type { DatabaseManager } from '../transactions';
import type { createDatabase } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { AssignmentOperationError } from '../../application/assignment/errors';
import { savedAssignmentExercises } from '../assignment/exercise-response';

/** Only retained final submissions are visible; draft answers never cross the instructor boundary. */
export async function createSubmissionReviewStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<SubmissionReviewStore> {
  const { AssignmentItem, AssignmentAttempt } = await import('@logiclab/db');
  return {
    async listSubmissions(ownerId, assignmentId, query) {
      const em = transaction ?? orm.em.fork();
      const assignment = await ownedReviewAssignment(em, ownerId, assignmentId);
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
      const grading = await latestSubmissionGrading(em, submissions);
      return submissions.map((attempt) =>
        attempt.result?.gradingVersion === 'proof_completion_v1'
          ? submissionSummarySchema.parse(proofCompletionReviewSummary(attempt, assignment))
          : submissionSummary(attempt, grading.get(attempt.id)),
      );
    },
    async findSubmission(ownerId, assignmentId, submissionId) {
      const em = transaction ?? orm.em.fork();
      const assignment = await ownedReviewAssignment(em, ownerId, assignmentId);
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
      const grading = (await latestSubmissionGrading(em, [attempt])).get(attempt.id);
      return submissionReviewSchema.parse({
        submission: submissionSummary(attempt, grading),
        assignment: savedAssignmentExercises(assignment, items),
        attempt: finalReviewAttempt(attempt, grading),
      });
    },
  };
}
