import { z } from 'zod';
import { dependencyProofSchema } from './dependency-proof';

/** Student-entered dependency work only; the server supplies statement, rules and identities. */
export const dependencyDerivationAnswerSchema = z.strictObject({
  type: z.literal('derivation'),
  proof: dependencyProofSchema,
});
export type DependencyDerivationAnswer = z.infer<typeof dependencyDerivationAnswerSchema>;

/** Revisioned save and explicit-check transport; assignment admission remains a separate policy. */
export const saveDependencyAnswersSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
  itemId: z.uuid(),
  answers: dependencyDerivationAnswerSchema,
});
export type SaveDependencyAnswers = z.infer<typeof saveDependencyAnswersSchema>;
export const checkDependencyAnswersSchema = z.strictObject({
  itemId: z.uuid(),
  answers: dependencyDerivationAnswerSchema,
});
export type CheckDependencyAnswers = z.infer<typeof checkDependencyAnswersSchema>;
