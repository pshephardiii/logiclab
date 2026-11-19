import { z } from 'zod';

export const PurchaseStatus = {
  Pending: 'pending',
  Paid: 'paid',
  Failed: 'failed',
  Refunded: 'refunded',
} as const;

export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];

export const purchaseStatusSchema = z.enum(PurchaseStatus);

/** A simulated payment event cannot select the initial pending purchase state. */
export const simulatorOutcomeSchema = z.enum([
  PurchaseStatus.Paid,
  PurchaseStatus.Failed,
  PurchaseStatus.Refunded,
]);

export type SimulatorOutcome = z.infer<typeof simulatorOutcomeSchema>;

export const ClassCapability = {
  PublishAssignments: 'publish_assignments',
} as const;

export type ClassCapability = (typeof ClassCapability)[keyof typeof ClassCapability];
