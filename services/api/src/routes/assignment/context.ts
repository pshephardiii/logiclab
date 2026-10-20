import type { ResourceContext } from '../resource-context';
import type { AssignmentStore } from '../../persistence/assignment/store';

export type AssignmentContext = ResourceContext & { assignments: AssignmentStore };
