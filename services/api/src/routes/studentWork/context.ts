import type { ResourceContext } from '../resource-context';
import type { StudentWorkStore } from '../../persistence/student-work/types';

export type StudentWorkContext = ResourceContext & { studentWork: StudentWorkStore };
