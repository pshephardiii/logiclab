import { FORMULA_GROUPING_POLICY_VERSION } from './formula-policy-values';
import { ProblemType } from './problem-type';
import { z } from 'zod';
import { dependencyApplicationProofSchema } from './dependency-proof';
import {
  derivationStatementSchema,
  derivationExplanationSchema as explanation,
} from './derivation-statement';

/** Dependency statement content; assignment admission is enforced separately from transport. */
export const dependencyDerivationContentSchema = derivationStatementSchema.safeExtend({
  format: z.literal('dependency'),
});

export type DependencyDerivationContent = z.infer<typeof dependencyDerivationContentSchema>;

/** Private owner draft. Its required format and reference format cannot disagree. */
export const dependencyDerivationDefinitionSchema = dependencyDerivationContentSchema.safeExtend({
  referenceProof: dependencyApplicationProofSchema.nullable(),
  explanation,
});

export type DependencyDerivationDefinition = z.infer<typeof dependencyDerivationDefinitionSchema>;

/** Caller must authorize answer reveal; schema membership alone does not grant access. */
export const dependencyDerivationSolutionSchema = z.strictObject({
  type: z.literal(ProblemType.Derivation),
  definitionVersion: z.literal(1),
  format: z.literal('dependency'),
  ruleCatalogVersion: z.literal(1),
  formulaGroupingVersion: z.literal(FORMULA_GROUPING_POLICY_VERSION).optional(),
  checkerVersion: z.literal(1),
  referenceProof: dependencyApplicationProofSchema,
  explanation,
});

export type DependencyDerivationSolution = z.infer<typeof dependencyDerivationSolutionSchema>;
