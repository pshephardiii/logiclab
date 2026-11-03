/** Instructor decisions remain separate from the immutable automatic result/score. */
export interface InstructorItemGrade {
  itemId: string;
  earnedPoints: number | null;
  comment: string | null;
}
export interface InstructorGradingEntry extends InstructorItemGrade {
  reviewedBy: string;
  reviewedAt: string;
}
export interface InstructorGrading {
  gradingVersion: 'instructor_grading_v1';
  revision: number;
  items: InstructorGradingEntry[];
}
