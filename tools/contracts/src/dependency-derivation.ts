import { z } from 'zod';
import { dependencyProofSchema } from './dependency-proof';
import {
  derivationStatementSchema,
  derivationExplanationSchema as explanation,
} from './derivation-statement';

/** Staged dependency content; deliberately not part of live assigned-work contracts yet. */
export const dependencyDerivationContentSchema = derivationStatementSchema.safeExtend({
  format: z.literal('dependency'),
});
export type DependencyDerivationContent = z.infer<typeof dependencyDerivationContentSchema>;

/** Private owner draft. Its required format and reference format cannot disagree. */
export const dependencyDerivationDefinitionSchema = dependencyDerivationContentSchema.safeExtend({
  referenceProof: dependencyProofSchema.nullable(),
  explanation,
});
export type DependencyDerivationDefinition = z.infer<typeof dependencyDerivationDefinitionSchema>;

/** Caller must authorize answer reveal; schema membership alone does not grant access. */
export const dependencyDerivationSolutionSchema = z.strictObject({
  type: z.literal('derivation'),
  definitionVersion: z.literal(1),
  format: z.literal('dependency'),
  ruleCatalogVersion: z.literal(1),
  checkerVersion: z.literal(1),
  referenceProof: dependencyProofSchema,
  explanation,
});
export type DependencyDerivationSolution = z.infer<typeof dependencyDerivationSolutionSchema>;
