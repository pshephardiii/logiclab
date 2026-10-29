import { truthTableSolutionResponseSchema } from '@logiclab/contracts';
import type { StudentWorkStore } from '../src/persistence/student-work/store';
import type { StudentWorkContext } from '../src/routes/studentWork/context';
import { authFixture, authUser } from './auth-fixture';
import { assignment, assignmentSummary, classId } from './assignment-fixture';
import { exerciseResponse } from '../src/application/truth-table/exercise';
import { generateTruthTable } from '@logiclab/logic-engine';
import {
  checkAssignedAnswers,
  evaluateSubmission,
} from '../src/application/student-work/evaluation';
export { classId };
export const assignmentId = assignment.id;
export const itemId = assignment.items[0]!.id;
export const summary = { ...assignmentSummary, publishedAt: assignment.createdAt };
export const detail = {
  assignment: {
    ...summary,
    items: assignment.items.map((item) => {
      const definition = item.problemVersion.definition;
      if (definition.type !== 'truth_table') throw new Error('Expected a truth-table fixture');
      return {
        id: item.id,
        position: item.position,
        title: item.problemVersion.title,
        instructions: item.problemVersion.instructions,
        formula: definition.formula,
        exercise: exerciseResponse(generateTruthTable(definition.formula)),
      };
    }),
  },
  attempt: null,
};
export const attempt = {
  id: 'a4444444-4444-4444-8444-444444444444',
  revision: 1,
  answers: {},
  submittedAt: null,
  result: null,
};
export const submitted = {
  ...attempt,
  revision: 2,
  submittedAt: assignment.createdAt,
  result: evaluateSubmission(detail.assignment.items, {}),
};
export function studentWorkFixture() {
  const auth = authFixture();
  const user = { ...authUser, role: 'student' as const };
  auth.service.authenticate.mockResolvedValue(user);
  const studentWork = {
    check: jest.fn<ReturnType<StudentWorkStore['check']>, Parameters<StudentWorkStore['check']>>(
      async () => ({
        itemId,
        feedback: checkAssignedAnswers(detail.assignment.items[0]!.formula, []),
      }),
    ),
    list: jest.fn<ReturnType<StudentWorkStore['list']>, Parameters<StudentWorkStore['list']>>(
      async () => [summary],
    ),
    read: jest.fn<ReturnType<StudentWorkStore['read']>, Parameters<StudentWorkStore['read']>>(
      async () => detail,
    ),
    save: jest.fn<ReturnType<StudentWorkStore['save']>, Parameters<StudentWorkStore['save']>>(
      async () => attempt,
    ),
    submit: jest.fn<ReturnType<StudentWorkStore['submit']>, Parameters<StudentWorkStore['submit']>>(
      async () => submitted,
    ),
    solution: jest.fn<
      ReturnType<StudentWorkStore['solution']>,
      Parameters<StudentWorkStore['solution']>
    >(async () => ({
      itemId,
      solution: truthTableSolutionResponseSchema.parse(
        generateTruthTable(detail.assignment.items[0]!.formula),
      ),
    })),
  };
  const context: StudentWorkContext = { ...auth.context, studentWork };
  return { ...auth, user, context, studentWork };
}
