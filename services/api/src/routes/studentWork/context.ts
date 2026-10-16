import type { AuthContext } from '../auth/context';
import type { StudentWorkStore } from '../../persistence/student-work/store';

export type StudentWorkContext = AuthContext & { studentWork: StudentWorkStore };
