import type { Classroom as ClassroomEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { ClassroomSummary } from '@logiclab/contracts';

export function classroomSummary(value: ClassroomEntity): ClassroomSummary {
  return {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt.toISOString(),
  };
}
