import { act, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductExposure } from '@logiclab/contracts/product-exposure';
import { ProductExposureContext } from './features/product-exposure/ProductExposureContext';
import { renderWithUnsavedWork } from '../test/unsaved-work';
import { PracticeOnlyApp } from './PracticeOnlyApp';

afterEach(() => vi.unstubAllGlobals());

it('provides all anonymous practice pages without account/demo providers or session requests', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('Unexpected request'));
  vi.stubGlobal('fetch', fetcher);
  const { router } = renderWithUnsavedWork(
    <ProductExposureContext.Provider value={ProductExposure.PracticeOnly}>
      <PracticeOnlyApp />
    </ProductExposureContext.Provider>,
  );
  expect(await screen.findByRole('button', { name: 'Create table' })).toBeInTheDocument();
  await act(async () => {
    await router.navigate('/practice/proofs');
  });
  expect(await screen.findByRole('button', { name: /begin proof practice/i })).toBeInTheDocument();
  await act(async () => {
    await router.navigate('/practice/truth-trees');
  });
  expect(
    await screen.findByRole('button', { name: /begin truth-tree practice/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /sign in|demo|classes|assigned work/i }),
  ).not.toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  '/account',
  '/demo',
  '/demo/classes',
  '/demo/library',
  '/assignments',
  '/work',
  '/classes',
  '/my-classes',
  '/library',
  '/billing',
  '/missing',
])('blocks direct private/unknown URL %s', async (path) => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const { router } = renderWithUnsavedWork(
    <ProductExposureContext.Provider value={ProductExposure.PracticeOnly}>
      <PracticeOnlyApp />
    </ProductExposureContext.Provider>,
  );
  await act(async () => {
    await router.navigate(path);
  });
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Return to practice' })).toHaveAttribute('href', '/');
  expect(
    screen.queryByRole('link', { name: /sign in|demo|classes|assigned work/i }),
  ).not.toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});
