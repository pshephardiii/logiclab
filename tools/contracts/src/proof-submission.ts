import { z } from 'zod';
import { objectiveGradedItemSchema } from './assignment-responses';
import { derivationEvaluationEvidenceSchema } from './derivation-work';
import { truthTableCheckResponseSchema } from './truth-table';
import type { ProofCheckReport } from './proof';

export const proofSubmissionItemSchema = z.discriminatedUnion('type', [
  ...objectiveGradedItemSchema.options,
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

const completedObjectiveItemSchema = z
  .strictObject({
    itemId: z.uuid(),
    type: z.enum(['truth_table', 'true_false', 'multiple_choice']),
    completedResponses: z.number().int().positive().max(4096),
    totalResponses: z.number().int().positive().max(4096),
  })
  .refine(
    (item) => item.completedResponses === item.totalResponses,
    'Final completion requires every response.',
  );

export const proofCompletionItemSchema = z.union([
  completedObjectiveItemSchema,
  derivationEvaluationEvidenceSchema.extend({
    completedResponses: z.literal(1),
    totalResponses: z.literal(1),
  }),
]);

export type ProofCompletionItem = z.infer<typeof proofCompletionItemSchema>;

export type ProofCompletionVerification = 'verified' | 'errors_found' | 'verification_unavailable';

/** Verification flags invite inspection; they neither award points nor infer student effort. */
export function proofCompletionVerification(
  report: Pick<ProofCheckReport, 'status'>,
): ProofCompletionVerification {
  return report.status === 'accepted'
    ? 'verified'
    : report.status === 'needs_review'
      ? 'errors_found'
      : 'verification_unavailable';
}

const proofCompletionVerificationCountsSchema = z.strictObject({
  verified: z.number().int().nonnegative().max(50),
  errorsFound: z.number().int().nonnegative().max(50),
  unavailable: z.number().int().nonnegative().max(50),
  total: z.number().int().positive().max(50),
});

/** Compact instructor-list summary, derived from retained reports rather than completion credit. */
export function summarizeProofCompletionVerification(items: readonly ProofCompletionItem[]) {
  const counts = { verified: 0, errorsFound: 0, unavailable: 0, total: 0 };

  for (const item of items) {
    if (item.type !== 'derivation') continue;

    counts.total++;

    const status = proofCompletionVerification(item.report);

    if (status === 'verified') counts.verified++;
    else if (status === 'errors_found') counts.errorsFound++;
    else counts.unavailable++;
  }

  return counts;
}

/** Staged score-free completion. Reports are feedback, never evidence of an awarded grade. */
export const proofCompletionSubmissionResultSchema = z
  .strictObject({
    gradingVersion: z.literal('proof_completion_v1'),
    items: z.array(proofCompletionItemSchema).min(1).max(50),
    summary: z.strictObject({
      proofVerification: proofCompletionVerificationCountsSchema,
      completedResponses: z
        .number()
        .int()
        .positive()
        .max(50 * 4096),
      totalResponses: z
        .number()
        .int()
        .positive()
        .max(50 * 4096),
    }),
  })
  .superRefine((value, context) => {
    const reject = (message: string) => context.addIssue({ code: 'custom', message });

    if (!value.items.some((item) => item.type === 'derivation'))
      reject('Use the existing completion formats for work without proofs.');

    if (new Set(value.items.map((item) => item.itemId.toLowerCase())).size !== value.items.length)
      reject('Submission occurrences must be unique.');

    const completed = value.items.reduce((sum, item) => sum + item.completedResponses, 0);
    const total = value.items.reduce((sum, item) => sum + item.totalResponses, 0);

    if (value.summary.completedResponses !== completed || value.summary.totalResponses !== total)
      reject('Completion totals must match retained item counts.');

    const verification = summarizeProofCompletionVerification(value.items);

    if (
      (['verified', 'errorsFound', 'unavailable', 'total'] as const).some(
        (key) => value.summary.proofVerification[key] !== verification[key],
      )
    )
      reject('Proof verification counts must match retained checker reports.');
  });

export type ProofCompletionSubmissionResult = z.infer<typeof proofCompletionSubmissionResultSchema>;
