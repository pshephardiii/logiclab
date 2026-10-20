import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Check, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { BillingModel, BillingInterval } from '../types/billing-plan/enums.ts';
import { ClassCapability } from '../types/class-entitlement/enums.ts';
import type { BillingPlanFields } from '../types/billing-plan/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';

/** Catalog terms; purchases retain their own terms when a plan is edited or retired. */
@Entity({ tableName: 'billing_plans' })
@Check({ name: 'billing_plans_amount_check', expression: 'amount_minor >= 0' })
@Check({ name: 'billing_plans_currency_check', expression: "currency ~ '^[A-Z]{3}$'" })
@Check({
  name: 'billing_plans_capability_check',
  expression: "capability in ('publish_assignments')",
})
@Check({
  name: 'billing_plans_terms_check',
  expression: `
      (billing_model = 'one_time'
        and coverage_days is not null
        and coverage_days > 0
        and billing_interval is null)
      or (billing_model = 'recurring'
        and coverage_days is null
        and billing_interval is not null
        and billing_interval in ('month', 'year'))
    `,
})
export class BillingPlan implements BillingPlanFields {
  [OptionalProps]?: 'id' | 'active' | 'createdAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'string', length: 120 })
  name!: string;

  @Property({ type: 'string', length: 32, fieldName: 'billing_model' })
  billingModel!: BillingModel;

  @Property({ type: 'integer', fieldName: 'amount_minor' })
  amountMinor!: number;

  @Property({ type: 'string', length: 3 })
  currency!: string;

  @Property({ type: 'string', length: 32 })
  capability!: ClassCapability;

  @Property({ type: 'integer', fieldName: 'coverage_days', nullable: true })
  coverageDays?: number;

  @Property({ type: 'string', length: 32, fieldName: 'billing_interval', nullable: true })
  billingInterval?: BillingInterval;

  @Property({ type: 'boolean', default: true })
  active = true;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    fieldName: 'created_at',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  createdAt = new Date();
}

type BillingPlanFieldsCheck = Assert<SameEntityFields<BillingPlan, BillingPlanFields>>;
