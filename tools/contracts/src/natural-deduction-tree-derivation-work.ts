import { z } from 'zod';
import { naturalDeductionTreeProofSchema } from './natural-deduction-tree';

/** Student-owned tree only. The server supplies the pinned statement, rules and occurrence IDs. */
export const naturalDeductionTreeDerivationAnswerSchema = z.strictObject({
  type: z.literal('derivation'),
  proof: naturalDeductionTreeProofSchema,
});

export type NaturalDeductionTreeDerivationAnswer = z.infer<
  typeof naturalDeductionTreeDerivationAnswerSchema
>;

/** Staged transport; adding these contracts does not enable live tree assignment admission. */
export const saveNaturalDeductionTreeAnswersSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
  itemId: z.uuid(),
  answers: naturalDeductionTreeDerivationAnswerSchema,
});

export type SaveNaturalDeductionTreeAnswers = z.infer<typeof saveNaturalDeductionTreeAnswersSchema>;

export const checkNaturalDeductionTreeAnswersSchema = z.strictObject({
  itemId: z.uuid(),
  answers: naturalDeductionTreeDerivationAnswerSchema,
});

export type CheckNaturalDeductionTreeAnswers = z.infer<
  typeof checkNaturalDeductionTreeAnswersSchema
>;
