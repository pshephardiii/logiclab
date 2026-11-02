import { validatedProofWork, type ProofSubmissionOccurrence } from './proof-work';
export type { ProofSubmissionOccurrence } from './proof-work';
import {
  proofSubmissionResultSchema,
  type ProofSubmissionResult,
  type ProofSubmissionItem,
} from '@logiclab/contracts/proof-submission';
import { derivationContent } from '../problem/derivation-authoring';
import { evaluateDerivationAnswer } from './derivation-response';
import { evaluateAssignmentSubmission } from './mixed-evaluation';

/** Caller loads locked authoritative publications. This pure stage neither finalizes nor releases work. */
export function evaluateProofSubmission(
  items: ProofSubmissionOccurrence[],
  input: unknown,
): ProofSubmissionResult {
  const { assigned, responses } = validatedProofWork(items, input);
  const objectiveItems = assigned.flatMap((item) =>
    item.definition.type === 'derivation' ? [] : [{ id: item.id, definition: item.definition }],
  );
  const objectiveResponses = Object.fromEntries(
    objectiveItems
      .filter((item) => responses.has(item.id))
      .map((item) => [item.id, responses.get(item.id)!]),
  );
  const objective = objectiveItems.length
    ? evaluateAssignmentSubmission(objectiveItems, objectiveResponses)
    : null;
  const objectiveResults: ProofSubmissionItem[] =
    objective?.gradingVersion === 'truth_table_v1'
      ? objective.items.map((item) => ({ ...item, type: 'truth_table' as const }))
      : (objective?.items ?? []);
  const objectiveById = new Map(objectiveResults.map((item) => [item.itemId, item]));
  const proofs = { accepted: 0, needsReview: 0, unassessable: 0, total: 0 };
  const results = assigned.map((item): ProofSubmissionItem => {
    if (item.definition.type !== 'derivation') return objectiveById.get(item.id)!;
    const answer = responses.has(item.id)
      ? responses.get(item.id)
      : { type: 'derivation', proof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] } };
    const evidence = evaluateDerivationAnswer(
      {
        itemId: item.id,
        problemVersionId: item.problemVersionId,
        content: derivationContent(item.definition),
      },
      answer,
    );
    proofs.total++;
    if (evidence.report.status === 'accepted') proofs.accepted++;
    else if (evidence.report.status === 'needs_review') proofs.needsReview++;
    else proofs.unassessable++;
    return evidence;
  });
  return proofSubmissionResultSchema.parse({
    gradingVersion: 'proof_mixed_v1',
    items: results,
    summary: {
      objective: objective?.summary ?? { correct: 0, incorrect: 0, unanswered: 0, total: 0 },
      proofs,
    },
  });
}
