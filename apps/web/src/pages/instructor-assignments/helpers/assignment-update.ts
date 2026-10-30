import type {
  AssignmentDetail,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
} from '@logiclab/contracts';

/** Preserve occurrence IDs for weight-only edits; replace content only when its order changes. */
export function assignmentUpdate(
  selected: AssignmentDetail,
  input: CreateAssignmentRequest,
  itemsChanged: boolean,
): UpdateAssignmentRequest {
  const { problemVersionIds, items, ...metadata } = input;
  if (itemsChanged) return { ...metadata, ...(items ? { items } : { problemVersionIds }) };
  if (items && items.some((item, index) => item.maxPoints !== selected.items[index]?.maxPoints)) {
    return {
      ...metadata,
      pointAllocations: selected.items.map((item, index) => ({
        itemId: item.id,
        maxPoints: items[index]!.maxPoints,
      })),
    };
  }
  return metadata;
}
