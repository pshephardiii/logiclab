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
import type { ClassPurchaseFields } from '../types/class-purchase/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';
import { Classroom } from './Classroom.ts';
import { User } from './User.ts';
import { PurchaseStatus } from '../types/class-purchase/enums.ts';

/** One checkout purchase; access decisions belong to ClassEntitlement, not payment status. */
@Entity({ tableName: 'class_purchases' })
@Check({ name: 'class_purchases_provider_check', expression: "provider in ('simulator')" })
@Unique({
  name: 'class_purchases_provider_checkout_unique',
  properties: ['provider', 'checkoutReference'],
})
@Index({ name: 'class_purchases_classroom_index', properties: ['classroom'] })
@Check({
  name: 'class_purchases_status_check',
  expression: "status in ('pending', 'paid', 'failed', 'refunded')",
})
@Check({ name: 'class_purchases_amount_check', expression: 'amount_minor >= 0' })
@Check({ name: 'class_purchases_coverage_check', expression: 'coverage_days > 0' })
@Check({ name: 'class_purchases_sequence_check', expression: 'last_event_sequence >= 0' })
@Check({ name: 'class_purchases_currency_check', expression: "currency ~ '^[A-Z]{3}$'" })
export class ClassPurchase implements ClassPurchaseFields {
  [OptionalProps]?: 'id' | 'status' | 'lastEventSequence' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @ManyToOne(() => Classroom, {
    fieldName: 'classroom_id',
    foreignKeyName: 'class_purchases_classroom_id_fkey',
    deleteRule: 'restrict',
  })
  classroom!: Classroom;

  @ManyToOne(() => User, {
    fieldName: 'payer_id',
    foreignKeyName: 'class_purchases_payer_id_fkey',
    deleteRule: 'restrict',
  })
  payer!: User;

  @Property({ type: 'string', fieldName: 'provider', length: 32 })
  provider!: BillingProvider;

  @Property({ type: 'string', fieldName: 'checkout_reference', length: 255 })
  checkoutReference!: string;

  @Property({ type: 'string', fieldName: 'status', length: 32, default: PurchaseStatus.Pending })
  status: PurchaseStatus = PurchaseStatus.Pending;

  @Property({ type: 'integer', fieldName: 'amount_minor' })
  amountMinor!: number;

  @Property({ type: 'string', fieldName: 'currency', length: 3 })
  currency!: string;

  @Property({ type: 'integer', fieldName: 'coverage_days' })
  coverageDays!: number;

  @Property({ type: 'integer', fieldName: 'last_event_sequence', default: 0 })
  lastEventSequence: number = 0;

  @Property({
    type: 'datetime',
    fieldName: 'created_at',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt: Date = new Date();
}

type ClassPurchaseFieldsCheck = Assert<SameEntityFields<ClassPurchase, ClassPurchaseFields>>;
