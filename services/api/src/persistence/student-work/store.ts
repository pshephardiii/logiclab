import { scoreObjectiveSubmission } from '../../application/assignment/scoring';
import { validAssignmentScoring } from '../../application/assignment/scoring-policy';
import { supportedProblemDefinition } from '../../application/problem/definition-support';
import {
  assignmentLearningCapabilities,
  canViewAssignedSolution,
} from '../../application/assignment/learning-policy';
import { transactionRunner, type DatabaseManager } from '../transactions';
import { attemptResponse } from './attempt-response';
import { assignmentExercises } from '../assignment/exercise-response';
import { assignmentLearningPolicySchema } from '@logiclab/contracts';
import type { createDatabase, AssignmentAttempt as AttemptEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type {
  AssignmentSummary,
  CheckStudentAnswers,
  StudentCheckResponse,
  StudentAssignmentResponse,
  StudentAttempt,
  SaveStudentAnswers,
  StudentSolutionResponse,
  StudentAssignmentListQuery,
} from '@logiclab/contracts';
import {
  validateItemResponse,
  checkItemResponse,
  itemSolution,
} from '../../application/student-work/item-response';
import { StudentWorkError } from '../../application/student-work/errors';
import {
  evaluateAssignmentSubmission,
  evaluateAssignmentCompletion,
} from '../../application/student-work/mixed-evaluation';
import { assignmentSummary } from '../assignment/summary';

export interface StudentWorkStore {
  list(
    studentId: string,
    classId: string,
    query: StudentAssignmentListQuery,
  ): Promise<AssignmentSummary[]>;
  read(studentId: string, assignmentId: string): Promise<StudentAssignmentResponse>;
  save(studentId: string, assignmentId: string, input: SaveStudentAnswers): Promise<StudentAttempt>;
  check(
    studentId: string,
    assignmentId: string,
    input: CheckStudentAnswers,
  ): Promise<StudentCheckResponse>;
  submit(studentId: string, assignmentId: string, revision: number): Promise<StudentAttempt>;
  solution(
    studentId: string,
    assignmentId: string,
    itemId: string,
  ): Promise<StudentSolutionResponse>;
}
/** Shared assignment/enrollment locks exclude archive/removal; writes lock only this student's attempt. */
export async function createStudentWorkStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<StudentWorkStore> {
  const transact = transactionRunner(orm, transaction);
  const { Assignment, AssignmentItem, AssignmentAttempt, Enrollment, User, LockMode } =
    await import('@logiclab/db');
  type Manager = typeof orm.em;
  async function enrolled(em: Manager, studentId: string, classId: string, lock = false) {
    const enrollment = await em.findOne(
      Enrollment,
      { student: studentId, classroom: classId },
      lock ? { lockMode: LockMode.PESSIMISTIC_READ } : {},
    );
    if (!enrollment) throw new StudentWorkError('not_found');
  }
  async function accessible(em: Manager, studentId: string, assignmentId: string) {
    const assignment = await em.findOne(
      Assignment,
      { id: assignmentId },
      { lockMode: LockMode.PESSIMISTIC_READ },
    );
    if (!assignment || !assignment.publishedAt || assignment.archivedAt)
      throw new StudentWorkError('not_found');
    await enrolled(em, studentId, assignment.classroom.id, true);
    policyFor(assignment);
    return assignment;
  }
  function policyFor(assignment: {
    assessmentMode: string;
    feedbackTiming: string;
    solutionAccess: string;
  }) {
    const policy = assignmentLearningPolicySchema.safeParse({
      assessmentMode: assignment.assessmentMode,
      feedbackTiming: assignment.feedbackTiming,
      solutionAccess: assignment.solutionAccess,
    });
    if (!policy.success) throw new StudentWorkError('unsupported_policy');
    return policy.data;
  }
  async function submittableAssignment(em: Manager, studentId: string, assignmentId: string) {
    const assignment = await accessible(em, studentId, assignmentId);
    if (!assignmentLearningCapabilities(policyFor(assignment)).hasFinalSubmission)
      throw new StudentWorkError('submission_unavailable');
    return assignment;
  }
  function items(em: Manager, assignmentId: string) {
    return em.find(
      AssignmentItem,
      { assignment: assignmentId },
      { orderBy: { position: 'ASC' }, populate: ['problemVersion'] },
    );
  }
  async function lockedAttempt(em: Manager, studentId: string, assignmentId: string) {
    await em.upsert(
      AssignmentAttempt,
      {
        assignment: em.getReference(Assignment, assignmentId),
        student: em.getReference(User, studentId),
      },
      { onConflictFields: ['assignment', 'student'], onConflictAction: 'ignore' },
    );
    // Refresh after any conflicting transaction finishes; never reuse a stale upsert identity-map row.
    return em.findOneOrFail(
      AssignmentAttempt,
      { assignment: assignmentId, student: studentId },
      { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
    );
  }
  function checkRevision(attempt: AttemptEntity, revision: number) {
    if (attempt.revision !== revision) throw new StudentWorkError('revision_conflict');
  }
  return {
    async list(studentId, classId, query) {
      return transact(async (em) => {
        await enrolled(em, studentId, classId, true);
        const rows = await em.find(
          Assignment,
          { classroom: classId, publishedAt: { $ne: null }, archivedAt: null },
          {
            limit: query.limit,
            offset: query.offset,
            orderBy: { publishedAt: 'DESC', id: 'DESC' },
          },
        );
        return rows.map(assignmentSummary);
      });
    },
    async read(studentId, assignmentId) {
      return transact(async (em) => {
        const assignment = await accessible(em, studentId, assignmentId);
        const assigned = await items(em, assignmentId);
        const attempt = await em.findOne(AssignmentAttempt, {
          assignment: assignmentId,
          student: studentId,
        });
        return {
          assignment: assignmentExercises(assignment, assigned),
          attempt: attempt ? attemptResponse(attempt, assignment) : null,
        };
      });
    },
    async save(studentId, assignmentId, input) {
      return transact(async (em) => {
        const assignment = await accessible(em, studentId, assignmentId);
        const item = await em.findOne(
          AssignmentItem,
          { id: input.itemId, assignment: assignmentId },
          { populate: ['problemVersion'] },
        );
        if (!item) throw new StudentWorkError('not_found');
        const attempt = await lockedAttempt(em, studentId, assignmentId);
        if (attempt.submittedAt) throw new StudentWorkError('submitted');
        checkRevision(attempt, input.revision);
        const answers = validateItemResponse(
          supportedProblemDefinition(item.problemVersion.definition),
          input.answers,
        );
        attempt.answers = { ...attempt.answers, [item.id]: answers };
        attempt.revision++;
        await em.flush();
        return attemptResponse(attempt, assignment);
      });
    },
    async check(studentId, assignmentId, input) {
      return transact(async (em) => {
        const assignment = await accessible(em, studentId, assignmentId);
        if (!assignmentLearningCapabilities(policyFor(assignment)).allowsExplicitCheck)
          throw new StudentWorkError('check_locked');
        const attempt = await em.findOne(
          AssignmentAttempt,
          {
            assignment: assignmentId,
            student: studentId,
          },
          { lockMode: LockMode.PESSIMISTIC_READ },
        );
        if (attempt?.submittedAt) throw new StudentWorkError('submitted');
        const item = await em.findOne(
          AssignmentItem,
          {
            id: input.itemId,
            assignment: assignmentId,
          },
          { populate: ['problemVersion'] },
        );
        if (!item) throw new StudentWorkError('not_found');
        return {
          itemId: item.id,
          feedback: checkItemResponse(
            supportedProblemDefinition(item.problemVersion.definition),
            input.answers,
          ),
        };
      });
    },
    async submit(studentId, assignmentId, revision) {
      return transact(async (em) => {
        const assignment = await submittableAssignment(em, studentId, assignmentId);
        const attempt = await lockedAttempt(em, studentId, assignmentId);
        if (attempt.submittedAt) return attemptResponse(attempt, assignment);
        checkRevision(attempt, revision);
        const assigned = await items(em, assignmentId);
        const evaluate =
          assignment.assessmentMode === 'completion_only'
            ? evaluateAssignmentCompletion
            : evaluateAssignmentSubmission;
        attempt.result = evaluate(
          assigned.map((item) => ({
            id: item.id,
            definition: supportedProblemDefinition(item.problemVersion.definition),
          })),
          attempt.answers,
        );
        if (!validAssignmentScoring(assignment, assigned))
          throw new StudentWorkError('unsupported_policy');
        if (assignment.scoringVersion === 'points_v1')
          attempt.score = scoreObjectiveSubmission(
            assigned.map((item) => ({ itemId: item.id, maxPoints: item.maxPoints! })),
            attempt.result,
          );
        attempt.submittedAt = new Date();
        attempt.revision++;
        await em.flush();
        return attemptResponse(attempt, assignment);
      });
    },
    async solution(studentId, assignmentId, itemId) {
      return transact(async (em) => {
        const assignment = await accessible(em, studentId, assignmentId);
        const attempt = await em.findOne(AssignmentAttempt, {
          assignment: assignmentId,
          student: studentId,
        });
        if (
          !canViewAssignedSolution(
            policyFor(assignment),
            Boolean(attempt?.submittedAt),
            Boolean(assignment.answersRevealedAt),
          )
        )
          throw new StudentWorkError('solution_locked');
        const item = await em.findOne(
          AssignmentItem,
          { id: itemId, assignment: assignmentId },
          { populate: ['problemVersion'] },
        );
        if (!item) throw new StudentWorkError('not_found');
        return {
          itemId,
          solution: itemSolution(supportedProblemDefinition(item.problemVersion.definition)),
        };
      });
    },
  };
}
