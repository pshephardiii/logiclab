import type { BillingProvider } from '../billing/enums.ts';
export interface PaymentEventFields {
  id: string;
  provider: BillingProvider;
  eventId: string;
  sourceReference: string;
  sequence: number;
  payloadHash: string;
  processedAt: Date;
}
