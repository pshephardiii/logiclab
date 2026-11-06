import { z } from 'zod';
import { treeProofSchema } from './natural-deduction-tree';

/** Student-owned tree only. The server supplies the pinned statement, rules and occurrence IDs. */
export const treeDerivationAnswerSchema = z.strictObject({
  type: z.literal('derivation'),
  proof: treeProofSchema,
});
export type TreeDerivationAnswer = z.infer<typeof treeDerivationAnswerSchema>;

/** Staged transport; adding these contracts does not enable live tree assignment admission. */
export const saveTreeAnswersSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
  itemId: z.uuid(),
  answers: treeDerivationAnswerSchema,
});
export type SaveTreeAnswers = z.infer<typeof saveTreeAnswersSchema>;
export const checkTreeAnswersSchema = z.strictObject({
  itemId: z.uuid(),
  answers: treeDerivationAnswerSchema,
});
export type CheckTreeAnswers = z.infer<typeof checkTreeAnswersSchema>;
