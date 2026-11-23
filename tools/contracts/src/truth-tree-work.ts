import { ProblemType } from './problem-type';
import { z } from 'zod';
import {
  truthTreeApplicationTreeSchema,
  truthTreeCheckReportSchema,
  type TruthTreeCheckReport,
} from './truth-tree';

export const TruthTreeVerdict = { Valid: 'valid', Invalid: 'invalid' } as const;

export const truthTreeVerdictSchema = z.enum(TruthTreeVerdict);

export type TruthTreeVerdict = z.infer<typeof truthTreeVerdictSchema>;

/** Student-entered work only; an omitted older choice is unanswered, never inferred from the tree. */
export const truthTreeAnswerSchema = z.strictObject({
  type: z.literal(ProblemType.TruthTree),
  tree: truthTreeApplicationTreeSchema,
  verdict: truthTreeVerdictSchema.nullable().optional(),
});

export type TruthTreeAnswer = z.infer<typeof truthTreeAnswerSchema>;

export const saveTruthTreeAnswersSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
  itemId: z.uuid(),
  answers: truthTreeAnswerSchema,
});

export type SaveTruthTreeAnswers = z.infer<typeof saveTruthTreeAnswersSchema>;

export const checkTruthTreeAnswersSchema = z.strictObject({
  itemId: z.uuid(),
  answers: truthTreeAnswerSchema,
});

export type CheckTruthTreeAnswers = z.infer<typeof checkTruthTreeAnswersSchema>;

export const TruthTreeVerdictStatus = {
  Correct: 'correct',
  Incorrect: 'incorrect',
  Unanswered: 'unanswered',
  Unassessable: 'unassessable',
} as const;

export const truthTreeVerdictAssessmentSchema = z.strictObject({
  answer: truthTreeVerdictSchema.nullable(),
  status: z.enum(TruthTreeVerdictStatus),
});

export type TruthTreeVerdictAssessment = z.infer<typeof truthTreeVerdictAssessmentSchema>;

/** A provisional open path cannot determine a verdict; only verified tree evidence can. */
export function assessTruthTreeVerdict(
  report: TruthTreeCheckReport,
  answer: TruthTreeVerdict | null | undefined,
): TruthTreeVerdictAssessment {
  const selected = answer ?? null;
  if (selected === null) return { answer: null, status: TruthTreeVerdictStatus.Unanswered };

  if (report.status !== 'verified' || report.argumentStatus === 'undetermined')
    return { answer: selected, status: TruthTreeVerdictStatus.Unassessable };

  return {
    answer: selected,
    status:
      selected === report.argumentStatus
        ? TruthTreeVerdictStatus.Correct
        : TruthTreeVerdictStatus.Incorrect,
  };
}

const evidenceFields = {
  type: z.literal(ProblemType.TruthTree),
  itemId: z.uuid(),
  problemVersionId: z.uuid(),
  report: truthTreeCheckReportSchema,
};

// Retained finals keep their original evaluation meaning; new writes use version 2 below.
const previousEvidenceSchema = z.strictObject({
  evaluationVersion: z.literal('truth_tree_v1'),
  ...evidenceFields,
});

function consistentVerdict(value: {
  report: TruthTreeCheckReport;
  verdict: TruthTreeVerdictAssessment;
}) {
  return value.verdict.status === assessTruthTreeVerdict(value.report, value.verdict.answer).status;
}

export const truthTreeEvaluationEvidenceV2Schema = z
  .strictObject({
    evaluationVersion: z.literal('truth_tree_v2'),
    ...evidenceFields,
    verdict: truthTreeVerdictAssessmentSchema,
  })
  .refine(
    consistentVerdict,
    'Verdict assessment must match the retained tree evidence and selected answer.',
  );

export type TruthTreeEvaluationEvidenceV2 = z.infer<typeof truthTreeEvaluationEvidenceV2Schema>;

export const truthTreeEvaluationEvidenceSchema = z.discriminatedUnion('evaluationVersion', [
  previousEvidenceSchema,
  truthTreeEvaluationEvidenceV2Schema,
]);

export type TruthTreeEvaluationEvidence = z.infer<typeof truthTreeEvaluationEvidenceSchema>;

export const truthTreeCheckFeedbackSchema = z
  .strictObject({
    type: z.literal(ProblemType.TruthTree),
    report: truthTreeCheckReportSchema,
    verdict: truthTreeVerdictAssessmentSchema.optional(),
  })
  .refine(
    (value) =>
      !value.verdict || consistentVerdict({ report: value.report, verdict: value.verdict }),
    'Verdict assessment must match the checked tree and selected answer.',
  );

export type TruthTreeCheckFeedback = z.infer<typeof truthTreeCheckFeedbackSchema>;

const completionCounts = { completedResponses: z.literal(1), totalResponses: z.literal(1) };

export const truthTreeCompletionEvidenceV2Schema =
  truthTreeEvaluationEvidenceV2Schema.safeExtend(completionCounts);

export type TruthTreeCompletionEvidenceV2 = z.infer<typeof truthTreeCompletionEvidenceV2Schema>;

/** Completion remains score-free, with both construction and interpretation evidence retained. */
export const truthTreeCompletionEvidenceSchema = z.discriminatedUnion('evaluationVersion', [
  previousEvidenceSchema.extend(completionCounts),
  truthTreeCompletionEvidenceV2Schema,
]);

export type TruthTreeCompletionEvidence = z.infer<typeof truthTreeCompletionEvidenceSchema>;
