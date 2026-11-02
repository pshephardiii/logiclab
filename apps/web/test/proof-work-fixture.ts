import type {
  SavedStudentAssignment,
  SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';
import type { DerivationAnswer } from '@logiclab/contracts/derivation-work';
import type { DerivationSolution } from '@logiclab/contracts/derivation';
import type { ProofCheckReport } from '@logiclab/contracts';
import { work, itemA, itemB, saved } from './assignment-work-fixture';
export { itemA, itemB };
export const tableId = 'a6666666-6666-4666-8666-666666666666';
const premiseId = 'b1111111-1111-4111-8111-111111111111';
const stepId = 'b2222222-2222-4222-8222-222222222222';
export const proofAnswer: DerivationAnswer = {
  type: 'derivation',
  proof: {
    proofVersion: 1,
    format: 'fitch',
    blocks: [],
    steps: [{ kind: 'premise', id: stepId, blockId: null, formula: 'P', premiseId }],
  },
};
export function editedProof(formula = 'Q'): DerivationAnswer {
  const answer = structuredClone(proofAnswer);
  answer.proof.steps[0]!.formula = formula;
  return answer;
}
export const proofReport: ProofCheckReport = {
  checkerVersion: 1,
  ruleCatalogVersion: 1,
  status: 'accepted',
  target: 'established',
  steps: [{ stepId, stepIndex: 0, localStatus: 'valid', dependencyStatus: 'valid' }],
  diagnostics: [],
};
const content = {
  type: 'derivation' as const,
  definitionVersion: 1 as const,
  format: 'fitch' as const,
  checkerVersion: 1 as const,
  ruleCatalogVersion: 1 as const,
  premises: [{ id: premiseId, formula: 'P' }],
  conclusion: 'P',
  rules: [{ id: 'reiteration', label: 'Repeat' }],
};
export const proofWork: SavedStudentAssignment = {
  ...work,
  assessmentMode: 'ungraded_practice',
  feedbackTiming: 'on_check',
  solutionAccess: 'anytime',
  items: [
    { id: itemA, position: 1, title: 'First proof', instructions: null, content, maxPoints: 20 },
    { id: itemB, position: 2, title: 'Repeated proof', instructions: null, content, maxPoints: 10 },
    { ...work.items[0]!, id: tableId, position: 3, maxPoints: 5 },
  ],
};
export const proofSaved: SavedStudentAttempt = { ...saved, answers: { [itemA]: proofAnswer } };
export const checkedProof = {
  itemId: itemA,
  feedback: { type: 'derivation' as const, report: proofReport },
};
export const proofSolution: DerivationSolution = {
  type: 'derivation',
  definitionVersion: 1,
  format: 'fitch',
  checkerVersion: 1,
  ruleCatalogVersion: 1,
  referenceProof: proofAnswer.proof,
  explanation: 'PRIVATE_REFERENCE_EXPLANATION',
};
export const proofFinal: SavedStudentAttempt = {
  ...proofSaved,
  revision: 2,
  submittedAt: '2026-11-02T12:00:00.000Z',
  gradePending: false,
  result: {
    gradingVersion: 'proof_mixed_v1',
    items: [
      {
        type: 'derivation',
        evaluationVersion: 'derivation_v1',
        itemId: itemA,
        problemVersionId: itemA,
        report: proofReport,
      },
      {
        type: 'derivation',
        evaluationVersion: 'derivation_v1',
        itemId: itemB,
        problemVersionId: itemA,
        report: {
          ...proofReport,
          status: 'needs_review',
          target: 'not_established',
          steps: [],
          diagnostics: [{ code: 'INCOMPLETE_PROOF', message: 'No proof entered.' }],
        },
      },
      {
        type: 'truth_table',
        itemId: tableId,
        feedback: { cells: [], summary: { correct: 0, incorrect: 0, unanswered: 2, total: 2 } },
      },
    ],
    summary: {
      objective: { correct: 0, incorrect: 0, unanswered: 2, total: 2 },
      proofs: { accepted: 1, needsReview: 1, unassessable: 0, total: 2 },
    },
  },
  score: {
    scoringVersion: 'points_v1',
    items: [
      { itemId: itemA, maxPoints: 20, earnedPoints: 20, status: 'graded' },
      { itemId: itemB, maxPoints: 10, earnedPoints: null, status: 'needs_review' },
      { itemId: tableId, maxPoints: 5, earnedPoints: 0, status: 'graded' },
    ],
    summary: { maxPoints: 35, earnedPoints: null, percentage: null, status: 'needs_review' },
  },
};

export const proofCompletionWork: SavedStudentAssignment = {
  ...proofWork,
  assessmentMode: 'completion_only',
  feedbackTiming: 'on_submission',
  solutionAccess: 'instructor_release',
  items: proofWork.items.slice(0, 2),
};
export const proofCompletionFinal: SavedStudentAttempt = {
  ...proofSaved,
  submittedAt: proofFinal.submittedAt,
  gradePending: false,
  answers: { [itemA]: proofAnswer, [itemB]: proofAnswer },
  result: {
    gradingVersion: 'proof_completion_v1',
    items: [itemA, itemB].map((itemId, index) => ({
      type: 'derivation',
      evaluationVersion: 'derivation_v1',
      itemId,
      problemVersionId: itemA,
      completedResponses: 1,
      totalResponses: 1,
      report:
        index === 0
          ? proofReport
          : {
              ...proofReport,
              status: 'needs_review',
              target: 'not_established',
              steps: [
                { stepId, stepIndex: 0, localStatus: 'invalid', dependencyStatus: 'invalid' },
              ],
              diagnostics: [
                { code: 'RULE_MISMATCH', stepId, message: 'Premise does not match the statement.' },
              ],
            },
    })),
    summary: {
      completedResponses: 2,
      totalResponses: 2,
      proofVerification: { verified: 1, errorsFound: 1, unavailable: 0, total: 2 },
    },
  },
};
