import { formatPrice } from '../helpers/format-price';
import { useClassBilling } from '../hooks/useClassBilling';
import { CoverageStatus } from './CoverageStatus';
import { PurchaseHistory } from './PurchaseHistory';

export function ClassBilling({ classId }: { classId: string }) {
  const state = useClassBilling(classId);
  const blocked = state.busy || state.loading;
  const selected = state.plans.find((plan) => plan.id === state.selectedPlan);
  const pending = state.data?.purchases.some(
    (purchase) => purchase.status === 'pending' && purchase.planId === state.selectedPlan,
  );
  return (
    <div className="class-billing">
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state.notice && <p role="status">{state.notice}</p>}
      <button className="secondary" disabled={blocked} onClick={() => void state.load()}>
        Reload billing
      </button>
      {state.loading && <p role="status">Loading billing…</p>}
      {state.data && (
        <>
          <CoverageStatus coverage={state.data.coverage} />
          <section className="panel" aria-label="Simulated checkout">
            <h2>One-time class purchase</h2>
            <p>
              Each purchase covers one class for its stated period, starting when simulated success
              is processed. This is not a subscription.
            </p>
            {state.data.coverage.active && (
              <p>
                This class already has coverage. Another purchase starts a separate period
                immediately; it does not extend the current period.
              </p>
            )}
            <label htmlFor="billing-plan">Plan</label>
            <select
              id="billing-plan"
              value={state.selectedPlan}
              disabled={blocked || state.retryCheckout}
              onChange={(event) => state.choosePlan(event.target.value)}
            >
              <option value="">Choose a plan</option>
              {state.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {formatPrice(plan.amountMinor, plan.currency)} · {plan.coverageDays}{' '}
                  days
                </option>
              ))}
            </select>
            {selected && (
              <p>
                {formatPrice(selected.amountMinor, selected.currency)} for {selected.coverageDays}{' '}
                days of publishing coverage for this class.
              </p>
            )}
            {!state.plans.length && (
              <p>No active class plans. Seed the local demo plan to get started.</p>
            )}
            {state.planNext !== null && (
              <button disabled={blocked} onClick={() => void state.more('plans')}>
                Load more plans
              </button>
            )}
            {pending && !state.retryCheckout && (
              <p>
                Use the pending checkout in purchase history before creating another for this plan.
              </p>
            )}
            <button
              disabled={
                blocked ||
                (!selected && !state.retryCheckout) ||
                Boolean(pending && !state.retryCheckout) ||
                state.uncertain
              }
              onClick={() => void state.checkout()}
            >
              {state.retryCheckout ? 'Retry checkout' : 'Create simulated checkout'}
            </button>
            {state.retryCheckout && (
              <button className="secondary" disabled={blocked} onClick={state.discardIntent}>
                Discard retry intent after checking history
              </button>
            )}
          </section>
          <PurchaseHistory
            purchases={state.data.purchases}
            disabled={blocked || state.uncertain}
            simulate={state.simulate}
          />
          {state.data.nextOffset !== null && (
            <button disabled={blocked} onClick={() => void state.more('purchases')}>
              Load more purchases
            </button>
          )}
        </>
      )}
    </div>
  );
}
