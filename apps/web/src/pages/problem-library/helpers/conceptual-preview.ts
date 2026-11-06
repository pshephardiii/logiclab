import type { ConceptualQuestionDefinition, ConceptualSolution } from '@logiclab/contracts';

/** Instructor preview only: keep ordinary content separate from the privileged answer payload. */
export function conceptualPreviewData(definition: ConceptualQuestionDefinition) {
  const content =
    definition.type === 'true_false'
      ? {
          type: definition.type,
          definitionVersion: definition.definitionVersion,
          question: definition.question,
        }
      : {
          type: definition.type,
          definitionVersion: definition.definitionVersion,
          question: definition.question,
          options: definition.options,
        };

  const solution: ConceptualSolution =
    definition.type === 'true_false'
      ? {
          type: definition.type,
          correctAnswer: definition.correctAnswer,
          explanation: definition.explanation ?? null,
        }
      : {
          type: definition.type,
          correctOptionId: definition.correctOptionId,
          explanation: definition.explanation ?? null,
        };

  return { content, solution };
}
