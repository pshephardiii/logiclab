import type { ClassroomFields } from '../types/classroom/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { User } from './User.ts';

@Entity({ tableName: 'classrooms' })
@Index({ name: 'classrooms_owner_id_index', properties: ['owner'] })
export class Classroom implements ClassroomFields {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'string', length: 120 })
  name!: string;

  @ManyToOne(() => User, {
    fieldName: 'owner_id',
    foreignKeyName: 'classrooms_owner_id_fkey',
    deleteRule: 'restrict',
  })
  owner!: User;

  @Property({
    type: 'string',
    length: 64,
    fieldName: 'invitation_hash',
    nullable: true,
    unique: 'classrooms_invitation_hash_unique',
  })
  invitationHash?: string;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'invitation_expires_at',
    nullable: true,
  })
  invitationExpiresAt?: Date;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'created_at',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt = new Date();
}

// Keep the readable field reference exact, excluding ORM creation metadata.
type ClassroomFieldsCheck = Assert<SameEntityFields<Classroom, ClassroomFields>>;
