import { FORMULA_GROUPING_POLICY_VERSION } from '@logiclab/contracts/formula-policy-values';
import { ProblemType } from '@logiclab/contracts/problem-type';
import type { TruthTreeDefinition } from '@logiclab/contracts/truth-tree-authoring';
import {
  libraryProblemDefinitionSchema,
  type LibraryProblemDraft,
  type LibraryProblemDefinition,
} from '@logiclab/contracts/problem-library';

export type DerivationAuthoringStep = 'details' | 'reference';

export type AuthoringDerivationDefinition = Extract<
  LibraryProblemDefinition,
  { type: typeof ProblemType.Derivation }
>;

export type ProblemEditorFields = {
  title: string;
  instructions: string;
  type: LibraryProblemDefinition['type'];
  derivation: AuthoringDerivationDefinition;
  truthTree: TruthTreeDefinition;
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
    type: definition?.type ?? ProblemType.TruthTable,
    formula: definition?.type === ProblemType.TruthTable ? definition.formula : '',
    truthTree:
      definition?.type === ProblemType.TruthTree
        ? structuredClone(definition)
        : {
            type: ProblemType.TruthTree,
            definitionVersion: 1,
            checkerVersion: 1,
            ruleCatalogVersion: 2,
            formulaGroupingVersion: 1,
            premises: [],
            conclusion: '',
            referenceTree: null,
            explanation: null,
          },
    derivation:
      definition?.type === ProblemType.Derivation
        ? structuredClone(definition)
        : {
            type: ProblemType.Derivation,
            definitionVersion: 1,
            format: 'fitch',
            ruleCatalogVersion: 2,
            formulaGroupingVersion: 1,
            checkerVersion: 1,
            premises: [],
            conclusion: '',
            rules: [],
            referenceProof: null,
            explanation: null,
          },
    derivationLabels:
      definition?.type === ProblemType.Derivation
        ? Object.fromEntries(definition.rules.map((rule) => [rule.id, rule.label]))
        : {},
    question:
      definition &&
      (definition.type === ProblemType.TrueFalse || definition.type === ProblemType.MultipleChoice)
        ? definition.question
        : '',
    explanation:
      definition &&
      (definition.type === ProblemType.TrueFalse || definition.type === ProblemType.MultipleChoice)
        ? (definition.explanation ?? '')
        : '',
    correctAnswer:
      definition?.type === ProblemType.TrueFalse
        ? definition.correctAnswer
          ? 'true'
          : 'false'
        : '',
    options:
      definition?.type === ProblemType.MultipleChoice
        ? definition.options
        : [
            { id: crypto.randomUUID(), text: '' },
            { id: crypto.randomUUID(), text: '' },
          ],
    correctOptionId:
      definition?.type === ProblemType.MultipleChoice ? definition.correctOptionId : '',
  };
}

/** Keep incomplete editor values local; shared contracts validate before save or preview. */
export function editorDraftDefinition(fields: ProblemEditorFields) {
  if (fields.type === ProblemType.TruthTree)
    return { ...fields.truthTree, formulaGroupingVersion: FORMULA_GROUPING_POLICY_VERSION };

  if (fields.type === ProblemType.Derivation)
    return { ...fields.derivation, formulaGroupingVersion: FORMULA_GROUPING_POLICY_VERSION };

  const common = { type: fields.type, definitionVersion: 1 };

  return fields.type === ProblemType.TruthTable
    ? {
        ...common,
        formula: fields.formula,
        formulaGroupingVersion: FORMULA_GROUPING_POLICY_VERSION,
      }
    : fields.type === ProblemType.TrueFalse
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
