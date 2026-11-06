import type { ObjectiveProblemDefinition } from '@logiclab/contracts';
import { conceptualSolutionSchema, truthTableSolutionResponseSchema } from '@logiclab/contracts';
import { generateTruthTable } from '@logiclab/logic-engine';
import {
  validateObjectiveResponse,
  checkObjectiveResponse,
  objectiveSolution,
} from './item-response';
import { checkAssignedTruthTableAnswers } from './evaluation';
import { conceptualQuestionContent } from '../problem/conceptual-content';
import { UnsupportedProblemDefinitionError } from '../problem/definition-support';
import { StudentWorkError } from './errors';

const first = 'b1111111-1111-4111-8111-111111111111';
const second = 'b2222222-2222-4222-8222-222222222222';
const truth = {
  type: 'true_false' as const,
  definitionVersion: 1 as const,
  question: 'Every proposition is true.',
  correctAnswer: false,
  explanation: 'Instructor explanation.',
};
const choice = {
  type: 'multiple_choice' as const,
  definitionVersion: 1 as const,
  question: 'Which is always false?',
  options: [
    { id: first, text: 'Contradiction' },
    { id: second, text: 'Tautology' },
  ],
  correctOptionId: first,
  explanation: 'Private explanation.',
};
const table = { type: 'truth_table' as const, definitionVersion: 1 as const, formula: 'P & Q' };

test('save validation preserves false and null independently of correctness', () => {
  for (const answer of [false, true, null]) {
    const input = { type: 'true_false', answer };
    const saved = validateObjectiveResponse(truth, input);
    expect(saved).toEqual(input);
    expect(saved).not.toBe(input);
  }
});

test('choice saves retain option identity through reorder and text edits', () => {
  const definition = {
    ...choice,
    options: [...choice.options]
      .reverse()
      .map((option) => ({ ...option, text: `${option.text}!` })),
  };
  expect(
    validateObjectiveResponse(definition, { type: 'multiple_choice', optionId: first }),
  ).toEqual({
    type: 'multiple_choice',
    optionId: first,
  });
});

test.each([
  [],
  { type: 'true_false' },
  { type: 'true_false', answer: 'false' },
  { type: 'true_false', answer: false, correctAnswer: false },
  { type: 'multiple_choice', optionId: first },
])('rejects malformed or mismatched true/false saves: %j', (input) => {
  expect(() => validateObjectiveResponse(truth, input)).toThrow(StudentWorkError);
});

test('rejects options not belonging to the pinned question', () => {
  expect(() =>
    validateObjectiveResponse(choice, {
      type: 'multiple_choice',
      optionId: 'b3333333-3333-4333-8333-333333333333',
    }),
  ).toThrow(StudentWorkError);
});

test('conceptual checking reports status only and does not mutate responses', () => {
  for (const [answer, status] of [
    [false, 'correct'],
    [true, 'incorrect'],
    [null, 'unanswered'],
  ] as const) {
    const input = Object.freeze({ type: 'true_false', answer });
    expect(checkObjectiveResponse(truth, input)).toEqual({ status });
  }
  expect(checkObjectiveResponse(choice, { type: 'multiple_choice', optionId: second })).toEqual({
    status: 'incorrect',
  });
});

test('keys and explanations appear only in the separate solution projection', () => {
  expect(conceptualQuestionContent(truth)).toEqual({
    type: 'true_false',
    definitionVersion: 1,
    question: truth.question,
  });
  expect(checkObjectiveResponse(truth, { type: 'true_false', answer: false })).toEqual({
    status: 'correct',
  });
  expect(objectiveSolution(truth)).toEqual({
    type: 'true_false',
    correctAnswer: false,
    explanation: truth.explanation,
  });
  expect(objectiveSolution(choice)).toEqual({
    type: 'multiple_choice',
    correctOptionId: first,
    explanation: choice.explanation,
  });
});

test('missing explanations become explicit null on reveal', () => {
  expect(objectiveSolution({ ...truth, explanation: undefined })).toEqual({
    type: 'true_false',
    correctAnswer: false,
    explanation: null,
  });
});

test('solution contracts reject extra private fields and malformed keys', () => {
  expect(
    conceptualSolutionSchema.safeParse({
      type: 'true_false',
      correctAnswer: false,
      explanation: null,
      question: 'Extra',
    }).success,
  ).toBe(false);
  expect(
    conceptualSolutionSchema.safeParse({
      type: 'multiple_choice',
      correctOptionId: 'invalid',
      explanation: null,
    }).success,
  ).toBe(false);
});

test('legacy table saves/checks/solutions retain existing shapes', () => {
  expect(validateObjectiveResponse(table, [])).toEqual([]);
  expect(checkObjectiveResponse(table, [])).toEqual(
    checkAssignedTruthTableAnswers(table.formula, []),
  );
  const solution = objectiveSolution(table);
  expect(solution).toEqual(
    truthTableSolutionResponseSchema.parse(generateTruthTable(table.formula)),
  );
  expect(solution.rows).toHaveLength(4);
  expect(solution).not.toHaveProperty('type');
});

test('table validation rejects conceptual objects and forged cells', () => {
  expect(() => validateObjectiveResponse(table, { type: 'true_false', answer: false })).toThrow(
    StudentWorkError,
  );
  expect(() =>
    validateObjectiveResponse(table, [{ rowId: 'missing', columnId: 'missing', value: true }]),
  ).toThrow(StudentWorkError);
});

test('unsupported stored definitions fail closed before projection', () => {
  const unsupported = { ...truth, definitionVersion: 2 } as unknown as ObjectiveProblemDefinition;
  expect(() =>
    validateObjectiveResponse(unsupported, { type: 'true_false', answer: false }),
  ).toThrow(UnsupportedProblemDefinitionError);
  expect(() => checkObjectiveResponse(unsupported, { type: 'true_false', answer: false })).toThrow(
    UnsupportedProblemDefinitionError,
  );
  expect(() => objectiveSolution(unsupported)).toThrow(UnsupportedProblemDefinitionError);
});
