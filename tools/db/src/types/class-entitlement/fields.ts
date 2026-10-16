import type { BillingProvider } from '../billing/enums.ts';
import type { Classroom } from '../../entities/Classroom.ts';
import type { EntitlementSource, ClassCapability } from './enums.ts';

export interface ClassEntitlementFields {
  id: string;
  classroom: Classroom;
  source: EntitlementSource;
  provider: BillingProvider;
  sourceReference: string;
  capability: ClassCapability;
  startsAt: Date;
  endsAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}
