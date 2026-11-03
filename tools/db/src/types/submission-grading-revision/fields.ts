import type { AssignmentAttempt } from '../../entities/AssignmentAttempt.ts';
import type { User } from '../../entities/User.ts';
import type { AssignmentScore } from '../assignment-attempt/scoring.ts';
import type { InstructorItemGrade, InstructorGrading } from './grading.ts';

export interface SubmissionGradingRevisionFields {
  id: string;
  attempt: AssignmentAttempt;
  revision: number;
  reviewer: User;
  changes: InstructorItemGrade[];
  grading: InstructorGrading;
  score: AssignmentScore;
  createdAt: Date;
}
