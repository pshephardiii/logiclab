import { duplicateAssignmentTitle } from '../../application/assignment/duplicate-title';
import { validAssignmentScoring } from '../../application/assignment/scoring-policy';
import { assignmentLearningPolicySchema } from '@logiclab/contracts';
import { resolveAssignmentLearningPolicy } from '../../application/assignment/learning-policy';
import { transactionRunner, type DatabaseManager } from '../transactions';
import { hasClassCapability } from '../billing/class-coverage';
import { assignmentSummary } from './summary';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { AssignmentOperationError } from '../../application/assignment/errors';
import type { AssignmentStore } from './types';
import { policyFields } from './policy-fields';
import { ownedClass, ownedAssignment, ownedVersions, detail } from './queries';
import { replaceItems, draftScoring } from './draft-items';

/** Parent-row locks serialize every draft mutation with publication and archive transitions. */
export async function createAssignmentStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<AssignmentStore> {
  const transact = transactionRunner(orm, transaction);

  const {
    Assignment,
    User,
    GradeReleaseTiming,
    AssignmentItem,
    AssessmentMode,
    SolutionAccess,
    ClassCapability,
  } = await import('@logiclab/db');

  return {
    async create(ownerId, classId, input) {
      return transact(async (em) => {
        const classroom = await ownedClass(em, ownerId, classId);

        if (input.assessmentMode !== 'graded' && input.gradeReleaseTiming === 'instructor_release')
          throw new AssignmentOperationError('invalid_policy');

        const assignment = em.create(Assignment, {
          classroom,
          title: input.title,
          instructions: input.instructions ?? undefined,
          gradeReleaseTiming:
            input.gradeReleaseTiming === 'instructor_release'
              ? GradeReleaseTiming.InstructorRelease
              : GradeReleaseTiming.OnSubmission,
          ...(await policyFields(
            resolveAssignmentLearningPolicy(
              {
                assessmentMode: 'graded',
                feedbackTiming: 'on_submission',
                solutionAccess: 'never',
              },
              {
                assessmentMode: input.assessmentMode,
                feedbackTiming: input.feedbackTiming,
                solutionAccess: input.solutionAccess,
              },
            ),
          )),
        });

        em.persist(assignment);
        await em.flush();

        await draftScoring(em, ownerId, assignment, {
          ...(input.items !== undefined
            ? { items: input.items }
            : { problemVersionIds: input.problemVersionIds }),
        });

        await em.flush();

        return detail(em, assignment);
      });
    },

    async duplicate(ownerId, assignmentId) {
      return transact(async (em) => {
        // Serialize the saved snapshot with edits, publication and archive changes.
        const source = await ownedAssignment(em, ownerId, assignmentId, true);

        const items = await em.find(
          AssignmentItem,
          { assignment: source.id },
          { orderBy: { position: 'ASC' } },
        );

        if (items.length && !validAssignmentScoring(source, items))
          throw new AssignmentOperationError('invalid_scoring');

        const title = duplicateAssignmentTitle(source.title);

        const policy = assignmentLearningPolicySchema.parse({
          assessmentMode: source.assessmentMode,
          feedbackTiming: source.feedbackTiming,
          solutionAccess: source.solutionAccess,
        });

        const copy = em.create(Assignment, {
          classroom: source.classroom,
          title,
          instructions: source.instructions,
          ...(await policyFields(policy)),
          gradeReleaseTiming: source.gradeReleaseTiming,
        });

        em.persist(copy);
        await em.flush();

        await replaceItems(
          em,
          ownerId,
          copy,
          items.map((item) => item.problemVersion.id),
          items.map((item) => item.maxPoints),
        );

        await em.flush();

        return detail(em, copy);
      });
    },

    async list(ownerId, classId, query) {
      const em = transaction ?? orm.em.fork();

      await ownedClass(em, ownerId, classId);

      const assignments = await em.find(
        Assignment,
        {
          classroom: { id: classId, owner: ownerId },
          ...(query.archive === 'all'
            ? {}
            : { archivedAt: query.archive === 'active' ? null : { $ne: null } }),
        },
        { limit: query.limit, offset: query.offset, orderBy: { createdAt: 'DESC', id: 'DESC' } },
      );

      return assignments.map(assignmentSummary);
    },

    async findOwned(ownerId, assignmentId) {
      const em = transaction ?? orm.em.fork();

      return detail(em, await ownedAssignment(em, ownerId, assignmentId));
    },

    async update(ownerId, assignmentId, input) {
      return transact(async (em) => {
        const assignment = await ownedAssignment(em, ownerId, assignmentId, true);

        if (assignment.archivedAt) throw new AssignmentOperationError('archived');

        if (assignment.publishedAt) throw new AssignmentOperationError('published');

        const current = assignmentLearningPolicySchema.parse({
          assessmentMode: assignment.assessmentMode,
          feedbackTiming: assignment.feedbackTiming,
          solutionAccess: assignment.solutionAccess,
        });

        const policy = resolveAssignmentLearningPolicy(current, {
          assessmentMode: input.assessmentMode,
          feedbackTiming: input.feedbackTiming,
          solutionAccess: input.solutionAccess,
        });

        const gradeTiming = input.gradeReleaseTiming ?? assignment.gradeReleaseTiming;

        if (policy.assessmentMode !== 'graded' && gradeTiming === 'instructor_release')
          throw new AssignmentOperationError('invalid_policy');

        assignment.gradeReleaseTiming =
          gradeTiming === 'instructor_release'
            ? GradeReleaseTiming.InstructorRelease
            : GradeReleaseTiming.OnSubmission;

        Object.assign(assignment, await policyFields(policy));

        if (input.title !== undefined) assignment.title = input.title;

        if (input.instructions !== undefined)
          assignment.instructions = input.instructions ?? undefined;

        await draftScoring(em, ownerId, assignment, input);

        assignment.updatedAt = new Date();

        await em.flush();

        return detail(em, assignment);
      });
    },

    async release(ownerId, assignmentId, kind) {
      return transact(async (em) => {
        const assignment = await ownedAssignment(em, ownerId, assignmentId, true);

        if (assignment.archivedAt) throw new AssignmentOperationError('archived');

        if (!assignment.publishedAt) throw new AssignmentOperationError('release_unavailable');

        const at = new Date(Math.max(Date.now(), assignment.publishedAt.getTime()));

        if (kind === 'grades') {
          if (
            assignment.assessmentMode !== AssessmentMode.Graded ||
            assignment.gradeReleaseTiming !== GradeReleaseTiming.InstructorRelease
          )
            throw new AssignmentOperationError('release_unavailable');

          if (!assignment.gradesReleasedAt) {
            assignment.gradesReleasedAt = at;
            assignment.gradesReleasedBy = em.getReference(User, ownerId);
          }
        } else {
          if (
            assignment.assessmentMode === AssessmentMode.UngradedPractice ||
            assignment.solutionAccess !== SolutionAccess.InstructorRelease
          )
            throw new AssignmentOperationError('release_unavailable');

          if (!assignment.answersRevealedAt) {
            assignment.answersRevealedAt = at;
            assignment.answersRevealedBy = em.getReference(User, ownerId);
          }
        }

        await em.flush();

        return detail(em, assignment);
      });
    },

    async publish(ownerId, assignmentId) {
      return transact(async (em) => {
        const assignment = await ownedAssignment(em, ownerId, assignmentId, true);

        if (assignment.archivedAt) throw new AssignmentOperationError('archived');

        if (!assignment.publishedAt) {
          const items = await em.find(AssignmentItem, { assignment: assignment.id });

          if (!items.length) throw new AssignmentOperationError('empty');

          if (!validAssignmentScoring(assignment, items))
            throw new AssignmentOperationError('invalid_scoring');

          await ownedVersions(
            em,
            ownerId,
            items.map((item) => item.problemVersion.id),
            assignment,
          );

          if (
            !(await hasClassCapability(
              em,
              assignment.classroom.id,
              ClassCapability.PublishAssignments,
            ))
          ) {
            throw new AssignmentOperationError('coverage_required');
          }

          assignment.publishedAt = new Date();

          await em.flush();
        }

        return detail(em, assignment);
      });
    },

    async setArchived(ownerId, assignmentId, archived) {
      return transact(async (em) => {
        const assignment = await ownedAssignment(em, ownerId, assignmentId, true);

        if (archived && !assignment.archivedAt) assignment.archivedAt = new Date();

        if (!archived && assignment.archivedAt) assignment.archivedAt = undefined;

        await em.flush();

        return detail(em, assignment);
      });
    },
  };
}
