import type {
  AssignmentDetail,
  AssignmentSummary,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  AssignmentListQuery,
} from '@logiclab/contracts';

export interface AssignmentStore {
  create(
    ownerId: string,
    classId: string,
    input: CreateAssignmentRequest,
  ): Promise<AssignmentDetail>;
  list(ownerId: string, classId: string, query: AssignmentListQuery): Promise<AssignmentSummary[]>;
  findOwned(ownerId: string, assignmentId: string): Promise<AssignmentDetail>;
  update(
    ownerId: string,
    assignmentId: string,
    input: UpdateAssignmentRequest,
  ): Promise<AssignmentDetail>;
  duplicate(ownerId: string, assignmentId: string): Promise<AssignmentDetail>;
  release(
    ownerId: string,
    assignmentId: string,
    kind: 'grades' | 'answers',
  ): Promise<AssignmentDetail>;
  publish(ownerId: string, assignmentId: string): Promise<AssignmentDetail>;
  setArchived(ownerId: string, assignmentId: string, archived: boolean): Promise<AssignmentDetail>;
}
