import { z } from 'zod';

/** Initial authoring bounds; changes require coordinated validation and editor updates. */
export const CONCEPTUAL_QUESTION_LIMITS = {
  question: 2000,
  option: 500,
  explanation: 5000,
  minOptions: 2,
  maxOptions: 6,
} as const;

const questionSchema = z.string().trim().min(1).max(CONCEPTUAL_QUESTION_LIMITS.question);
const explanationSchema = z
  .string()
  .trim()
  .max(CONCEPTUAL_QUESTION_LIMITS.explanation)
  .nullable()
  .optional();
const optionIdSchema = z.uuid().transform((id) => id.toLowerCase());
export const conceptualOptionSchema = z.strictObject({
  id: optionIdSchema,
  text: z.string().trim().min(1).max(CONCEPTUAL_QUESTION_LIMITS.option),
});
const optionsSchema = z
  .array(conceptualOptionSchema)
  .min(CONCEPTUAL_QUESTION_LIMITS.minOptions)
  .max(CONCEPTUAL_QUESTION_LIMITS.maxOptions)
  .superRefine((options, context) => {
    const ids = new Set<string>();
    const labels = new Set<string>();
    options.forEach((option, index) => {
      if (ids.has(option.id))
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: 'Option IDs must be unique.',
        });
      if (labels.has(option.text))
        context.addIssue({
          code: 'custom',
          path: [index, 'text'],
          message: 'Option text must be distinct.',
        });
      ids.add(option.id);
      labels.add(option.text);
    });
  });

/** Instructor-owned JSON definitions; never serialize these directly to a student. */
export const trueFalseDefinitionSchema = z.strictObject({
  type: z.literal('true_false'),
  definitionVersion: z.literal(1),
  question: questionSchema,
  correctAnswer: z.boolean(),
  explanation: explanationSchema,
});
export const multipleChoiceDefinitionSchema = z
  .strictObject({
    type: z.literal('multiple_choice'),
    definitionVersion: z.literal(1),
    question: questionSchema,
    options: optionsSchema,
    correctOptionId: optionIdSchema,
    explanation: explanationSchema,
  })
  .superRefine((definition, context) => {
    if (!definition.options.some((option) => option.id === definition.correctOptionId)) {
      context.addIssue({
        code: 'custom',
        path: ['correctOptionId'],
        message: 'The answer key must reference an existing option.',
      });
    }
  });
export const conceptualQuestionDefinitionSchema = z.discriminatedUnion('type', [
  trueFalseDefinitionSchema,
  multipleChoiceDefinitionSchema,
]);
export type ConceptualQuestionDefinition = z.infer<typeof conceptualQuestionDefinitionSchema>;

/** Ordinary student content contains no answer key or instructor explanation. */
export const conceptualQuestionContentSchema = z.discriminatedUnion('type', [
  trueFalseDefinitionSchema.omit({ correctAnswer: true, explanation: true }),
  z.strictObject({
    type: z.literal('multiple_choice'),
    definitionVersion: z.literal(1),
    question: questionSchema,
    options: optionsSchema,
  }),
]);
export type ConceptualQuestionContent = z.infer<typeof conceptualQuestionContentSchema>;

/** Null means unanswered; false is a completed true/false response. */
export const conceptualAnswerSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('true_false'), answer: z.boolean().nullable() }),
  z.strictObject({ type: z.literal('multiple_choice'), optionId: optionIdSchema.nullable() }),
]);
export type ConceptualAnswer = z.infer<typeof conceptualAnswerSchema>;

/** Answer-reveal payload only; ordinary content and correctness feedback exclude these fields. */
export const conceptualSolutionSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('true_false'),
    correctAnswer: z.boolean(),
    explanation: z.string().max(CONCEPTUAL_QUESTION_LIMITS.explanation).nullable(),
  }),
  z.strictObject({
    type: z.literal('multiple_choice'),
    correctOptionId: optionIdSchema,
    explanation: z.string().max(CONCEPTUAL_QUESTION_LIMITS.explanation).nullable(),
  }),
]);
export type ConceptualSolution = z.infer<typeof conceptualSolutionSchema>;

/** Resolve option identity against the pinned definition, never labels or list positions. */
export function conceptualAnswerSchemaFor(definition: ConceptualQuestionDefinition) {
  return conceptualAnswerSchema.superRefine((answer, context) => {
    if (answer.type !== definition.type) {
      context.addIssue({
        code: 'custom',
        path: ['type'],
        message: 'Answer type must match the question.',
      });
    } else if (
      answer.type === 'multiple_choice' &&
      definition.type === 'multiple_choice' &&
      answer.optionId !== null &&
      !definition.options.some((option) => option.id === answer.optionId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['optionId'],
        message: 'Choose an option from this question.',
      });
    }
  });
}
