import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, Check, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
  GradeReleaseTiming,
} from '../types/assignment/enums.ts';
import { User } from './User.ts';
import { Classroom } from './Classroom.ts';
import type { AssignmentFields } from '../types/assignment/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';

/** Class-owned assignment; publication locks will be enforced by the assignment workflow. */
@Entity({ tableName: 'assignments' })
@Index({ name: 'assignments_classroom_id_index', properties: ['classroom'] })
@Check({
  name: 'assignments_assessment_mode_check',
  expression: "assessment_mode in ('graded', 'completion_only', 'ungraded_practice')",
})
@Check({
  name: 'assignments_feedback_timing_check',
  expression: "feedback_timing in ('on_submission', 'on_check', 'immediate')",
})
@Check({
  name: 'assignments_learning_policy_check',
  expression: `
    (assessment_mode = 'graded' and feedback_timing = 'on_submission')
    or (assessment_mode = 'completion_only' and feedback_timing in ('on_submission', 'on_check', 'immediate'))
    or (assessment_mode = 'ungraded_practice' and feedback_timing in ('on_check', 'immediate'))
  `,
})
@Check({
  name: 'assignments_solution_access_check',
  expression: "solution_access in ('never', 'after_submission', 'anytime', 'instructor_release')",
})
@Check({
  name: 'assignments_practice_solution_check',
  expression: "assessment_mode <> 'ungraded_practice' or solution_access in ('never', 'anytime')",
})
@Check({
  name: 'assignments_grade_release_timing_check',
  expression:
    "grade_release_timing in ('on_submission', 'instructor_release') and (assessment_mode = 'graded' or grade_release_timing = 'on_submission')",
})
@Check({
  name: 'assignments_grade_release_state_check',
  expression: `
    (grades_released_at is null and grades_released_by_id is null)
    or (grades_released_at is not null and grades_released_by_id is not null
      and assessment_mode = 'graded' and grade_release_timing = 'instructor_release'
      and published_at is not null and grades_released_at >= published_at)
  `,
})
@Check({
  name: 'assignments_answer_reveal_state_check',
  expression: `
    (answers_revealed_at is null and answers_revealed_by_id is null)
    or (answers_revealed_at is not null and answers_revealed_by_id is not null
      and assessment_mode in ('graded', 'completion_only') and solution_access = 'instructor_release'
      and published_at is not null and answers_revealed_at >= published_at)
  `,
})
export class Assignment implements AssignmentFields {
  [OptionalProps]?:
    | 'id'
    | 'assessmentMode'
    | 'feedbackTiming'
    | 'solutionAccess'
    | 'gradeReleaseTiming'
    | 'createdAt'
    | 'updatedAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => Classroom, {
    fieldName: 'classroom_id',
    foreignKeyName: 'assignments_classroom_id_fkey',
    deleteRule: 'restrict',
  })
  classroom!: Classroom;

  @Property({ type: 'string', length: 120 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  instructions?: string;

  @Property({
    type: 'string',
    length: 32,
    fieldName: 'assessment_mode',
    default: AssessmentMode.Graded,
  })
  assessmentMode: AssessmentMode = AssessmentMode.Graded;

  @Property({
    type: 'string',
    length: 32,
    fieldName: 'feedback_timing',
    default: FeedbackTiming.OnSubmission,
  })
  feedbackTiming: FeedbackTiming = FeedbackTiming.OnSubmission;

  @Property({
    type: 'string',
    length: 32,
    fieldName: 'solution_access',
    default: SolutionAccess.Never,
  })
  solutionAccess: SolutionAccess = SolutionAccess.Never;

  @Property({
    type: 'string',
    length: 32,
    fieldName: 'grade_release_timing',
    default: GradeReleaseTiming.OnSubmission,
  })
  gradeReleaseTiming: GradeReleaseTiming = GradeReleaseTiming.OnSubmission;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'grades_released_at',
    nullable: true,
  })
  gradesReleasedAt?: Date;

  @ManyToOne(() => User, {
    fieldName: 'grades_released_by_id',
    foreignKeyName: 'assignments_grades_released_by_id_fkey',
    nullable: true,
    deleteRule: 'restrict',
  })
  gradesReleasedBy?: User;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'answers_revealed_at',
    nullable: true,
  })
  answersRevealedAt?: Date;

  @ManyToOne(() => User, {
    fieldName: 'answers_revealed_by_id',
    foreignKeyName: 'assignments_answers_revealed_by_id_fkey',
    nullable: true,
    deleteRule: 'restrict',
  })
  answersRevealedBy?: User;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'published_at',
    nullable: true,
  })
  publishedAt?: Date;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'archived_at',
    nullable: true,
  })
  archivedAt?: Date;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'created_at',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt = new Date();

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'updated_at',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt = new Date();
}

// Fail compilation for extra/missing fields, changed types, or changed optionality.
// This validates the TypeScript shape; migration/schema tests validate decorators.
type AssignmentFieldsCheck = Assert<SameEntityFields<Assignment, AssignmentFields>>;
