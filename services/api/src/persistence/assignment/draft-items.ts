import type { Assignment as AssignmentEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { ASSIGNMENT_POINT_LIMITS, type UpdateAssignmentRequest } from '@logiclab/contracts';
import type { DatabaseManager } from '../transactions';
import {
  validateDraftScoringInput,
  validatedDraftPointAllocations,
} from '../../application/assignment/draft-scoring-validation';
import { AssignmentOperationError } from '../../application/assignment/errors';
import { ownedVersions } from './queries';

/** Caller owns the transaction; replacement and validation must commit or roll back together. */
export async function replaceItems(
  em: DatabaseManager,
  ownerId: string,
  assignment: AssignmentEntity,
  ids: string[],
  points?: number[],
) {
  const { AssignmentItem } = await import('@logiclab/db');
  const versions = await ownedVersions(em, ownerId, ids, assignment);

  // Validate all references before replacement; the transaction rolls back the entire draft on failure.
  await em.nativeDelete(AssignmentItem, { assignment: assignment.id });

  ids.forEach((id, index) =>
    em.persist(
      em.create(AssignmentItem, {
        assignment,
        problemVersion: versions.get(id)!,
        position: index + 1,
        ...(points ? { maxPoints: points[index] } : {}),
      }),
    ),
  );
}

export async function draftScoring(
  em: DatabaseManager,
  ownerId: string,
  assignment: AssignmentEntity,
  input: UpdateAssignmentRequest,
) {
  const { AssignmentItem } = await import('@logiclab/db');

  validateDraftScoringInput(assignment.assessmentMode, input);

  const graded = assignment.assessmentMode === 'graded';

  let items = await em.find(
    AssignmentItem,
    { assignment: assignment.id },
    { orderBy: { position: 'ASC' } },
  );

  if (input.items !== undefined) {
    await replaceItems(
      em,
      ownerId,
      assignment,
      input.items.map((item) => item.problemVersionId),
      input.items.map((item) => item.maxPoints),
    );
  } else if (input.problemVersionIds !== undefined) {
    const same =
      input.problemVersionIds.length === items.length &&
      items.every((item, index) => item.problemVersion.id === input.problemVersionIds![index]);

    if (graded && !same && items.length > 0) throw new AssignmentOperationError('invalid_scoring');

    if (!same)
      await replaceItems(
        em,
        ownerId,
        assignment,
        input.problemVersionIds,
        input.problemVersionIds.map(() => ASSIGNMENT_POINT_LIMITS.defaultPoints),
      );
  }

  await em.flush();

  items = await em.find(
    AssignmentItem,
    { assignment: assignment.id },
    { orderBy: { position: 'ASC' } },
  );

  // Validate the complete effective set, including policy-only PATCHes and retained occurrences.
  await ownedVersions(
    em,
    ownerId,
    items.map((item) => item.problemVersion.id),
    assignment,
  );

  if (input.pointAllocations !== undefined) {
    const points = validatedDraftPointAllocations(input.pointAllocations, items);

    for (const item of items) item.maxPoints = points.get(item.id)!;
  }
}
