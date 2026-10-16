import type { BillingModel, BillingInterval } from './enums.ts';
import type { ClassCapability } from '../class-entitlement/enums.ts';

export interface BillingPlanFields {
  id: string;
  name: string;
  billingModel: BillingModel;
  amountMinor: number;
  currency: string;
  capability: ClassCapability;
  coverageDays?: number;
  billingInterval?: BillingInterval;
  active: boolean;
  createdAt: Date;
}
