/** Frozen server-selected terms; adapters never accept prices from a browser checkout. */
export interface PurchaseTerms {
  planId: string;
  amountMinor: number;
  currency: string;
  coverageDays: number;
  capability: 'publish_assignments';
}

export interface CheckoutSession {
  reference: string;
  mode: 'simulated';
  terms: PurchaseTerms;
  notice: string;
}

export interface PaymentEvent {
  version: 1;
  id: string;
  sourceReference: string;
  sequence: number;
  outcome: 'paid' | 'failed' | 'refunded';
  occurredAt: string;
}

/** Transport boundary; database writes and entitlement policy belong to the application. */
export interface PaymentProvider {
  createCheckout(terms: PurchaseTerms): Promise<CheckoutSession>;
  verifyEvent(body: string, signature: string): PaymentEvent;
}
