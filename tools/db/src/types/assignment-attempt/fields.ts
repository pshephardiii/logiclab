import type { Assignment } from '../../entities/Assignment.ts';
import type { User } from '../../entities/User.ts';
import type { AttemptAnswers, SubmissionResult } from './work.ts';

export interface AssignmentAttemptFields {
  id: string;
  assignment: Assignment;
  student: User;
  answers: AttemptAnswers;
  revision: number;
  submittedAt?: Date;
  result?: SubmissionResult;
  createdAt: Date;
  updatedAt: Date;
}
