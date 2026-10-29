import type { ProblemType } from './enums.ts';

export type TruthTableDefinition = {
  type: `${ProblemType.TruthTable}`;
  definitionVersion: 1;
  formula: string;
};

export type TrueFalseDefinition = {
  type: `${ProblemType.TrueFalse}`;
  definitionVersion: 1;
  question: string;
  correctAnswer: boolean;
  explanation?: string | null;
};

export type MultipleChoiceDefinition = {
  type: `${ProblemType.MultipleChoice}`;
  definitionVersion: 1;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation?: string | null;
};

export type ConceptualProblemDefinition = TrueFalseDefinition | MultipleChoiceDefinition;

/**
 * JSON content shared by mutable drafts and immutable published snapshots.
 * Runtime contracts validate authored data; a TypeScript union alone does not enable routes.
 * Each variant owns its definition version. Student responses remain separate.
 */
export type ProblemDefinition = TruthTableDefinition | ConceptualProblemDefinition;
