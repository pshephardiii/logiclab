import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BillingPlanChoice,
  ClassBillingResponse,
  SimulatorRequest,
} from '@logiclab/contracts';
import * as api from '../../../api/billing/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Class-local billing state. Retain a checkout intent through failed responses; never retry outcomes automatically. */
export function useClassBilling(classId: string) {
  const [data, setData] = useState<ClassBillingResponse | null>(null);
  const [plans, setPlans] = useState<BillingPlanChoice[]>([]);
  const [planNext, setPlanNext] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const intent = useRef<{ planId: string; requestId: string } | null>(null);
  const reads = useAbortableRequest();
  const writes = useAbortableRequest();
  const load = useCallback(async () => {
    const signal = reads.startRequest();
    setLoading(true);
    setError(null);
    try {
      const [catalog, status] = await Promise.all([
        api.listPlans(signal),
        api.readClassBilling(classId, signal),
      ]);
      if (signal.aborted) return;
      setPlans(catalog.plans);
      setPlanNext(catalog.nextOffset);
      setData(status);
      setUncertain(false);
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not load billing.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [classId, reads.startRequest]);
  useEffect(() => {
    void load();
    return reads.cancelRequest;
  }, [load, reads.cancelRequest]);
  async function more(kind: 'plans' | 'purchases') {
    const offset = kind === 'plans' ? planNext : data?.nextOffset;
    if (offset == null) return;
    const signal = reads.startRequest();
    setLoading(true);
    setError(null);
    try {
      if (kind === 'plans') {
        const page = await api.listPlans(signal, offset);
        if (!signal.aborted) {
          setPlans((old) => [
            ...old,
            ...page.plans.filter((row) => !old.some((item) => item.id === row.id)),
          ]);
          setPlanNext(page.nextOffset);
        }
      } else {
        const page = await api.readClassBilling(classId, signal, offset);
        if (!signal.aborted)
          setData((old) => ({
            ...page,
            purchases: [
              ...(old?.purchases ?? []),
              ...page.purchases.filter((row) => !old?.purchases.some((item) => item.id === row.id)),
            ],
          }));
      }
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not load more billing records.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }
  async function checkout() {
    if (!selectedPlan || busy) return;
    intent.current ??= { planId: selectedPlan, requestId: crypto.randomUUID() };
    const signal = writes.startRequest();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.createCheckout(classId, intent.current, signal);
      if (signal.aborted) return;
      intent.current = null;
      setNotice(
        `Checkout ${result.purchase.id} created. No charge occurred; choose a simulated outcome below.`,
      );
      await load();
    } catch (caught) {
      if (!signal.aborted)
        setError(
          `${caught instanceof Error ? caught.message : 'Checkout failed.'} Retry with the same intent, or reload history to inspect existing purchases before starting another.`,
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  async function simulate(id: string, outcome: SimulatorRequest['outcome']) {
    if (busy || uncertain) return;
    const signal = writes.startRequest();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.simulatePayment(id, outcome, signal);
      if (signal.aborted) return;
      setNotice(`Simulated ${outcome} event accepted. No real money moved.`);
      await load();
    } catch (caught) {
      if (!signal.aborted) {
        setUncertain(true);
        setError(
          `${caught instanceof Error ? caught.message : 'Payment outcome failed.'} Reload billing before trying another outcome.`,
        );
      }
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  function discardIntent() {
    intent.current = null;
    setNotice('Retry intent cleared. Check purchase history before starting a different checkout.');
  }
  function choosePlan(id: string) {
    if (!intent.current) setSelectedPlan(id);
  }
  return {
    discardIntent,
    data,
    plans,
    planNext,
    selectedPlan,
    choosePlan,
    loading,
    busy,
    uncertain,
    error,
    notice,
    retryCheckout: intent.current !== null,
    load,
    more,
    checkout,
    simulate,
  };
}
