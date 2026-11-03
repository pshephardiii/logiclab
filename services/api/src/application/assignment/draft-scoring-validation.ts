import {
  assignmentPointAllocationsSchema,
  weightedAssignmentItemsSchema,
  type UpdateAssignmentRequest,
} from '@logiclab/contracts';
import { AssignmentOperationError } from './errors';

type DraftScoringInput = Pick<
  UpdateAssignmentRequest,
  'items' | 'pointAllocations' | 'problemVersionIds'
>;

/** Input compatibility only; the caller owns assignment access and draft mutations. */
export function validateDraftScoringInput(assessmentMode: string, input: DraftScoringInput): void {
  if (
    input.items !== undefined &&
    (!weightedAssignmentItemsSchema.safeParse(input.items).success ||
      input.pointAllocations !== undefined ||
      (input.problemVersionIds?.length ?? 0) > 0)
  )
    throw new AssignmentOperationError('invalid_scoring');
  const graded = assessmentMode === 'graded';
  if ((input.items !== undefined || input.pointAllocations !== undefined) && !graded)
    throw new AssignmentOperationError('invalid_scoring');
}

/** Require one valid allocation for each effective occurrence; never mutate the supplied items. */
export function validatedDraftPointAllocations(
  input: unknown,
  items: readonly { id: string }[],
): Map<string, number> {
  const parsed = assignmentPointAllocationsSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.length !== items.length ||
    parsed.data.some((value) => !items.some((item) => item.id === value.itemId))
  )
    throw new AssignmentOperationError('invalid_scoring');
  return new Map(parsed.data.map((value) => [value.itemId, value.maxPoints]));
}
