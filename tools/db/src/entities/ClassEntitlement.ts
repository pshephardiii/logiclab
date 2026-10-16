import { BillingProvider } from '../types/billing/enums.ts';
import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import {
  Entity,
  Index,
  Check,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/es';
import type { ClassEntitlementFields } from '../types/class-entitlement/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { Classroom } from './Classroom.ts';
import { EntitlementSource, ClassCapability } from '../types/class-entitlement/enums.ts';

/** Time-bounded class capability. Multiple funding sources may cover the same class. */
@Entity({ tableName: 'class_entitlements' })
@Check({ name: 'class_entitlements_provider_check', expression: "provider in ('simulator')" })
@Unique({
  name: 'class_entitlements_source_unique',
  properties: ['provider', 'source', 'sourceReference', 'classroom', 'capability'],
})
@Index({ name: 'class_entitlements_classroom_index', properties: ['classroom'] })
@Check({ name: 'class_entitlements_source_check', expression: "source in ('class_purchase')" })
@Check({
  name: 'class_entitlements_capability_check',
  expression: "capability in ('publish_assignments')",
})
@Check({ name: 'class_entitlements_period_check', expression: 'ends_at > starts_at' })
export class ClassEntitlement implements ClassEntitlementFields {
  [OptionalProps]?: 'id' | 'capability' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => Classroom, {
    fieldName: 'classroom_id',
    foreignKeyName: 'class_entitlements_classroom_id_fkey',
    deleteRule: 'restrict',
  })
  classroom!: Classroom;

  @Property({ type: 'string', fieldName: 'source', length: 32 })
  source!: EntitlementSource;

  @Property({ type: 'string', fieldName: 'provider', length: 32 })
  provider!: BillingProvider;

  @Property({ type: 'string', fieldName: 'source_reference', length: 255 })
  sourceReference!: string;

  @Property({
    type: 'string',
    fieldName: 'capability',
    length: 32,
    default: ClassCapability.PublishAssignments,
  })
  capability: ClassCapability = ClassCapability.PublishAssignments;

  @Property({ type: 'datetime', fieldName: 'starts_at', columnType: 'timestamptz' })
  startsAt!: Date;

  @Property({ type: 'datetime', fieldName: 'ends_at', columnType: 'timestamptz' })
  endsAt!: Date;

  @Property({
    type: 'datetime',
    fieldName: 'revoked_at',
    columnType: 'timestamptz',
    nullable: true,
  })
  revokedAt?: Date;

  @Property({
    type: 'datetime',
    fieldName: 'created_at',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt: Date = new Date();
}

type ClassEntitlementFieldsCheck = Assert<
  SameEntityFields<ClassEntitlement, ClassEntitlementFields>
>;
