import { z } from 'zod';
import { mixedGradedItemSchema } from './assignment-responses';
import { derivationEvaluationEvidenceSchema } from './derivation-work';
import { truthTableCheckResponseSchema } from './truth-table';

export const proofSubmissionItemSchema = z.discriminatedUnion('type', [
  ...mixedGradedItemSchema.options,
  derivationEvaluationEvidenceSchema,
]);
export type ProofSubmissionItem = z.infer<typeof proofSubmissionItemSchema>;

/** Staged retained evidence for proof-containing graded assignments; awarded points stay separate. */
export const proofSubmissionResultSchema = z
  .strictObject({
    gradingVersion: z.literal('proof_mixed_v1'),
    items: z.array(proofSubmissionItemSchema).min(1).max(50),
    summary: z.strictObject({
      objective: truthTableCheckResponseSchema.shape.summary,
      proofs: z.strictObject({
        accepted: z.number().int().nonnegative(),
        needsReview: z.number().int().nonnegative(),
        unassessable: z.number().int().nonnegative(),
        total: z.number().int().positive().max(50),
      }),
    }),
  })
  .superRefine((value, context) => {
    const reject = (message: string) => context.addIssue({ code: 'custom', message });
    if (new Set(value.items.map((item) => item.itemId.toLowerCase())).size !== value.items.length)
      reject('Submission occurrences must be unique.');
    const objective = { correct: 0, incorrect: 0, unanswered: 0, total: 0 };
    const proofs = { accepted: 0, needsReview: 0, unassessable: 0, total: 0 };
    for (const item of value.items) {
      if (item.type === 'derivation') {
        proofs.total++;
        if (item.report.status === 'accepted') proofs.accepted++;
        else if (item.report.status === 'needs_review') proofs.needsReview++;
        else proofs.unassessable++;
      } else if (item.type === 'truth_table') {
        const counts = item.feedback.summary;
        if (counts.correct + counts.incorrect + counts.unanswered !== counts.total)
          reject('Objective response counts must be consistent.');
        for (const key of ['correct', 'incorrect', 'unanswered', 'total'] as const)
          objective[key] += counts[key];
      } else {
        objective[item.feedback.status]++;
        objective.total++;
      }
    }
    if (!proofs.total) reject('Use the existing result formats for assignments without proofs.');
    if (
      (['correct', 'incorrect', 'unanswered', 'total'] as const).some(
        (key) => objective[key] !== value.summary.objective[key],
      )
    )
      reject('Objective totals must match retained item feedback.');
    if (
      (['accepted', 'needsReview', 'unassessable', 'total'] as const).some(
        (key) => proofs[key] !== value.summary.proofs[key],
      )
    )
      reject('Proof totals must match retained checker outcomes.');
  });
export type ProofSubmissionResult = z.infer<typeof proofSubmissionResultSchema>;
