import { z } from 'zod';
import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import { savedStudentResponsesSchema } from '@logiclab/contracts/saved-student-work';
import {
  proofSubmissionResultSchema,
  type ProofSubmissionResult,
  type ProofSubmissionItem,
} from '@logiclab/contracts/proof-submission';
import { libraryProblemDefinition } from '../problem/library-definition';
import { derivationContent } from '../problem/derivation-authoring';
import { evaluateDerivationAnswer } from './derivation-response';
import { evaluateAssignmentSubmission } from './mixed-evaluation';
import { StudentWorkError } from './errors';

export type ProofSubmissionOccurrence = {
  id: string;
  problemVersionId: string;
  definition: LibraryProblemDefinition;
};
const identitiesSchema = z
  .array(
    z.strictObject({
      id: z.uuid().transform((id) => id.toLowerCase()),
      problemVersionId: z.uuid().transform((id) => id.toLowerCase()),
    }),
  )
  .min(1)
  .max(50)
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length);

/** Caller loads locked authoritative publications. This pure stage neither finalizes nor releases work. */
export function evaluateProofSubmission(
  items: ProofSubmissionOccurrence[],
  input: unknown,
): ProofSubmissionResult {
  const identities = identitiesSchema.safeParse(
    items.map(({ id, problemVersionId }) => ({ id, problemVersionId })),
  );
  const parsed = savedStudentResponsesSchema.safeParse(input);
  if (!identities.success || !parsed.success) throw new StudentWorkError('invalid_answer');
  const assigned = items.map((item, index) => ({
    ...identities.data[index]!,
    definition: libraryProblemDefinition(item.definition),
  }));
  const itemIds = new Set(assigned.map((item) => item.id));
  const responses = new Map<string, (typeof parsed.data)[string]>();
  for (const [id, answer] of Object.entries(parsed.data)) {
    const normalized = id.toLowerCase();
    if (!itemIds.has(normalized) || responses.has(normalized))
      throw new StudentWorkError('invalid_answer');
    responses.set(normalized, answer);
  }
  if (!assigned.some((item) => item.definition.type === 'derivation'))
    throw new StudentWorkError('unsupported_policy');
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
