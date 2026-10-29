import {
  problemDefinitionSchema,
  type ProblemDraft,
  type ProblemDefinition,
} from '@logiclab/contracts';

export type ProblemEditorFields = {
  title: string;
  instructions: string;
  type: ProblemDefinition['type'];
  formula: string;
  question: string;
  explanation: string;
  correctAnswer: '' | 'true' | 'false';
  options: { id: string; text: string }[];
  correctOptionId: string;
};

export function initialProblemFields(problem: ProblemDraft | null): ProblemEditorFields {
  const definition = problem?.definition;
  return {
    title: problem?.title ?? '',
    instructions: problem?.instructions ?? '',
    type: definition?.type ?? 'truth_table',
    formula: definition?.type === 'truth_table' ? definition.formula : '',
    question: definition && definition.type !== 'truth_table' ? definition.question : '',
    explanation:
      definition && definition.type !== 'truth_table' ? (definition.explanation ?? '') : '',
    correctAnswer:
      definition?.type === 'true_false' ? (definition.correctAnswer ? 'true' : 'false') : '',
    options:
      definition?.type === 'multiple_choice'
        ? definition.options
        : [
            { id: crypto.randomUUID(), text: '' },
            { id: crypto.randomUUID(), text: '' },
          ],
    correctOptionId: definition?.type === 'multiple_choice' ? definition.correctOptionId : '',
  };
}

/** Keep incomplete editor values local; shared contracts validate before save or preview. */
export function editorDraftDefinition(fields: ProblemEditorFields) {
  const common = { type: fields.type, definitionVersion: 1 };
  return fields.type === 'truth_table'
    ? { ...common, formula: fields.formula }
    : fields.type === 'true_false'
      ? {
          ...common,
          question: fields.question,
          explanation: fields.explanation || null,
          correctAnswer: fields.correctAnswer === '' ? null : fields.correctAnswer === 'true',
        }
      : {
          ...common,
          question: fields.question,
          explanation: fields.explanation || null,
          options: fields.options,
          correctOptionId: fields.correctOptionId,
        };
}

export function editorDefinition(fields: ProblemEditorFields) {
  return problemDefinitionSchema.safeParse(editorDraftDefinition(fields));
}

export function editorSnapshot(fields: ProblemEditorFields) {
  return JSON.stringify({
    title: fields.title,
    instructions: fields.instructions,
    definition: editorDraftDefinition(fields),
  });
}
