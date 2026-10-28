import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, test, expect, vi } from 'vitest';
import type { ClassBillingResponse } from '@logiclab/contracts';
import * as api from '../../../api/billing/api';
import { ClassBilling } from './ClassBilling';
import { AccountApiError } from '../../../api/errors';
vi.mock('../../../api/billing/api', () => ({
  listPlans: vi.fn(),
  readClassBilling: vi.fn(),
  createCheckout: vi.fn(),
  simulatePayment: vi.fn(),
}));
const classId = 'b1111111-1111-4111-8111-111111111111';
const planId = 'b2222222-2222-4222-8222-222222222222';
const purchaseId = 'b3333333-3333-4333-8333-333333333333';
const plan = {
  id: planId,
  name: 'Demo class plan',
  amountMinor: 2500,
  currency: 'USD',
  coverageDays: 180,
  capability: 'publish_assignments' as const,
};
const purchase = {
  id: purchaseId,
  classId,
  planId,
  amountMinor: 2500,
  currency: 'USD',
  coverageDays: 180,
  capability: 'publish_assignments' as const,
  status: 'pending' as const,
  createdAt: '2026-10-16T12:00:00Z',
};
let status: ClassBillingResponse;
beforeEach(() => {
  vi.resetAllMocks();
  status = {
    classId,
    checkoutBlockedReason: null,
    coverage: { active: false, endsAt: null },
    purchases: [],
    nextOffset: null,
  };
  vi.mocked(api.listPlans).mockResolvedValue({ plans: [plan], nextOffset: null });
  vi.mocked(api.readClassBilling).mockImplementation(async () => structuredClone(status));
  vi.mocked(api.createCheckout).mockImplementation(async () => {
    status.purchases = [purchase];
    status.checkoutBlockedReason = 'pending';
    return { purchase, mode: 'simulated', notice: 'No real payment.' };
  });
  vi.mocked(api.simulatePayment).mockImplementation(async (_id, outcome) => {
    status.purchases = [{ ...purchase, status: outcome }];
    status.checkoutBlockedReason = outcome === 'paid' ? 'paid' : null;
    status.coverage = {
      active: outcome === 'paid',
      endsAt: outcome === 'paid' ? '2099-01-01T00:00:00Z' : null,
    };
    return { result: 'applied' };
  });
});

test('runs no-charge checkout, success and refund while explaining retained work', async () => {
  const user = userEvent.setup();
  render(<ClassBilling classId={classId} />);
  await user.selectOptions(await screen.findByLabelText('Plan'), planId);
  await user.click(screen.getByRole('button', { name: 'Create simulated checkout' }));
  await user.click(await screen.findByRole('button', { name: 'Simulate success' }));
  expect(await screen.findByText(/Assignment publishing is covered until/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create simulated checkout' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Simulate refund' }));
  expect(await screen.findByText(/No active publishing coverage/)).toBeInTheDocument();
  expect(screen.getByText(/Existing published assignments/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create simulated checkout' })).toBeEnabled();
  expect(api.simulatePayment).toHaveBeenCalledWith(purchaseId, 'refunded', expect.any(AbortSignal));
});

test('retries checkout with the same request ID and pins the plan after an uncertain response', async () => {
  vi.mocked(api.createCheckout).mockRejectedValueOnce(new Error('Connection lost'));
  const user = userEvent.setup();
  render(<ClassBilling classId={classId} />);
  await user.selectOptions(await screen.findByLabelText('Plan'), planId);
  await user.click(screen.getByRole('button', { name: 'Create simulated checkout' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
  expect(screen.getByLabelText('Plan')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Retry checkout' }));
  await screen.findByRole('button', { name: 'Simulate success' });
  const calls = vi.mocked(api.createCheckout).mock.calls;
  expect(calls[0]![1]).toEqual(calls[1]![1]);
});

test('uncertain outcomes require a reload before retrying and never auto-resubmit', async () => {
  status.purchases = [purchase];
  vi.mocked(api.simulatePayment).mockRejectedValueOnce(new Error('Response lost'));
  const user = userEvent.setup();
  render(<ClassBilling classId={classId} />);
  await user.click(await screen.findByRole('button', { name: 'Simulate success' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Reload billing');
  expect(screen.getByRole('button', { name: 'Simulate success' })).toBeDisabled();
  expect(api.simulatePayment).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Reload billing' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Simulate success' })).toBeEnabled(),
  );
});

test('paginates plan choices and history without losing the selected plan', async () => {
  vi.mocked(api.listPlans)
    .mockResolvedValueOnce({ plans: [plan], nextOffset: 20 })
    .mockResolvedValue({
      plans: [{ ...plan, id: 'b4444444-4444-4444-8444-444444444444', name: 'Second plan' }],
      nextOffset: null,
    });
  status.purchases = [{ ...purchase, status: 'failed' }];
  status.nextOffset = 20;
  vi.mocked(api.readClassBilling).mockImplementation(async (_classId, _signal, offset) =>
    offset
      ? {
          ...status,
          purchases: [
            { ...purchase, id: 'b5555555-5555-4555-8555-555555555555', status: 'refunded' },
          ],
          nextOffset: null,
        }
      : structuredClone(status),
  );
  const user = userEvent.setup();
  render(<ClassBilling classId={classId} />);
  await user.selectOptions(await screen.findByLabelText('Plan'), planId);
  await user.click(screen.getByRole('button', { name: 'Load more plans' }));
  await screen.findByRole('option', { name: /Second plan/ });
  expect(screen.getByLabelText('Plan')).toHaveValue(planId);
  await user.click(screen.getByRole('button', { name: 'Load more purchases' }));
  expect(await screen.findByText('refunded')).toBeInTheDocument();
  expect(screen.getByText('failed')).toBeInTheDocument();
});

test('unmount cancels in-flight billing reads', async () => {
  vi.mocked(api.listPlans).mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<ClassBilling classId={classId} />);
  await waitFor(() => expect(api.listPlans).toHaveBeenCalled());
  const signal = vi.mocked(api.listPlans).mock.calls[0]![0];
  unmount();
  expect(signal.aborted).toBe(true);
});

test.each(['pending', 'paid', 'covered'] as const)(
  'blocks new checkout for %s even when the history page has no blocking purchase',
  async (reason) => {
    status.checkoutBlockedReason = reason;
    status.purchases = [{ ...purchase, status: 'failed' }];
    const user = userEvent.setup();
    render(<ClassBilling classId={classId} />);
    await screen.findByText(
      reason === 'pending'
        ? /This class has a pending checkout/
        : reason === 'paid'
          ? /This class has already been paid for/
          : /This class already has publishing coverage/,
    );
    expect(screen.getByLabelText('Plan')).toBeDisabled();
    const button = screen.getByRole('button', { name: 'Create simulated checkout' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(api.createCheckout).not.toHaveBeenCalled();
  },
);

test('a stale-tab checkout conflict reloads class eligibility instead of offering another retry', async () => {
  vi.mocked(api.createCheckout).mockImplementationOnce(async () => {
    status.checkoutBlockedReason = 'paid';
    throw new AccountApiError('This class has already been paid for.', 409);
  });
  const user = userEvent.setup();
  render(<ClassBilling classId={classId} />);
  await user.selectOptions(await screen.findByLabelText('Plan'), planId);
  await user.click(screen.getByRole('button', { name: 'Create simulated checkout' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('already been paid for');
  expect(screen.queryByRole('button', { name: 'Retry checkout' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create simulated checkout' })).toBeDisabled();
  expect(api.createCheckout).toHaveBeenCalledOnce();
  expect(api.readClassBilling).toHaveBeenCalledTimes(2);
});
