import { z } from 'zod';
import { treeProofSchema } from './natural-deduction-tree';
import {
  derivationStatementSchema,
  derivationExplanationSchema as explanation,
} from './derivation-statement';

/** Tree statement used by the owner library; student assignment admission remains separate. */
export const treeDerivationContentSchema = derivationStatementSchema.safeExtend({
  format: z.literal('tree'),
});

export type TreeDerivationContent = z.infer<typeof treeDerivationContentSchema>;

/** Instructor-only JSON. The pinned format and private reference must agree. */
export const treeDerivationDefinitionSchema = treeDerivationContentSchema.safeExtend({
  referenceProof: treeProofSchema.nullable(),
  explanation,
});

export type TreeDerivationDefinition = z.infer<typeof treeDerivationDefinitionSchema>;

/** Privileged reference projection; callers must authorize independent answer reveal. */
export const treeDerivationSolutionSchema = z.strictObject({
  type: z.literal('derivation'),
  definitionVersion: z.literal(1),
  format: z.literal('tree'),
  ruleCatalogVersion: z.literal(1),
  checkerVersion: z.literal(1),
  referenceProof: treeProofSchema,
  explanation,
});

export type TreeDerivationSolution = z.infer<typeof treeDerivationSolutionSchema>;
