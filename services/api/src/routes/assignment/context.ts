import type { AuthContext } from '../auth/context';
import type { AssignmentStore } from '../../persistence/assignment/store';

export type AssignmentContext = AuthContext & { assignments: AssignmentStore };
