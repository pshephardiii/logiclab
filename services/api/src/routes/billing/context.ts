import type { ResourceContext } from '../resource-context';
import type { BillingService } from '../../application/billing/service';
export type BillingContext = ResourceContext & { billing: BillingService };
