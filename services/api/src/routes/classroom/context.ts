import type { ResourceContext } from '../resource-context';
import type { ClassroomStore } from '../../persistence/classroom/types';

export type ClassroomContext = ResourceContext & { classrooms: ClassroomStore };
