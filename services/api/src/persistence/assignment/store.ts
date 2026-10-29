import { requireTruthTableDefinition } from '../../application/problem/definition-support';
import { assignmentLearningPolicySchema, type AssignmentLearningPolicy } from '@logiclab/contracts';
import { resolveAssignmentLearningPolicy } from '../../application/assignment/learning-policy';
import { transactionRunner, type DatabaseManager } from '../transactions';
import { hasClassCapability } from '../billing/class-coverage';
import {
  createSubmissionReviewStore,
  type SubmissionReviewStore,
} from '../submission-review/store';
import { assignmentSummary } from './summary';
import type { createDatabase, Assignment as AssignmentEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type {
  AssignmentDetail,
  AssignmentSummary,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  AssignmentListQuery,
} from '@logiclab/contracts';
import { AssignmentOperationError } from '../../application/assignment/errors';
import { publishedProblemVersion } from '../problem/version-response';

export interface AssignmentStore extends SubmissionReviewStore {
  create(
    ownerId: string,
    classId: string,
    input: CreateAssignmentRequest,
  ): Promise<AssignmentDetail>;
  list(ownerId: string, classId: string, query: AssignmentListQuery): Promise<AssignmentSummary[]>;
  findOwned(ownerId: string, assignmentId: string): Promise<AssignmentDetail>;
  update(
    ownerId: string,
    assignmentId: string,
    input: UpdateAssignmentRequest,
  ): Promise<AssignmentDetail>;
  duplicate(ownerId: string, assignmentId: string): Promise<AssignmentDetail>;
  release(
    ownerId: string,
    assignmentId: string,
    kind: 'grades' | 'answers',
  ): Promise<AssignmentDetail>;
  publish(ownerId: string, assignmentId: string): Promise<AssignmentDetail>;
  setArchived(ownerId: string, assignmentId: string, archived: boolean): Promise<AssignmentDetail>;
}

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
    Classroom,
    ProblemVersion,
    LockMode,
    AssessmentMode,
    FeedbackTiming,
    SolutionAccess,
    ClassCapability,
  } = await import('@logiclab/db');
  const modes = {
    graded: AssessmentMode.Graded,
    completion_only: AssessmentMode.CompletionOnly,
    ungraded_practice: AssessmentMode.UngradedPractice,
  };
  const timings = {
    on_submission: FeedbackTiming.OnSubmission,
    on_check: FeedbackTiming.OnCheck,
    immediate: FeedbackTiming.Immediate,
  };
  const solutions = {
    instructor_release: SolutionAccess.InstructorRelease,
    never: SolutionAccess.Never,
    after_submission: SolutionAccess.AfterSubmission,
    anytime: SolutionAccess.Anytime,
  };
  function policyFields(policy: AssignmentLearningPolicy) {
    return {
      assessmentMode: modes[policy.assessmentMode],
      feedbackTiming: timings[policy.feedbackTiming],
      solutionAccess: solutions[policy.solutionAccess],
    };
  }
  type Manager = typeof orm.em;

  async function ownedClass(em: Manager, ownerId: string, classId: string) {
    const classroom = await em.findOne(Classroom, { id: classId, owner: ownerId });
    if (!classroom) throw new AssignmentOperationError('not_found');
    return classroom;
  }
  async function ownedAssignment(em: Manager, ownerId: string, id: string, lock = false) {
    const assignment = await em.findOne(
      Assignment,
      { id, classroom: { owner: ownerId } },
      lock ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {},
    );
    if (!assignment) throw new AssignmentOperationError('not_found');
    return assignment;
  }
  async function ownedVersions(em: Manager, ownerId: string, ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const versions = await em.find(ProblemVersion, {
      id: { $in: uniqueIds },
      problem: { owner: ownerId },
    });
    if (versions.length !== uniqueIds.length)
      throw new AssignmentOperationError('version_not_found');
    // Conceptual publication is supported; assignment evaluation is enabled in the next workflow slice.
    versions.forEach((version) => requireTruthTableDefinition(version.definition));
    return new Map(versions.map((version) => [version.id, version]));
  }
  async function detail(em: Manager, assignment: AssignmentEntity): Promise<AssignmentDetail> {
    const items = await em.find(
      AssignmentItem,
      { assignment: assignment.id },
      { orderBy: { position: 'ASC' }, populate: ['problemVersion.problem'] },
    );
    return {
      ...assignmentSummary(assignment),
      items: items.map((item) => ({
        id: item.id,
        position: item.position,
        problemVersion: publishedProblemVersion(item.problemVersion),
      })),
    };
  }
  async function replaceItems(
    em: Manager,
    ownerId: string,
    assignment: AssignmentEntity,
    ids: string[],
  ) {
    const versions = await ownedVersions(em, ownerId, ids);
    // Validate all references before replacement; the transaction rolls back the entire draft on failure.
    await em.nativeDelete(AssignmentItem, { assignment: assignment.id });
    ids.forEach((id, index) =>
      em.persist(
        em.create(AssignmentItem, {
          assignment,
          problemVersion: versions.get(id)!,
          position: index + 1,
        }),
      ),
    );
  }

  const reviews = await createSubmissionReviewStore(orm, transaction);
  return {
    ...reviews,
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
          ...policyFields(
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
          ),
        });
        em.persist(assignment);
        await em.flush();
        await replaceItems(em, ownerId, assignment, input.problemVersionIds);
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
        let title = 'Copy of ';
        // Respect the API's 120-code-unit limit without splitting a Unicode character.
        for (const character of source.title) {
          if (title.length + character.length > 120) break;
          title += character;
        }
        const policy = assignmentLearningPolicySchema.parse({
          assessmentMode: source.assessmentMode,
          feedbackTiming: source.feedbackTiming,
          solutionAccess: source.solutionAccess,
        });
        const copy = em.create(Assignment, {
          classroom: source.classroom,
          title: title.trimEnd(),
          instructions: source.instructions,
          ...policyFields(policy),
          gradeReleaseTiming: source.gradeReleaseTiming,
        });
        em.persist(copy);
        await em.flush();
        await replaceItems(
          em,
          ownerId,
          copy,
          items.map((item) => item.problemVersion.id),
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
        Object.assign(assignment, policyFields(policy));
        if (input.title !== undefined) assignment.title = input.title;
        if (input.instructions !== undefined)
          assignment.instructions = input.instructions ?? undefined;
        if (input.problemVersionIds !== undefined)
          await replaceItems(em, ownerId, assignment, input.problemVersionIds);
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
          await ownedVersions(
            em,
            ownerId,
            items.map((item) => item.problemVersion.id),
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
