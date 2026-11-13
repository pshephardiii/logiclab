import { z } from 'zod';
import { naturalDeductionTreeProofSchema } from './natural-deduction-tree';
import {
  derivationStatementSchema,
  derivationExplanationSchema as explanation,
} from './derivation-statement';

/** Natural-deduction tree statement used by the owner library; student assignment admission remains separate. */
export const naturalDeductionTreeDerivationContentSchema = derivationStatementSchema.safeExtend({
  format: z.literal('tree'),
});

export type NaturalDeductionTreeDerivationContent = z.infer<
  typeof naturalDeductionTreeDerivationContentSchema
>;

/** Instructor-only JSON. The pinned format and private reference must agree. */
export const naturalDeductionTreeDerivationDefinitionSchema =
  naturalDeductionTreeDerivationContentSchema.safeExtend({
    referenceProof: naturalDeductionTreeProofSchema.nullable(),
    explanation,
  });

export type NaturalDeductionTreeDerivationDefinition = z.infer<
  typeof naturalDeductionTreeDerivationDefinitionSchema
>;

/** Privileged reference projection; callers must authorize independent answer reveal. */
export const naturalDeductionTreeDerivationSolutionSchema = z.strictObject({
  type: z.literal('derivation'),
  definitionVersion: z.literal(1),
  format: z.literal('tree'),
  ruleCatalogVersion: z.literal(1),
  checkerVersion: z.literal(1),
  referenceProof: naturalDeductionTreeProofSchema,
  explanation,
});

export type NaturalDeductionTreeDerivationSolution = z.infer<
  typeof naturalDeductionTreeDerivationSolutionSchema
>;
