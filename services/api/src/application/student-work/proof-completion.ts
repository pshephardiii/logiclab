import {
  isFinishedFitchProofAttempt,
  isFinishedDependencyProofAttempt,
  isFinishedNaturalDeductionTreeProofAttempt,
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
import { truthTreeContent } from '../problem/truth-tree/authoring';
import { evaluateTruthTreeCompletion } from './truth-tree-response';

/** Pure finalization: caller authorizes and locks work; diagnostics must remain post-submission. */
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
          ? isFinishedNaturalDeductionTreeProofAttempt
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
    item.definition.type === 'derivation' || item.definition.type === 'truth_tree'
      ? []
      : [{ id: item.id, definition: item.definition }],
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

  // Diagnostics remain local until every item passes its completion gate and the caller commits the final.
  for (const { item, answer, content } of proofs) {
    const evidence = evaluateProofAnswer(
      { itemId: item.id, problemVersionId: item.problemVersionId, content },
      answer,
    );
    results.set(item.id, { ...evidence, completedResponses: 1, totalResponses: 1 });
  }

  for (const item of assigned) {
    if (item.definition.type !== 'truth_tree') continue;

    const answer = responses.get(item.id);

    if (answer === undefined) throw new StudentWorkError('incomplete_work');

    results.set(
      item.id,
      evaluateTruthTreeCompletion(
        {
          itemId: item.id,
          problemVersionId: item.problemVersionId,
          content: truthTreeContent(item.definition),
        },
        answer,
      ),
    );
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
