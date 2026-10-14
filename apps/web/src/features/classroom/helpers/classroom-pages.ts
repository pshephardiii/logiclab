import type { ClassroomSummary } from '@logiclab/contracts';

export function appendClassroomPage(current: ClassroomSummary[], page: ClassroomSummary[]): ClassroomSummary[] {
  const existingIds = new Set(current.map(classroom => classroom.id));
  return [...current, ...page.filter(classroom => !existingIds.has(classroom.id))];
}
