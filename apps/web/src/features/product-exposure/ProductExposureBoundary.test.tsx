import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductExposure } from '@logiclab/contracts/product-exposure';
import { ProductExposureBoundary } from './ProductExposureBoundary';

const full = ProductExposure.Full;
const practice = ProductExposure.PracticeOnly;
afterEach(() => vi.unstubAllGlobals());

function reply(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

function mount(expected: ProductExposure = practice) {
  return render(
    <ProductExposureBoundary expected={expected}>
      <p>Application mounted</p>
    </ProductExposureBoundary>,
  );
}

describe('deployment agreement', () => {
  it.each([full, practice])(
    'waits for a matching %s API before mounting children',
    async (expected) => {
      let resolve!: (response: Response) => void;
      const fetcher = vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      );
      vi.stubGlobal('fetch', fetcher);
      mount(expected);
      expect(screen.queryByText('Application mounted')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Loading LogicLab');
      await act(async () => resolve(reply({ productExposure: expected })));
      expect(await screen.findByText('Application mounted')).toBeInTheDocument();
      expect(fetcher).toHaveBeenCalledWith(
        '/api/product-exposure',
        expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }),
      );
    },
  );

  it.each([
    [full, practice],
    [practice, full],
  ] as const)('blocks %s frontend with %s API', async (expected, actual) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ productExposure: actual })));
    mount(expected);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Application mounted')).not.toBeInTheDocument();
  });

  it.each([
    { productExposure: 'unknown' },
    {},
    { productExposure: practice, privateSetting: 'extra' },
    null,
  ])('fails closed on malformed metadata %j', async (payload) => {
    const fetcher = vi.fn().mockResolvedValue(reply(payload));
    vi.stubGlobal('fetch', fetcher);
    mount();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Application mounted')).not.toBeInTheDocument();
  });

  it.each(['network', 'http', 'json'])(
    'recovers from %s failure only after manual retry',
    async (failure) => {
      const fetcher = vi.fn().mockResolvedValueOnce(reply({ productExposure: practice }));
      if (failure === 'network') fetcher.mockReset().mockRejectedValueOnce(new Error('offline'));
      if (failure === 'http')
        fetcher.mockReset().mockResolvedValueOnce(reply({ productExposure: practice }, 503));
      if (failure === 'json') fetcher.mockReset().mockResolvedValueOnce(new Response('not json'));
      fetcher.mockResolvedValue(reply({ productExposure: practice }));
      vi.stubGlobal('fetch', fetcher);
      mount();
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(fetcher).toHaveBeenCalledTimes(1);
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('Application mounted')).toBeInTheDocument();
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it('aborts obsolete verification and ignores its late response', async () => {
    const pending: { resolve: (value: Response) => void; signal: AbortSignal }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise<Response>((resolve) => {
            pending.push({ resolve, signal: options.signal as AbortSignal });
          }),
      ),
    );
    const view = mount(practice);
    view.rerender(
      <ProductExposureBoundary expected={full}>
        <p>Application mounted</p>
      </ProductExposureBoundary>,
    );
    expect(pending[0]!.signal.aborted).toBe(true);
    await act(async () => pending[0]!.resolve(reply({ productExposure: practice })));
    expect(screen.queryByText('Application mounted')).not.toBeInTheDocument();
    await act(async () => pending[1]!.resolve(reply({ productExposure: full })));
    expect(await screen.findByText('Application mounted')).toBeInTheDocument();
    view.unmount();
    await waitFor(() => expect(pending[1]!.signal.aborted).toBe(true));
  });
});
