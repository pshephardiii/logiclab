import { latestSubmissionGrading } from '../submission-review/grading-state';
import type {
  Assignment as AssignmentEntity,
  AssignmentAttempt as AttemptEntity,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { StudentWorkStore } from './types';
import { enrolled, accessible, submittableAssignment, items, lockedAttempt } from './queries';
import { policyFor, checkRevision } from './validation';
import { calculateSubmissionResult } from './submission-result';
import { assertProofWorkPolicy } from '../../application/student-work/proof-policy';
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
import type { createDatabase } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import {
  validateItemResponse,
  checkItemResponse,
  itemSolution,
} from '../../application/student-work/item-response';
import { StudentWorkError } from '../../application/student-work/errors';
import { assignmentSummary } from '../assignment/summary';

/** Shared assignment/enrollment locks exclude archive/removal; writes lock only this student's attempt. */
export async function createStudentWorkStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<StudentWorkStore> {
  const transact = transactionRunner(orm, transaction);
  const { Assignment, AssignmentItem, AssignmentAttempt, LockMode } = await import('@logiclab/db');
  async function response(
    em: DatabaseManager,
    attempt: AttemptEntity,
    assignment: AssignmentEntity,
  ) {
    const grading = await latestSubmissionGrading(em, [attempt]);
    return attemptResponse(attempt, assignment, grading.get(attempt.id));
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
          attempt: attempt ? await response(em, attempt, assignment) : null,
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
          assertProofWorkPolicy(assignment);
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
        return response(em, attempt, assignment);
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
          assertProofWorkPolicy(assignment);
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
        if (attempt.submittedAt) return response(em, attempt, assignment);
        checkRevision(attempt, revision);
        const assigned = await items(em, assignmentId);
        const calculated = calculateSubmissionResult(assignment, assigned, attempt.answers);
        attempt.result = calculated.result;
        if (calculated.score !== undefined) attempt.score = calculated.score;
        attempt.submittedAt = new Date();
        attempt.revision++;
        await em.flush();
        return response(em, attempt, assignment);
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
          assertProofWorkPolicy(assignment);
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
