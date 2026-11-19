import { ProblemType } from '@logiclab/contracts/problem-type';
import {
  conceptualQuestionContentSchema,
  type ConceptualQuestionDefinition,
  type ConceptualQuestionContent,
} from '@logiclab/contracts';

/** Explicit student projection; explanations travel only through authorized answer reveal. */
export function conceptualQuestionContent(
  definition: ConceptualQuestionDefinition,
): ConceptualQuestionContent {
  const common = {
    type: definition.type,
    definitionVersion: definition.definitionVersion,
    question: definition.question,
  };

  return conceptualQuestionContentSchema.parse(
    definition.type === ProblemType.TrueFalse
      ? common
      : {
          ...common,
          options: definition.options.map((option) => ({ id: option.id, text: option.text })),
        },
  );
}
