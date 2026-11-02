import { scoreObjectiveSubmission } from '../../application/assignment/scoring';
import { scoreProofSubmission } from '../../application/assignment/proof-scoring';
import { evaluateProofSubmission } from '../../application/student-work/proof-submission';
import { libraryProblemDefinition } from '../../application/problem/library-definition';
import { validAssignmentScoring } from '../../application/assignment/scoring-policy';
import { supportedProblemDefinition } from '../../application/problem/definition-support';
import {
  assignmentLearningCapabilities,
  canViewAssignedSolution,
} from '../../application/assignment/learning-policy';
import { transactionRunner, type DatabaseManager } from '../transactions';
import { attemptResponse } from './attempt-response';
import { savedAssignmentExercises } from '../assignment/exercise-response';
import {
  validateDerivationAnswer,
  evaluateDerivationAnswer,
} from '../../application/student-work/derivation-response';
import {
  validateDerivationDefinition,
  derivationContent,
  derivationReferenceSolution,
} from '../../application/problem/derivation-authoring';
import { assignmentLearningPolicySchema, assignmentResponsesSchema } from '@logiclab/contracts';
import type {
  SavedStudentAttempt,
  SavedStudentAssignmentResponse,
  SavedStudentAnswers,
  SavedStudentCheck,
  SavedStudentCheckResponse,
  SavedStudentSolutionResponse,
} from '@logiclab/contracts/saved-student-work';
import type { createDatabase, AssignmentAttempt as AttemptEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { AssignmentSummary, StudentAssignmentListQuery } from '@logiclab/contracts';
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
  read(studentId: string, assignmentId: string): Promise<SavedStudentAssignmentResponse>;
  save(
    studentId: string,
    assignmentId: string,
    input: SavedStudentAnswers,
  ): Promise<SavedStudentAttempt>;
  check(
    studentId: string,
    assignmentId: string,
    input: SavedStudentCheck,
  ): Promise<SavedStudentCheckResponse>;
  submit(studentId: string, assignmentId: string, revision: number): Promise<SavedStudentAttempt>;
  solution(
    studentId: string,
    assignmentId: string,
    itemId: string,
  ): Promise<SavedStudentSolutionResponse>;
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
          assignment: savedAssignmentExercises(assignment, assigned),
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
        const definition = item.problemVersion.definition;
        if (definition.type === 'derivation') {
          if (assignment.assessmentMode === 'completion_only')
            throw new StudentWorkError('unsupported_policy');
          validateDerivationDefinition(definition);
        }
        const attempt = await lockedAttempt(em, studentId, assignmentId);
        if (attempt.submittedAt) throw new StudentWorkError('submitted');
        checkRevision(attempt, input.revision);
        const answers =
          definition.type === 'derivation'
            ? validateDerivationAnswer(input.answers)
            : validateItemResponse(supportedProblemDefinition(definition), input.answers);
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
        const definition = item.problemVersion.definition;
        if (definition.type === 'derivation') {
          if (assignment.assessmentMode !== 'ungraded_practice')
            throw new StudentWorkError('unsupported_policy');
          const evidence = evaluateDerivationAnswer(
            {
              itemId: item.id,
              problemVersionId: item.problemVersion.id,
              content: derivationContent(definition),
            },
            input.answers,
          );
          return {
            itemId: item.id,
            feedback: { type: 'derivation' as const, report: evidence.report },
          };
        }
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
        if (!validAssignmentScoring(assignment, assigned))
          throw new StudentWorkError('unsupported_policy');
        const containsProof = assigned.some(
          (item) => item.problemVersion.definition.type === 'derivation',
        );
        if (containsProof && assignment.assessmentMode !== 'graded')
          throw new StudentWorkError('unsupported_policy');
        const allocations = assigned.map((item) => ({
          itemId: item.id,
          maxPoints: item.maxPoints!,
        }));
        if (containsProof) {
          // Internal staged path: live assignment/HTTP contracts still exclude proofs until review is ready.
          const result = evaluateProofSubmission(
            assigned.map((item) => ({
              id: item.id,
              problemVersionId: item.problemVersion.id,
              definition: libraryProblemDefinition(item.problemVersion.definition),
            })),
            attempt.answers,
          );
          attempt.result = result;
          attempt.score = scoreProofSubmission(allocations, result);
        } else {
          const evaluate =
            assignment.assessmentMode === 'completion_only'
              ? evaluateAssignmentCompletion
              : evaluateAssignmentSubmission;
          attempt.result = evaluate(
            assigned.map((item) => ({
              id: item.id,
              definition: supportedProblemDefinition(item.problemVersion.definition),
            })),
            assignmentResponsesSchema.parse(attempt.answers),
          );
          if (assignment.assessmentMode === 'graded')
            attempt.score = scoreObjectiveSubmission(allocations, attempt.result);
        }
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
        const definition = item.problemVersion.definition;
        if (definition.type === 'derivation') {
          if (assignment.assessmentMode !== 'ungraded_practice')
            throw new StudentWorkError('unsupported_policy');
          return { itemId, solution: derivationReferenceSolution(definition) };
        }
        return {
          itemId,
          solution: itemSolution(supportedProblemDefinition(definition)),
        };
      });
    },
  };
}
