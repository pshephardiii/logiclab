import type { AssessmentMode, FeedbackTiming, SolutionAccess } from './enums.ts';
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
  publishedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
