import {
  conceptualAnswerSchemaFor,
  type ConceptualQuestionDefinition,
  type ConceptualAnswer,
  type ConceptualFeedback,
} from '@logiclab/contracts';
import { StudentWorkError } from './errors';

/** Validate against a pinned question; supplied keys, wrong types and foreign options fail. */
export function validateConceptualAnswer(
  definition: ConceptualQuestionDefinition,
  input: unknown,
): ConceptualAnswer {
  const result = conceptualAnswerSchemaFor(definition).safeParse(input);
  if (!result.success) throw new StudentWorkError('invalid_answer');
  return result.data;
}

export function conceptualAnswerIsFilled(answer: ConceptualAnswer): boolean {
  return answer.type === 'true_false' ? answer.answer !== null : answer.optionId !== null;
}

/** Transient/frozen correctness never includes an answer key or explanation. */
export function checkConceptualAnswer(
  definition: ConceptualQuestionDefinition,
  input: unknown,
): ConceptualFeedback {
  const answer = validateConceptualAnswer(definition, input);
  if (!conceptualAnswerIsFilled(answer)) return { status: 'unanswered' };
  const correct =
    definition.type === 'true_false' && answer.type === 'true_false'
      ? answer.answer === definition.correctAnswer
      : definition.type === 'multiple_choice' &&
        answer.type === 'multiple_choice' &&
        answer.optionId === definition.correctOptionId;
  return { status: correct ? 'correct' : 'incorrect' };
}
