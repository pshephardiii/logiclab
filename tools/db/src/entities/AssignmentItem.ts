import type { AssignmentItemFields } from '../types/assignment-item/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Check, Unique, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { Assignment } from './Assignment.ts';
import { ProblemVersion } from './ProblemVersion.ts';

/** Stable occurrence ID for future student work, including repeated versions in a set. */
@Entity({ tableName: 'assignment_items' })
@Unique({
  name: 'assignment_items_assignment_position_unique',
  properties: ['assignment', 'position'],
})
@Check({ name: 'assignment_items_positive_position', expression: 'position > 0' })
export class AssignmentItem implements AssignmentItemFields {
  [OptionalProps]?: 'id';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => Assignment, {
    fieldName: 'assignment_id',
    foreignKeyName: 'assignment_items_assignment_id_fkey',
    deleteRule: 'restrict',
  })
  assignment!: Assignment;

  @ManyToOne(() => ProblemVersion, {
    fieldName: 'problem_version_id',
    foreignKeyName: 'assignment_items_problem_version_id_fkey',
    deleteRule: 'restrict',
  })
  problemVersion!: ProblemVersion;

  @Property({ type: 'integer' })
  position!: number;
}

// Keep the readable field reference exact, excluding ORM creation metadata.
type AssignmentItemFieldsCheck = Assert<SameEntityFields<AssignmentItem, AssignmentItemFields>>;
