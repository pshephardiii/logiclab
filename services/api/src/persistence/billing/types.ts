import type {
  BillingListQuery,
  ClassBillingResponse,
  billingPlansResponseSchema,
  CheckoutRequest,
  PurchaseResponse,
} from '@logiclab/contracts';
import type { z } from 'zod';
import type { PaymentProvider, PaymentEvent } from '../../application/billing/provider';

export interface BillingReadStore {
  plans(query: BillingListQuery): Promise<z.infer<typeof billingPlansResponseSchema>>;
  readClass(
    ownerId: string,
    classId: string,
    query: BillingListQuery,
  ): Promise<ClassBillingResponse>;
}

export type VerifiedDelivery = { event: PaymentEvent; hash: string };
export interface BillingStore extends BillingReadStore {
  checkout(
    ownerId: string,
    classId: string,
    input: CheckoutRequest,
    provider: PaymentProvider,
  ): Promise<PurchaseResponse>;
  process(delivery: VerifiedDelivery): Promise<{ result: 'applied' | 'ignored' | 'duplicate' }>;
  simulate(
    ownerId: string,
    purchaseId: string,
    makeDelivery: (reference: string, sequence: number) => VerifiedDelivery,
  ): Promise<{ result: 'applied' | 'ignored' | 'duplicate' }>;
}
