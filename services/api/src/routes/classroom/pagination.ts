import { classroomListResponseSchema } from '@logiclab/contracts';
import type {
  ClassroomSummary,
  ClassroomListQuery,
  ClassroomListResponse,
} from '@logiclab/contracts';

/** Callers fetch limit + 1 rows to detect a following page without a count query. */
export function classroomPage(
  rows: ClassroomSummary[],
  { limit, offset }: ClassroomListQuery,
): ClassroomListResponse {
  return classroomListResponseSchema.parse({
    classrooms: rows.slice(0, limit),
    nextOffset: rows.length > limit ? offset + limit : null,
  });
}
