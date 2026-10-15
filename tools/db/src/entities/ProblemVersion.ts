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
import { Problem } from './Problem.js';
import type { ProblemDefinition } from '../types/problem-definition.js';

/** Publication snapshot; PostgreSQL migration triggers reject updates and deletion. */
@Entity({ tableName: 'problem_versions' })
@Trigger({
  name: 'problem_versions_immutable',
  timing: 'before',
  events: ['update', 'delete'],
  body: "raise exception 'Published problem versions are immutable' using errcode = '23514'",
})
@Check({ name: 'problem_versions_positive_version', expression: 'version > 0' })
@Unique({ name: 'problem_versions_problem_version_unique', properties: ['problem', 'version'] })
export class ProblemVersion {
  [OptionalProps]?: 'id' | 'publishedAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'string', length: 120 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  instructions?: string;

  @Property({ type: 'json', columnType: 'jsonb' })
  definition!: ProblemDefinition;

  @ManyToOne(() => Problem, {
    fieldName: 'problem_id',
    foreignKeyName: 'problem_versions_problem_id_fkey',
    deleteRule: 'restrict',
  })
  problem!: Problem;

  @Property({ type: 'integer' })
  version!: number;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'published_at',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  publishedAt = new Date();
}
