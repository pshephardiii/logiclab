import type { AuthContext } from '../auth/context';
import type { BillingService } from '../../application/billing/service';
export type BillingContext = AuthContext & { billing: BillingService };
