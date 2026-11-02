import { z } from 'zod';
import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import { savedStudentResponsesSchema } from '@logiclab/contracts/saved-student-work';
import { libraryProblemDefinition } from '../problem/library-definition';
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

/** Validate identities and responses once; callers choose grading or score-free completion. */
export function validatedProofWork(items: ProofSubmissionOccurrence[], input: unknown) {
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
  return { assigned, responses };
}
