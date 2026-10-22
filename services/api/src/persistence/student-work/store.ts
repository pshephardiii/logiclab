import { transactionRunner, type DatabaseManager } from '../transactions';
import { attemptResponse } from './attempt-response';
import { assignmentExercises } from '../assignment/exercise-response';
import { truthTableSolutionResponseSchema } from '@logiclab/contracts';
import type { createDatabase, AssignmentAttempt as AttemptEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type {
  AssignmentSummary,
  StudentAssignmentResponse,
  StudentAttempt,
  SaveStudentAnswers,
  StudentSolutionResponse,
  StudentAssignmentListQuery,
} from '@logiclab/contracts';
import { generateTruthTable } from '@logiclab/logic-engine';
import { StudentWorkError } from '../../application/student-work/errors';
import { validateAnswers, evaluateSubmission } from '../../application/student-work/evaluation';
import { assignmentSummary } from '../assignment/summary';

export interface StudentWorkStore {
  list(
    studentId: string,
    classId: string,
    query: StudentAssignmentListQuery,
  ): Promise<AssignmentSummary[]>;
  read(studentId: string, assignmentId: string): Promise<StudentAssignmentResponse>;
  save(studentId: string, assignmentId: string, input: SaveStudentAnswers): Promise<StudentAttempt>;
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
    if (assignment.assessmentMode !== 'graded' || assignment.feedbackTiming !== 'on_submission')
      throw new StudentWorkError('unsupported_policy');
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
          attempt: attempt ? attemptResponse(attempt) : null,
        };
      });
    },
    async save(studentId, assignmentId, input) {
      return transact(async (em) => {
        await accessible(em, studentId, assignmentId);
        const item = await em.findOne(
          AssignmentItem,
          { id: input.itemId, assignment: assignmentId },
          { populate: ['problemVersion'] },
        );
        if (!item) throw new StudentWorkError('not_found');
        const attempt = await lockedAttempt(em, studentId, assignmentId);
        if (attempt.submittedAt) throw new StudentWorkError('submitted');
        checkRevision(attempt, input.revision);
        validateAnswers(item.problemVersion.definition.formula, input.answers);
        attempt.answers = { ...attempt.answers, [item.id]: input.answers };
        attempt.revision++;
        await em.flush();
        return attemptResponse(attempt);
      });
    },
    async submit(studentId, assignmentId, revision) {
      return transact(async (em) => {
        await accessible(em, studentId, assignmentId);
        const attempt = await lockedAttempt(em, studentId, assignmentId);
        if (attempt.submittedAt) return attemptResponse(attempt);
        checkRevision(attempt, revision);
        const assigned = await items(em, assignmentId);
        attempt.result = evaluateSubmission(
          assigned.map((item) => ({
            id: item.id,
            formula: item.problemVersion.definition.formula,
          })),
          attempt.answers,
        );
        attempt.submittedAt = new Date();
        attempt.revision++;
        await em.flush();
        return attemptResponse(attempt);
      });
    },
    async solution(studentId, assignmentId, itemId) {
      return transact(async (em) => {
        const assignment = await accessible(em, studentId, assignmentId);
        const attempt = await em.findOne(AssignmentAttempt, {
          assignment: assignmentId,
          student: studentId,
        });
        if (assignment.solutionAccess !== 'after_submission' || !attempt?.submittedAt)
          throw new StudentWorkError('solution_locked');
        const item = await em.findOne(
          AssignmentItem,
          { id: itemId, assignment: assignmentId },
          { populate: ['problemVersion'] },
        );
        if (!item) throw new StudentWorkError('not_found');
        return {
          itemId,
          solution: truthTableSolutionResponseSchema.parse(
            generateTruthTable(item.problemVersion.definition.formula),
          ),
        };
      });
    },
  };
}
