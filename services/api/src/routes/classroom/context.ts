import type { AuthContext } from '../auth/context';
import type { ClassroomStore } from '../../classroom/store';
export type ClassroomContext = AuthContext & { classrooms: ClassroomStore };
