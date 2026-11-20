import { ProblemType } from '@logiclab/contracts/problem-type';
import { validatedProofWork, type ProofSubmissionOccurrence } from './proof-work';

export type { ProofSubmissionOccurrence } from './proof-work';
import {
  proofSubmissionResultSchema,
  type ProofSubmissionResult,
  type ProofSubmissionItem,
  proofResponseVerification,
} from '@logiclab/contracts/proof-submission';
import { publicDerivationContent } from '../problem/derivation/projections';
import { evaluateProofAnswer } from './proof-response';
import { evaluateObjectiveSubmission } from './mixed-evaluation';
import { evaluateTruthTreeAnswer } from './truth-tree-response';
import { truthTreeContent } from '../problem/truth-tree/authoring';

/** Caller loads locked authoritative publications. This pure stage neither finalizes nor releases work. */
export function evaluateProofSubmission(
  items: ProofSubmissionOccurrence[],
  input: unknown,
): ProofSubmissionResult {
  const { assigned, responses } = validatedProofWork(items, input);

  const objectiveItems = assigned.flatMap((item) =>
    item.definition.type === ProblemType.Derivation ||
    item.definition.type === ProblemType.TruthTree
      ? []
      : [{ id: item.id, definition: item.definition }],
  );

  const objectiveResponses = Object.fromEntries(
    objectiveItems
      .filter((item) => responses.has(item.id))
      .map((item) => [item.id, responses.get(item.id)!]),
  );

  const objective = objectiveItems.length
    ? evaluateObjectiveSubmission(objectiveItems, objectiveResponses)
    : null;

  const objectiveResults: ProofSubmissionItem[] =
    objective?.gradingVersion === 'truth_table_v1'
      ? objective.items.map((item) => ({ ...item, type: ProblemType.TruthTable }))
      : (objective?.items ?? []);

  const objectiveById = new Map(objectiveResults.map((item) => [item.itemId, item]));
  const proofs = { accepted: 0, needsReview: 0, unassessable: 0, total: 0 };

  const results = assigned.map((item): ProofSubmissionItem => {
    if (item.definition.type === ProblemType.TruthTree) {
      const evidence = evaluateTruthTreeAnswer(
        {
          itemId: item.id,
          problemVersionId: item.problemVersionId,
          content: truthTreeContent(item.definition),
        },
        responses.get(item.id) ?? {
          type: ProblemType.TruthTree,
          tree: {
            treeVersion: 1,
            format: 'truth_tree',
            rootBranchId: null,
            occurrences: [],
            branches: [],
            expansions: [],
          },
        },
      );
      const verification = proofResponseVerification(evidence);

      proofs.total++;
      if (verification === 'verified') proofs.accepted++;
      else if (verification === 'errors_found') proofs.needsReview++;
      else proofs.unassessable++;

      return evidence;
    }

    if (item.definition.type !== ProblemType.Derivation) return objectiveById.get(item.id)!;

    // Missing work needs an empty proof in its pinned format so the report records incompleteness.
    const answer = responses.has(item.id)
      ? responses.get(item.id)
      : {
          type: ProblemType.Derivation,
          proof:
            item.definition.format === 'tree'
              ? { proofVersion: 1, format: 'tree', rootId: null, nodes: [] }
              : item.definition.format === 'dependency'
                ? { proofVersion: 1, format: 'dependency', steps: [] }
                : { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
        };

    const evidence = evaluateProofAnswer(
      {
        itemId: item.id,
        problemVersionId: item.problemVersionId,
        content: publicDerivationContent(item.definition),
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
