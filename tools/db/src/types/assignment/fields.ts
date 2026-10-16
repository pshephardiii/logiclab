import type { AssessmentMode, FeedbackTiming } from './enums.ts';
import type { Classroom } from '../../entities/Classroom.ts';

/** Readable Assignment shape; the decorated entity is checked against it in both directions. */
export interface AssignmentFields {
  id: string;
  classroom: Classroom;
  title: string;
  instructions?: string;
  assessmentMode: AssessmentMode;
  feedbackTiming: FeedbackTiming;
  allowSolutions: boolean;
  publishedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
