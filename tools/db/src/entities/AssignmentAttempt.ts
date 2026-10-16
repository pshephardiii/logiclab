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
import { Assignment } from './Assignment.ts';
import { User } from './User.ts';
import type { AssignmentAttemptFields } from '../types/assignment-attempt/fields.ts';
import type { AttemptAnswers, SubmissionResult } from '../types/assignment-attempt/work.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';

/** Mutable saved work becomes a retained immutable record on final submission. */
@Entity({ tableName: 'assignment_attempts' })
@Unique({
  name: 'assignment_attempts_assignment_student_unique',
  properties: ['assignment', 'student'],
})
@Check({ name: 'assignment_attempts_revision_nonnegative', expression: 'revision >= 0' })
@Check({
  name: 'assignment_attempts_submission_result_check',
  expression: '(submitted_at is null) = (result is null)',
})
@Trigger({
  name: 'assignment_attempts_submitted_immutable',
  timing: 'before',
  events: ['update', 'delete'],
  body: "if OLD.submitted_at is not null then raise exception 'Submitted attempts are immutable' using errcode = '23514'; end if; if TG_OP = 'DELETE' then return OLD; end if; return NEW;",
})
export class AssignmentAttempt implements AssignmentAttemptFields {
  [OptionalProps]?: 'id' | 'answers' | 'revision' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => Assignment, {
    fieldName: 'assignment_id',
    foreignKeyName: 'assignment_attempts_assignment_id_fkey',
    deleteRule: 'restrict',
  })
  assignment!: Assignment;

  @ManyToOne(() => User, {
    fieldName: 'student_id',
    foreignKeyName: 'assignment_attempts_student_id_fkey',
    deleteRule: 'restrict',
  })
  student!: User;

  @Property({ type: 'json', columnType: 'jsonb', defaultRaw: "'{}'::jsonb" })
  answers: AttemptAnswers = {};

  @Property({ type: 'integer', default: 0 })
  revision = 0;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'submitted_at',
    nullable: true,
  })
  submittedAt?: Date;

  @Property({ type: 'json', columnType: 'jsonb', nullable: true })
  result?: SubmissionResult;

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

type AssignmentAttemptFieldsCheck = Assert<
  SameEntityFields<AssignmentAttempt, AssignmentAttemptFields>
>;
