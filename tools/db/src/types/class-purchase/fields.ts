import type { BillingProvider } from '../billing/enums.ts';
import type { Classroom } from '../../entities/Classroom.ts';
import type { User } from '../../entities/User.ts';
import type { PurchaseStatus } from './enums.ts';

export interface ClassPurchaseFields {
  id: string;
  classroom: Classroom;
  payer: User;
  provider: BillingProvider;
  checkoutReference: string;
  status: PurchaseStatus;
  amountMinor: number;
  currency: string;
  coverageDays: number;
  lastEventSequence: number;
  createdAt: Date;
}
