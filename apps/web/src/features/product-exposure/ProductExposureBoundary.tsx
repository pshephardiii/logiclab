import { useEffect, useState, type ReactNode } from 'react';
import type { ProductExposure } from '@logiclab/contracts/product-exposure';
import { loadProductExposure } from '../../api/product-exposure/api';
import { ProductExposureContext } from './ProductExposureContext';

type State = { exposure: ProductExposure; status: 'checking' | 'ready' | 'error' };

/** Verify deployment agreement before mounting any account/demo or practice providers. */
export function ProductExposureBoundary({
  expected,
  children,
}: {
  expected: ProductExposure;
  children: ReactNode;
}) {
  const [state, setState] = useState<State | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = state?.exposure === expected ? state : null;

  useEffect(() => {
    const controller = new AbortController();
    setState({ exposure: expected, status: 'checking' });
    void loadProductExposure(controller.signal).then(
      (response) => {
        if (!controller.signal.aborted)
          setState({
            exposure: expected,
            status: response.productExposure === expected ? 'ready' : 'error',
          });
      },
      () => {
        if (!controller.signal.aborted) setState({ exposure: expected, status: 'error' });
      },
    );
    return () => controller.abort();
  }, [expected, attempt]);

  if (current?.status === 'ready')
    return (
      <ProductExposureContext.Provider value={expected}>{children}</ProductExposureContext.Provider>
    );

  return (
    <main>
      {current?.status === 'error' ? (
        <>
          <h1>LogicLab is temporarily unavailable</h1>
          <p role="alert">Unable to verify this deployment. Please try again.</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </>
      ) : (
        <p role="status">Loading LogicLab…</p>
      )}
    </main>
  );
}
