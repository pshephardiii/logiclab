import { formatPrice } from '../helpers/format-price';
import type { ClassBillingResponse, SimulatorRequest } from '@logiclab/contracts';
export function PurchaseHistory({
  purchases,
  disabled,
  simulate,
}: {
  purchases: ClassBillingResponse['purchases'];
  disabled: boolean;
  simulate: (id: string, outcome: SimulatorRequest['outcome']) => Promise<void>;
}) {
  return (
    <section className="panel" aria-label="Purchase history">
      <h2>Purchase history and simulator</h2>
      {!purchases.length && <p>No purchases for this class.</p>}
      <ul className="billing-purchases">
        {purchases.map((purchase) => (
          <li key={purchase.id}>
            <p>
              <strong>{purchase.status}</strong> ·{' '}
              {formatPrice(purchase.amountMinor, purchase.currency)} · {purchase.coverageDays} days
            </p>
            <p className="help">
              Purchase {purchase.id} · {new Date(purchase.createdAt).toLocaleString()}
            </p>
            <div className="action-row">
              {purchase.status === 'pending' && (
                <>
                  <button disabled={disabled} onClick={() => void simulate(purchase.id, 'paid')}>
                    Simulate success
                  </button>
                  <button
                    className="secondary"
                    disabled={disabled}
                    onClick={() => void simulate(purchase.id, 'failed')}
                  >
                    Simulate failure
                  </button>
                </>
              )}
              {purchase.status === 'paid' && (
                <button
                  className="secondary"
                  disabled={disabled}
                  onClick={() => void simulate(purchase.id, 'refunded')}
                >
                  Simulate refund
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
