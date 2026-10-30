import {
  libraryProblemDefinitionSchema,
  type LibraryProblemDraft,
  type LibraryProblemDefinition,
} from '@logiclab/contracts/problem-library';
import type { DerivationDefinition } from '@logiclab/contracts/derivation';

export type ProblemEditorFields = {
  title: string;
  instructions: string;
  type: LibraryProblemDefinition['type'];
  derivation: DerivationDefinition;
  derivationLabels: Record<string, string>;
  formula: string;
  question: string;
  explanation: string;
  correctAnswer: '' | 'true' | 'false';
  options: { id: string; text: string }[];
  correctOptionId: string;
};

export function initialProblemFields(problem: LibraryProblemDraft | null): ProblemEditorFields {
  const definition = problem?.definition;
  return {
    title: problem?.title ?? '',
    instructions: problem?.instructions ?? '',
    type: definition?.type ?? 'truth_table',
    formula: definition?.type === 'truth_table' ? definition.formula : '',
    derivation:
      definition?.type === 'derivation'
        ? structuredClone(definition)
        : {
            type: 'derivation',
            definitionVersion: 1,
            format: 'fitch',
            ruleCatalogVersion: 1,
            checkerVersion: 1,
            premises: [],
            conclusion: '',
            rules: [],
            referenceProof: null,
            explanation: null,
          },
    derivationLabels:
      definition?.type === 'derivation'
        ? Object.fromEntries(definition.rules.map((rule) => [rule.id, rule.label]))
        : {},
    question:
      definition && (definition.type === 'true_false' || definition.type === 'multiple_choice')
        ? definition.question
        : '',
    explanation:
      definition && (definition.type === 'true_false' || definition.type === 'multiple_choice')
        ? (definition.explanation ?? '')
        : '',
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
  if (fields.type === 'derivation') return fields.derivation;
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
  return libraryProblemDefinitionSchema.safeParse(editorDraftDefinition(fields));
}

export function editorSnapshot(fields: ProblemEditorFields) {
  return JSON.stringify({
    title: fields.title,
    instructions: fields.instructions,
    definition: editorDraftDefinition(fields),
  });
}
