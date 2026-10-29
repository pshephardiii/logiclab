import type {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
  GradeReleaseTiming,
} from './enums.ts';
import type { User } from '../../entities/User.ts';
import type { Classroom } from '../../entities/Classroom.ts';

/** Readable Assignment shape; the decorated entity is checked against it in both directions. */
export interface AssignmentFields {
  id: string;
  classroom: Classroom;
  title: string;
  instructions?: string;
  assessmentMode: AssessmentMode;
  feedbackTiming: FeedbackTiming;
  solutionAccess: SolutionAccess;
  gradeReleaseTiming: GradeReleaseTiming;
  gradesReleasedAt?: Date;
  gradesReleasedBy?: User;
  answersRevealedAt?: Date;
  answersRevealedBy?: User;
  publishedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
