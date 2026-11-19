import { z } from 'zod';

/** Shared wire values; individual workflows still validate which types they support. */
export const ProblemType = {
  TruthTable: 'truth_table',
  TrueFalse: 'true_false',
  MultipleChoice: 'multiple_choice',
  Derivation: 'derivation',
  TruthTree: 'truth_tree',
} as const;

export type ProblemType = (typeof ProblemType)[keyof typeof ProblemType];

export const problemTypeSchema = z.enum(ProblemType);
