import type { ResourceContext } from '../resource-context';
import type { StudentWorkStore } from '../../persistence/student-work/store';

export type StudentWorkContext = ResourceContext & { studentWork: StudentWorkStore };
