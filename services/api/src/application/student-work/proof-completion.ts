import {
  isFinishedFitchProofAttempt,
  isFinishedDependencyProofAttempt,
  isFinishedTreeProofAttempt,
} from '@logiclab/logic-engine/proof/completion';
import {
  proofCompletionSubmissionResultSchema,
  summarizeProofCompletionVerification,
  type ProofCompletionSubmissionResult,
} from '@logiclab/contracts/proof-submission';
import { publicDerivationContent } from '../problem/derivation/projections';
import { evaluateProofAnswer, validateProofAnswer } from './proof-response';
import { evaluateObjectiveCompletion } from './mixed-evaluation';
import { validatedProofWork, type ProofSubmissionOccurrence } from './proof-work';
import { StudentWorkError } from './errors';

/** Pure staged finalization: caller authorizes and locks work; diagnostics must remain post-submission. */
export function evaluateProofCompletion(
  items: ProofSubmissionOccurrence[],
  input: unknown,
): ProofCompletionSubmissionResult {
  const { assigned, responses } = validatedProofWork(items, input);

  const proofs = assigned.flatMap((item) => {
    if (item.definition.type !== 'derivation') return [];

    const value = responses.get(item.id);

    if (value === undefined) throw new StudentWorkError('incomplete_work');

    const content = publicDerivationContent(item.definition);
    const answer = validateProofAnswer(content, value);

    if (
      !(
        content.format === 'tree'
          ? isFinishedTreeProofAttempt
          : content.format === 'dependency'
            ? isFinishedDependencyProofAttempt
            : isFinishedFitchProofAttempt
      )({
        problem: {
          ruleCatalogVersion: content.ruleCatalogVersion,
          premises: content.premises,
          conclusion: content.conclusion,
          permittedRuleIds: content.rules.map((rule) => rule.id),
        },
        proof: answer.proof,
      })
    )
      throw new StudentWorkError('incomplete_work');

    return [{ item, answer, content }];
  });

  const objectiveItems = assigned.flatMap((item) =>
    item.definition.type === 'derivation' ? [] : [{ id: item.id, definition: item.definition }],
  );

  const objective = objectiveItems.length
    ? evaluateObjectiveCompletion(
        objectiveItems,
        Object.fromEntries(
          objectiveItems
            .filter((item) => responses.has(item.id))
            .map((item) => [item.id, responses.get(item.id)!]),
        ),
      )
    : null;

  const results = new Map<string, ProofCompletionSubmissionResult['items'][number]>();

  for (const item of objective?.items ?? []) {
    results.set(
      item.itemId,
      'completedCells' in item
        ? {
            itemId: item.itemId,
            type: 'truth_table',
            completedResponses: item.completedCells,
            totalResponses: item.totalCells,
          }
        : item,
    );
  }

  // Only after every proof/objective response is complete, generate fresh feedback for retained final work.
  for (const { item, answer, content } of proofs) {
    const evidence = evaluateProofAnswer(
      { itemId: item.id, problemVersionId: item.problemVersionId, content },
      answer,
    );
    results.set(item.id, { ...evidence, completedResponses: 1, totalResponses: 1 });
  }

  const ordered = assigned.map((item) => results.get(item.id)!);

  return proofCompletionSubmissionResultSchema.parse({
    gradingVersion: 'proof_completion_v1',
    items: ordered,
    summary: {
      proofVerification: summarizeProofCompletionVerification(ordered),
      completedResponses: ordered.reduce((sum, item) => sum + item.completedResponses, 0),
      totalResponses: ordered.reduce((sum, item) => sum + item.totalResponses, 0),
    },
  });
}
