import type { ProblemFields } from '../types/problem/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { User } from './User.ts';
import type { ProblemDefinition } from '../types/problem/definition.ts';

/** Stable instructor-owned identity with mutable draft content and reversible archiving. */
@Entity({ tableName: 'problems' })
@Index({ name: 'problems_owner_id_index', properties: ['owner'] })
export class Problem implements ProblemFields {
  [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'string', length: 120 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  instructions?: string;

  @Property({ type: 'json', columnType: 'jsonb' })
  definition!: ProblemDefinition;

  @ManyToOne(() => User, {
    fieldName: 'owner_id',
    foreignKeyName: 'problems_owner_id_fkey',
    deleteRule: 'restrict',
  })
  owner!: User;

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

// Keep the readable field reference exact, excluding ORM creation metadata.
type ProblemFieldsCheck = Assert<SameEntityFields<Problem, ProblemFields>>;
