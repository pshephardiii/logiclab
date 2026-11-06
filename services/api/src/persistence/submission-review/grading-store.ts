import { submissionGradingState } from './grading-state';
import {
  INSTRUCTOR_GRADING_LIMITS,
  instructorGradingSchema,
  updateSubmissionGradingSchema,
  submissionGradingResponseSchema,
  submissionGradingHistoryEntrySchema,
  submissionListQuerySchema,
  type InstructorGrading,
  type UpdateSubmissionGrading,
  type SubmissionListQuery,
} from '@logiclab/contracts';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { transactionRunner, type DatabaseManager } from '../transactions';
import { databaseTime } from '../database-time';
import {
  effectiveAssignmentScore,
  InstructorGradingError,
} from '../../application/assignment/instructor-grading';
import { SubmissionGradingError } from '../../application/assignment/grading-errors';
import type { SubmissionGradingStore } from './types';

/** Owner-scoped grading; every mutation appends one immutable revision. */
export async function createSubmissionGradingStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<SubmissionGradingStore> {
  const transact = transactionRunner(orm, transaction);

  const { Assignment, AssignmentAttempt, SubmissionGradingRevision, User, UserRole, LockMode } =
    await import('@logiclab/db');

  async function finalAttempt(
    em: DatabaseManager,
    ownerId: string,
    assignmentId: string,
    submissionId: string,
    write = false,
  ) {
    const assignment = await em.findOne(
      Assignment,
      {
        id: assignmentId,
        classroom: { owner: { id: ownerId, role: UserRole.Instructor } },
      },
      { lockMode: LockMode.PESSIMISTIC_READ },
    );

    if (!assignment) throw new SubmissionGradingError('not_found');

    if (write && assignment.archivedAt) throw new SubmissionGradingError('archived');

    if (!assignment.publishedAt || assignment.assessmentMode !== 'graded')
      throw new SubmissionGradingError('grading_unavailable');

    const attempt = await em.findOne(
      AssignmentAttempt,
      {
        id: submissionId,
        assignment: assignmentId,
        submittedAt: { $ne: null },
      },
      { lockMode: write ? LockMode.PESSIMISTIC_WRITE : LockMode.PESSIMISTIC_READ, refresh: true },
    );

    if (!attempt) throw new SubmissionGradingError('not_found');

    if (
      !attempt.score ||
      !['truth_table_v1', 'mixed_v1', 'proof_mixed_v1'].includes(
        attempt.result?.gradingVersion ?? '',
      )
    )
      throw new SubmissionGradingError('grading_unavailable');

    return attempt;
  }

  async function latest(em: DatabaseManager, attemptId: string) {
    return em.findOne(
      SubmissionGradingRevision,
      { attempt: attemptId },
      { orderBy: { revision: 'DESC' }, refresh: true },
    );
  }

  return {
    read(ownerId: string, assignmentId: string, submissionId: string) {
      return transact(async (em) => {
        const attempt = await finalAttempt(em, ownerId, assignmentId, submissionId);

        return submissionGradingState(attempt.score, await latest(em, attempt.id));
      });
    },

    update(
      ownerId: string,
      assignmentId: string,
      submissionId: string,
      input: UpdateSubmissionGrading,
    ) {
      return transact(async (em) => {
        const attempt = await finalAttempt(em, ownerId, assignmentId, submissionId, true);
        const parsed = updateSubmissionGradingSchema.safeParse(input);

        if (!parsed.success) throw new SubmissionGradingError('invalid_grading');

        const previous = submissionGradingState(attempt.score, await latest(em, attempt.id));

        if (previous.grading.revision !== parsed.data.revision)
          throw new SubmissionGradingError('revision_conflict');

        if (previous.grading.revision === INSTRUCTOR_GRADING_LIMITS.maxRevision)
          throw new SubmissionGradingError('grading_unavailable');

        const at = await databaseTime(em);
        const entries = new Map(previous.grading.items.map((item) => [item.itemId, item]));

        for (const change of parsed.data.items)
          entries.set(change.itemId, {
            ...change,
            reviewedBy: ownerId,
            reviewedAt: at.toISOString(),
          });

        const parsedGrading = instructorGradingSchema.safeParse({
          gradingVersion: 'instructor_grading_v1',
          revision: previous.grading.revision + 1,
          items: [...entries.values()],
        });

        if (!parsedGrading.success) throw new SubmissionGradingError('invalid_grading');

        const grading: InstructorGrading = parsedGrading.data;
        let score;

        try {
          score = effectiveAssignmentScore(attempt.score, grading);
        } catch (error) {
          if (error instanceof InstructorGradingError)
            throw new SubmissionGradingError('invalid_grading');

          throw error;
        }

        em.persist(
          em.create(SubmissionGradingRevision, {
            attempt,
            revision: grading.revision,
            reviewer: em.getReference(User, ownerId),
            changes: parsed.data.items,
            grading,
            score,
            createdAt: at,
          }),
        );
        await em.flush();

        return submissionGradingResponseSchema.parse({ grading, score });
      });
    },

    history(
      ownerId: string,
      assignmentId: string,
      submissionId: string,
      query: SubmissionListQuery,
    ) {
      return transact(async (em) => {
        const attempt = await finalAttempt(em, ownerId, assignmentId, submissionId);
        const { limit, offset } = submissionListQuerySchema.parse(query);

        const records = await em.find(
          SubmissionGradingRevision,
          { attempt: attempt.id },
          {
            limit: limit + 1,
            offset,
            orderBy: { revision: 'DESC' },
            refresh: true,
          },
        );

        return {
          revisions: records.slice(0, limit).map((record) =>
            submissionGradingHistoryEntrySchema.parse({
              ...submissionGradingState(attempt.score, record),
              id: record.id,
              reviewedBy: record.reviewer.id,
              reviewedAt: record.createdAt.toISOString(),
              changes: record.changes,
            }),
          ),
          nextOffset: records.length > limit ? offset + limit : null,
        };
      });
    },
  };
}
