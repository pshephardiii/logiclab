import type { ResourceContext } from '../resource-context';
import type { ClassroomStore } from '../../persistence/classroom/store';

export type ClassroomContext = ResourceContext & { classrooms: ClassroomStore };
