import { lazy, Suspense } from 'react';
import { ProductExposure, productExposureSchema } from '@logiclab/contracts/product-exposure';
import { ProductExposureBoundary } from './features/product-exposure/ProductExposureBoundary';
import { PracticeOnlyApp } from './PracticeOnlyApp';

const FullProductApp = lazy(() =>
  import('./FullProductApp').then((module) => ({ default: module.FullProductApp })),
);

const exposure = productExposureSchema.parse(import.meta.env.PRODUCT_EXPOSURE);

export function App() {
  return (
    <ProductExposureBoundary expected={exposure}>
      {exposure === ProductExposure.PracticeOnly ? (
        <PracticeOnlyApp />
      ) : (
        <Suspense
          fallback={
            <main>
              <p role="status">Loading LogicLab…</p>
            </main>
          }
        >
          <FullProductApp />
        </Suspense>
      )}
    </ProductExposureBoundary>
  );
}
