import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
  Check,
  Trigger,
} from '@mikro-orm/decorators/es';
import { AssignmentAttempt } from './AssignmentAttempt.ts';
import { User } from './User.ts';
import { gradingInsertBody, gradingRetentionBody } from '../triggers/grading-retention.ts';
import type { SubmissionGradingRevisionFields } from '../types/submission-grading-revision/fields.ts';
import type {
  InstructorItemGrade,
  InstructorGrading,
} from '../types/submission-grading-revision/grading.ts';
import type { AssignmentScore } from '../types/assignment-attempt/scoring.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';

/** Latest revision is current grading; every prior decision remains retained history. */
@Entity({ tableName: 'submission_grading_revisions' })
@Unique({
  name: 'submission_grading_revisions_attempt_revision_unique',
  properties: ['attempt', 'revision'],
})
@Check({ name: 'submission_grading_revisions_revision_check', expression: 'revision >= 1' })
@Check({
  name: 'submission_grading_revisions_state_check',
  expression: `
  coalesce(
    jsonb_typeof(grading) = 'object'
    and grading->>'gradingVersion' = 'instructor_grading_v1'
    and grading->'revision' = to_jsonb(revision)
    and jsonb_typeof(grading->'items') = 'array'
    and jsonb_array_length(grading->'items') >= 1 and jsonb_array_length(grading->'items') <= 50
    and jsonb_typeof(changes) = 'array'
    and jsonb_array_length(changes) >= 1 and jsonb_array_length(changes) <= 50
    and jsonb_typeof(score) = 'object'
    and score->>'scoringVersion' = 'points_v1', false
  )`,
})
@Trigger({
  name: 'grading_insert',
  timing: 'before',
  events: ['insert'],
  body: gradingInsertBody,
})
@Trigger({
  name: 'grading_immutable',
  timing: 'before',
  events: ['update', 'delete'],
  body: gradingRetentionBody,
})
export class SubmissionGradingRevision implements SubmissionGradingRevisionFields {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => AssignmentAttempt, {
    fieldName: 'attempt_id',
    foreignKeyName: 'submission_grading_revisions_attempt_id_fkey',
    deleteRule: 'restrict',
  })
  attempt!: AssignmentAttempt;

  @Property({ type: 'integer' })
  revision!: number;

  @ManyToOne(() => User, {
    fieldName: 'reviewer_id',
    foreignKeyName: 'submission_grading_revisions_reviewer_id_fkey',
    deleteRule: 'restrict',
  })
  reviewer!: User;

  @Property({ type: 'json', columnType: 'jsonb' })
  changes!: InstructorItemGrade[];

  @Property({ type: 'json', columnType: 'jsonb' })
  grading!: InstructorGrading;

  @Property({ type: 'json', columnType: 'jsonb' })
  score!: AssignmentScore;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'created_at',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt = new Date();
}

type SubmissionGradingRevisionFieldsCheck = Assert<
  SameEntityFields<SubmissionGradingRevision, SubmissionGradingRevisionFields>
>;
