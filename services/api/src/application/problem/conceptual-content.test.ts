import {
  CONCEPTUAL_QUESTION_LIMITS,
  conceptualQuestionDefinitionSchema,
  conceptualQuestionContentSchema,
  conceptualAnswerSchema,
  conceptualAnswerSchemaFor,
  problemDefinitionSchema,
  type ConceptualQuestionDefinition,
} from '@logiclab/contracts';
import { conceptualQuestionContent } from './conceptual-content';

const first = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
const unknown = '33333333-3333-4333-8333-333333333333';
const choice = {
  type: 'multiple_choice' as const,
  definitionVersion: 1 as const,
  question: 'What is false under every interpretation?',
  options: [
    { id: first, text: 'Contradiction' },
    { id: second, text: 'Tautology' },
  ],
  correctOptionId: first,
  explanation: 'A contradiction is always false.',
};
const truth = {
  type: 'true_false' as const,
  definitionVersion: 1 as const,
  question: 'Every tautology is true under every interpretation.',
  correctAnswer: true,
  explanation: 'This is the definition of tautology.',
};

test.each([true, false])(
  'true/false keys accept boolean %s and preserve unanswered versus false',
  (correctAnswer) => {
    expect(conceptualQuestionDefinitionSchema.parse({ ...truth, correctAnswer }).type).toBe(
      'true_false',
    );
    const schema = conceptualAnswerSchemaFor({ ...truth, correctAnswer });
    expect(schema.parse({ type: 'true_false', answer: false })).toEqual({
      type: 'true_false',
      answer: false,
    });
    expect(schema.parse({ type: 'true_false', answer: null })).toEqual({
      type: 'true_false',
      answer: null,
    });
    expect(schema.safeParse({ type: 'true_false' }).success).toBe(false);
  },
);

test('option identity survives reordering and text edits, while unknown or mismatched responses fail', () => {
  const edited = conceptualQuestionDefinitionSchema.parse({
    ...choice,
    options: [
      { id: second, text: 'Always true' },
      { id: first, text: 'Always false' },
    ],
  });
  expect(edited).toMatchObject({ correctOptionId: first });
  const schema = conceptualAnswerSchemaFor(edited);
  expect(schema.safeParse({ type: 'multiple_choice', optionId: first }).success).toBe(true);
  expect(schema.safeParse({ type: 'multiple_choice', optionId: null }).success).toBe(true);
  expect(schema.safeParse({ type: 'multiple_choice', optionId: unknown }).success).toBe(false);
  expect(schema.safeParse({ type: 'true_false', answer: true }).success).toBe(false);
  expect(schema.safeParse({ type: 'multiple_choice', optionId: 0 }).success).toBe(false);
});

test.each([
  { ...choice, correctOptionId: unknown },
  { ...choice, correctOptionId: [first, second] },
  { ...choice, correctOptionId: undefined },
  {
    ...choice,
    options: [
      { id: first, text: 'One' },
      { id: first, text: 'Two' },
    ],
  },
  {
    ...choice,
    options: [
      { id: first, text: 'One' },
      { id: second, text: ' One ' },
    ],
  },
  { ...choice, options: [{ id: first, text: 'Only one' }] },
  { ...choice, options: [] },
  { ...choice, question: ' ' },
  {
    ...choice,
    options: [
      { id: first, text: ' ' },
      { id: second, text: 'Two' },
    ],
  },
  { ...truth, correctAnswer: 'false' },
  { ...truth, correctAnswer: null },
  { ...truth, definitionVersion: 2 },
  { ...truth, formula: 'P' },
  { ...truth, question: 'x'.repeat(CONCEPTUAL_QUESTION_LIMITS.question + 1) },
  { ...truth, explanation: 'x'.repeat(CONCEPTUAL_QUESTION_LIMITS.explanation + 1) },
  {
    ...choice,
    options: [
      { id: first, text: 'x'.repeat(CONCEPTUAL_QUESTION_LIMITS.option + 1) },
      { id: second, text: 'Two' },
    ],
  },
  { ...choice, options: Array(7).fill({ id: first, text: 'Too many' }) },
])('rejects invalid authored conceptual definitions %#', (input) => {
  expect(conceptualQuestionDefinitionSchema.safeParse(input).success).toBe(false);
});

test.each([truth, choice])(
  'ordinary content strips keys and explanations for $type',
  (definition) => {
    const content = conceptualQuestionContent(definition as ConceptualQuestionDefinition);
    expect(conceptualQuestionContentSchema.safeParse(definition).success).toBe(false);
    expect(content).not.toHaveProperty('correctAnswer');
    expect(content).not.toHaveProperty('correctOptionId');
    expect(content).not.toHaveProperty('explanation');
    expect(content).toMatchObject({ question: definition.question, type: definition.type });
  },
);

test('content projection does not share mutable option objects with the saved definition', () => {
  const content = conceptualQuestionContent(choice);
  if (content.type !== 'multiple_choice') throw new Error('Expected choice content');
  content.options[0]!.text = 'Edited response';
  expect(choice.options[0]!.text).toBe('Contradiction');
});

test('answer payloads cannot supply keys, explanations or truth-table cells', () => {
  for (const extra of [{ correctAnswer: false }, { explanation: 'Reveal' }, { rowId: 'row' }]) {
    expect(
      conceptualAnswerSchema.safeParse({ type: 'true_false', answer: false, ...extra }).success,
    ).toBe(false);
  }
});

test('truth-table definitions remain unchanged and new question types are not enabled on active routes yet', () => {
  const definition = { type: 'truth_table', definitionVersion: 1, formula: '~P <-> Q' };
  expect(problemDefinitionSchema.parse(definition)).toEqual(definition);
  expect(problemDefinitionSchema.safeParse(choice).success).toBe(false);
  expect(problemDefinitionSchema.safeParse(truth).success).toBe(false);
});

test('accepts boundary lengths and six unique options without changing the selected identity', () => {
  const options = Array.from({ length: CONCEPTUAL_QUESTION_LIMITS.maxOptions }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    text: String(index) + 'x'.repeat(CONCEPTUAL_QUESTION_LIMITS.option - 1),
  }));
  const parsed = conceptualQuestionDefinitionSchema.parse({
    ...choice,
    question: 'q'.repeat(CONCEPTUAL_QUESTION_LIMITS.question),
    options,
    correctOptionId: options[5]!.id,
    explanation: 'e'.repeat(CONCEPTUAL_QUESTION_LIMITS.explanation),
  });
  expect(parsed).toMatchObject({ options, correctOptionId: options[5]!.id });
});

test('UUID case is normalized before uniqueness and answer-identity checks', () => {
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const definition = conceptualQuestionDefinitionSchema.parse({
    ...choice,
    options: [
      { id: id.toUpperCase(), text: 'One' },
      { id: second, text: 'Two' },
    ],
    correctOptionId: id,
  });
  expect(
    conceptualAnswerSchemaFor(definition).parse({
      type: 'multiple_choice',
      optionId: id.toUpperCase(),
    }),
  ).toEqual({ type: 'multiple_choice', optionId: id });
  expect(
    conceptualQuestionDefinitionSchema.safeParse({
      ...choice,
      options: [
        { id, text: 'One' },
        { id: id.toUpperCase(), text: 'Two' },
      ],
      correctOptionId: id,
    }).success,
  ).toBe(false);
});
