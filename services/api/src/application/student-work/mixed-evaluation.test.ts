import {
  assignmentResponsesSchema,
  conceptualFeedbackSchema,
  mixedGradedSubmissionResultSchema,
  mixedCompletionSubmissionResultSchema,
  submissionResultSchema,
  type ProblemDefinition,
  type AssignmentResponses,
  type MixedGradedSubmissionResult,
  type MixedCompletionSubmissionResult,
} from '@logiclab/contracts';
import type {
  AssignmentResponses as StoredResponses,
  MixedGradedSubmissionResult as StoredGrade,
  MixedCompletionSubmissionResult as StoredCompletion,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import { evaluateAssignmentSubmission, evaluateAssignmentCompletion } from './mixed-evaluation';
import { checkConceptualAnswer } from './conceptual-evaluation';
import { evaluateSubmission, evaluateCompletion } from './evaluation';
import { mapStudentWorkError } from '../../routes/studentWork/errors';
import { StudentWorkError } from './errors';

// Compile-time symmetry guards the JSON representation across package boundaries.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
type GradeFormatMatches = Assert<Equal<StoredGrade, MixedGradedSubmissionResult>>;
type CompletionFormatMatches = Assert<Equal<StoredCompletion, MixedCompletionSubmissionResult>>;
type ResponseFormatMatches = Assert<Equal<StoredResponses, AssignmentResponses>>;

const tableId = 'a1111111-1111-4111-8111-111111111111';
const truthId = 'a2222222-2222-4222-8222-222222222222';
const choiceId = 'a3333333-3333-4333-8333-333333333333';
const repeatedId = 'a4444444-4444-4444-8444-444444444444';
const optionA = 'b1111111-1111-4111-8111-111111111111';
const optionB = 'b2222222-2222-4222-8222-222222222222';
const truth = {
  type: 'true_false' as const,
  definitionVersion: 1 as const,
  question: 'Every contradiction is true.',
  correctAnswer: false,
  explanation: 'Secret explanation.',
};
const choice = {
  type: 'multiple_choice' as const,
  definitionVersion: 1 as const,
  question: 'Which is always false?',
  options: [
    { id: optionA, text: 'Contradiction' },
    { id: optionB, text: 'Tautology' },
  ],
  correctOptionId: optionA,
  explanation: 'Secret choice explanation.',
};
const items: { id: string; definition: ProblemDefinition }[] = [
  { id: tableId, definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' } },
  { id: truthId, definition: truth },
  { id: choiceId, definition: choice },
];
const tableAnswers = [
  { rowId: 'row:v1:P=T', columnId: 'expr:v1:P', value: true },
  { rowId: 'row:v1:P=F', columnId: 'expr:v1:P', value: false },
];
const filled = {
  [tableId]: tableAnswers,
  [truthId]: { type: 'true_false', answer: false },
  [choiceId]: { type: 'multiple_choice', optionId: optionA },
};

function expectFailure(operation: () => unknown, reason: string) {
  try {
    operation();
    throw new Error('Expected failure');
  } catch (error) {
    expect(error).toBeInstanceOf(StudentWorkError);
    expect(error).toMatchObject({ reason });
  }
}

test.each([
  [false, 'correct'],
  [true, 'incorrect'],
  [null, 'unanswered'],
] as const)(
  'false key evaluates answer %s as %s without returning the explanation',
  (answer, status) => {
    expect(checkConceptualAnswer(truth, { type: 'true_false', answer })).toEqual({ status });
  },
);

test.each([
  [optionA, 'correct'],
  [optionB, 'incorrect'],
  [null, 'unanswered'],
] as const)('choice answer %s evaluates as %s', (optionId, status) => {
  expect(checkConceptualAnswer(choice, { type: 'multiple_choice', optionId })).toEqual({ status });
});

test('mixed grading counts each occurrence separately and returns only correctness feedback', () => {
  const responses = { ...filled, [choiceId]: { type: 'multiple_choice', optionId: optionB } };
  const before = structuredClone(responses);
  const result = evaluateAssignmentSubmission(
    [...items, { id: repeatedId, definition: truth }],
    responses,
  );
  expect(result.gradingVersion).toBe('mixed_v1');
  if (result.gradingVersion !== 'mixed_v1') throw new Error('Expected mixed grading');
  expect(result.summary).toEqual({ correct: 3, incorrect: 1, unanswered: 1, total: 5 });
  expect(result.items[1]).toEqual({
    type: 'true_false',
    itemId: truthId,
    feedback: { status: 'correct' },
  });
  expect(result.items[3]).toEqual({
    type: 'true_false',
    itemId: repeatedId,
    feedback: { status: 'unanswered' },
  });
  expect(responses).toEqual(before);
  for (const key of ['correctAnswer', 'correctOptionId', 'explanation', 'Secret'])
    expect(JSON.stringify(result)).not.toContain(key);
  const stored: StoredGrade = result;
  expect(mixedGradedSubmissionResultSchema.parse(stored)).toEqual(result);
});

test('unanswered conceptual questions have one unit even without a saved object', () => {
  const result = evaluateAssignmentSubmission(items.slice(1), {});
  expect(result.summary).toEqual({ correct: 0, incorrect: 0, unanswered: 2, total: 2 });
});

test('option reorder/text edits do not change grading identity', () => {
  const changed = {
    ...choice,
    options: [
      { id: optionB, text: 'New second text' },
      { id: optionA, text: 'New first text' },
    ],
  };
  expect(checkConceptualAnswer(changed, { type: 'multiple_choice', optionId: optionA })).toEqual({
    status: 'correct',
  });
});

test('completion is identical for correct and incorrect filled work and stores no correctness data', () => {
  const correct = evaluateAssignmentCompletion(items, filled);
  const wrong = evaluateAssignmentCompletion(items, {
    [tableId]: tableAnswers.map((answer) => ({ ...answer, value: !answer.value })),
    [truthId]: { type: 'true_false', answer: true },
    [choiceId]: { type: 'multiple_choice', optionId: optionB },
  });
  expect(wrong).toEqual(correct);
  expect(correct.gradingVersion).toBe('mixed_completion_v1');
  if (correct.gradingVersion !== 'mixed_completion_v1')
    throw new Error('Expected mixed completion');
  expect(correct.summary).toEqual({ completedResponses: 4, totalResponses: 4 });
  for (const key of ['correct', 'feedback', 'explanation', 'correctAnswer', 'correctOptionId'])
    expect(JSON.stringify(correct)).not.toContain(key);
  const stored: StoredCompletion = correct;
  expect(mixedCompletionSubmissionResultSchema.parse(stored)).toEqual(correct);
});

test.each([
  { ...filled, [truthId]: { type: 'true_false', answer: null } },
  { ...filled, [choiceId]: { type: 'multiple_choice', optionId: null } },
  { ...filled, [tableId]: [{ ...tableAnswers[0]!, value: null }, tableAnswers[1]!] },
  {},
])('completion rejects missing or blank response units %#', (responses) => {
  expectFailure(() => evaluateAssignmentCompletion(items, responses), 'incomplete_work');
});

test.each([
  { ...filled, [choiceId]: { type: 'multiple_choice', optionId: repeatedId } },
  { ...filled, [truthId]: { type: 'multiple_choice', optionId: optionA } },
  { ...filled, [truthId]: [] },
  { ...filled, [tableId]: { type: 'true_false', answer: true } },
  { ...filled, [truthId]: { type: 'true_false', answer: false, correctAnswer: false } },
  { ...filled, [repeatedId]: { type: 'true_false', answer: true } },
  { ...filled, [truthId]: undefined },
])('invalid or forged response shapes/identities cannot be graded or completed %#', (responses) => {
  expectFailure(() => evaluateAssignmentSubmission(items, responses), 'invalid_answer');
  expectFailure(() => evaluateAssignmentCompletion(items, responses), 'invalid_answer');
});

test('truth-cell validation is preserved inside mixed work', () => {
  expectFailure(
    () =>
      evaluateAssignmentSubmission(items, {
        ...filled,
        [tableId]: [tableAnswers[0], tableAnswers[0]],
      }),
    'duplicate_cell',
  );
  expectFailure(
    () =>
      evaluateAssignmentSubmission(items, {
        ...filled,
        [tableId]: [{ ...tableAnswers[0]!, rowId: 'foreign' }],
      }),
    'invalid_cell',
  );
});

test('legacy-only assignments retain their exact graded and completion formats', () => {
  const oldItems = [{ id: tableId, formula: 'P' }];
  const responses = { [tableId]: tableAnswers };
  const grade = evaluateAssignmentSubmission(items.slice(0, 1), responses);
  const completion = evaluateAssignmentCompletion(items.slice(0, 1), responses);
  expect(grade).toEqual(evaluateSubmission(oldItems, responses));
  expect(completion).toEqual(evaluateCompletion(oldItems, responses));
  expect(submissionResultSchema.parse(grade)).toEqual(grade);
  expect(submissionResultSchema.parse(completion)).toEqual(completion);
});

test('response JSON round-trips and repeated/empty item lists fail closed', () => {
  const parsed = assignmentResponsesSchema.parse(filled);
  const stored: StoredResponses = parsed;
  expect(assignmentResponsesSchema.parse(JSON.parse(JSON.stringify(stored)))).toEqual(parsed);
  expectFailure(() => evaluateAssignmentSubmission([items[0]!, items[0]!], {}), 'invalid_answer');
  expectFailure(() => evaluateAssignmentSubmission([], {}), 'invalid_answer');
});

test('feedback and completion contracts reject accidental private fields', () => {
  expect(submissionResultSchema.parse(evaluateAssignmentSubmission(items, filled))).toEqual(
    evaluateAssignmentSubmission(items, filled),
  );
  expect(
    conceptualFeedbackSchema.safeParse({ status: 'incorrect', correctOptionId: optionA }).success,
  ).toBe(false);
  const result = evaluateAssignmentCompletion(items, filled);
  expect(mixedCompletionSubmissionResultSchema.safeParse({ ...result, correct: 1 }).success).toBe(
    false,
  );
});

test('invalid conceptual responses have a stable sanitized route error', () => {
  expect(mapStudentWorkError(new StudentWorkError('invalid_answer'))).toEqual({
    status: 400,
    code: 'INVALID_ANSWER',
    message: 'The answer must match the assigned question and its available options.',
  });
});
