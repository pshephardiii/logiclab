import type {
  SavedStudentAttempt,
  SavedStudentAssignmentResponse,
  SavedStudentAnswers,
  SavedStudentCheck,
  SavedStudentCheckResponse,
  SavedStudentSolutionResponse,
} from '@logiclab/contracts/saved-student-work';
import type { AssignmentSummary, StudentAssignmentListQuery } from '@logiclab/contracts';

export interface StudentWorkStore {
  list(
    studentId: string,
    classId: string,
    query: StudentAssignmentListQuery,
  ): Promise<AssignmentSummary[]>;
  read(studentId: string, assignmentId: string): Promise<SavedStudentAssignmentResponse>;
  save(
    studentId: string,
    assignmentId: string,
    input: SavedStudentAnswers,
  ): Promise<SavedStudentAttempt>;
  check(
    studentId: string,
    assignmentId: string,
    input: SavedStudentCheck,
  ): Promise<SavedStudentCheckResponse>;
  submit(studentId: string, assignmentId: string, revision: number): Promise<SavedStudentAttempt>;
  solution(
    studentId: string,
    assignmentId: string,
    itemId: string,
  ): Promise<SavedStudentSolutionResponse>;
}
