import type { DatabaseManager } from '../transactions';
import type { createDatabase, AssignmentAttempt } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { SubmissionListQuery, SubmissionSummary, SubmissionReview } from '@logiclab/contracts';
import { AssignmentOperationError } from '../../application/assignment/errors';
import { assignmentExercises } from '../assignment/exercise-response';
import { attemptResponse } from '../student-work/attempt-response';

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
function summary(attempt: AssignmentAttempt): SubmissionSummary {
  if (!attempt.submittedAt || !attempt.result) throw new AssignmentOperationError('not_found');
  return {
    id: attempt.id,
    student: { id: attempt.student.id, email: attempt.student.email ?? null },
    submittedAt: attempt.submittedAt.toISOString(),
    summary: attempt.result.summary,
  };
}

/** Only retained final submissions are visible; draft answers never cross the instructor boundary. */
export async function createSubmissionReviewStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<SubmissionReviewStore> {
  const { Assignment, AssignmentItem, AssignmentAttempt } = await import('@logiclab/db');
  async function owned(em: typeof orm.em, ownerId: string, id: string) {
    const assignment = await em.findOne(Assignment, { id, classroom: { owner: ownerId } });
    if (!assignment) throw new AssignmentOperationError('not_found');
    return assignment;
  }
  return {
    async listSubmissions(ownerId, assignmentId, query) {
      const em = transaction ?? orm.em.fork();
      await owned(em, ownerId, assignmentId);
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
      return submissions.map(summary);
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
      return {
        submission: summary(attempt),
        assignment: assignmentExercises(assignment, items),
        attempt: attemptResponse(attempt),
      };
    },
  };
}
