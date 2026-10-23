import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, Check, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { AssessmentMode, FeedbackTiming, SolutionAccess } from '../types/assignment/enums.ts';
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
    or (assessment_mode in ('completion_only', 'ungraded_practice') and feedback_timing in ('on_check', 'immediate'))
  `,
})
@Check({
  name: 'assignments_solution_access_check',
  expression: "solution_access in ('never', 'after_submission', 'anytime')",
})
@Check({
  name: 'assignments_practice_solution_check',
  expression: "assessment_mode <> 'ungraded_practice' or solution_access <> 'after_submission'",
})
export class Assignment implements AssignmentFields {
  [OptionalProps]?:
    'id' | 'assessmentMode' | 'feedbackTiming' | 'solutionAccess' | 'createdAt' | 'updatedAt';

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
