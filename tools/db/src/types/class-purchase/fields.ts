import type { BillingPlan } from '../../entities/BillingPlan.ts';
import type { ClassCapability } from '../class-entitlement/enums.ts';
import type { BillingProvider } from '../billing/enums.ts';
import type { Classroom } from '../../entities/Classroom.ts';
import type { User } from '../../entities/User.ts';
import type { PurchaseStatus } from './enums.ts';

export interface ClassPurchaseFields {
  id: string;
  classroom: Classroom;
  payer: User;
  plan: BillingPlan;
  capability: ClassCapability;
  provider: BillingProvider;
  checkoutReference: string;
  status: PurchaseStatus;
  amountMinor: number;
  currency: string;
  coverageDays: number;
  lastEventSequence: number;
  createdAt: Date;
}
