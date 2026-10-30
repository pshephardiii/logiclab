import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import type { DerivationReferenceCheckResponse } from '@logiclab/contracts/derivation';
import { derivationDraft } from '../../../../test/derivation';
import * as api from '../../../api/problems/api';
import { SavedReferenceCheck } from './SavedReferenceCheck';

vi.mock('../../../api/problems/api', () => ({ checkReference: vi.fn() }));
const missing: DerivationReferenceCheckResponse = {
  problemId: derivationDraft.id,
  updatedAt: derivationDraft.updatedAt,
  check: { status: 'missing' },
};
beforeEach(() => vi.resetAllMocks());

test('checks only on explicit action and retains recoverable errors without automatic retry', async () => {
  vi.mocked(api.checkReference)
    .mockRejectedValueOnce(new Error('Try later'))
    .mockResolvedValue(missing);
  const user = userEvent.setup();
  render(<SavedReferenceCheck problem={derivationDraft} />);
  expect(api.checkReference).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Check saved reference' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Try later');
  await user.click(screen.getByRole('button', { name: 'Check saved reference' }));
  expect(await screen.findByRole('status')).toHaveTextContent('No reference proof saved.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(api.checkReference).toHaveBeenCalledTimes(2);
});

test('does not present a report for a different saved timestamp as current validation', async () => {
  vi.mocked(api.checkReference).mockResolvedValue({
    ...missing,
    updatedAt: '2026-10-30T12:01:00.000Z',
  });
  render(<SavedReferenceCheck problem={derivationDraft} />);
  await userEvent.click(screen.getByRole('button', { name: 'Check saved reference' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('saved draft changed');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('snapshot replacement cancels a pending request and ignores its late result', async () => {
  let resolve!: (value: DerivationReferenceCheckResponse) => void;
  vi.mocked(api.checkReference).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = render(<SavedReferenceCheck key="old" problem={derivationDraft} />);
  await userEvent.click(screen.getByRole('button', { name: 'Check saved reference' }));
  const signal = vi.mocked(api.checkReference).mock.calls[0]![1];
  view.rerender(
    <SavedReferenceCheck
      key="new"
      problem={{ ...derivationDraft, updatedAt: '2026-10-30T12:01:00.000Z' }}
    />,
  );
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(missing));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Check saved reference' })).toBeEnabled(),
  );
});

test.each([
  ['accepted', 'Reference accepted.'],
  ['needs_review', 'Reference needs correction before publication.'],
  ['unassessable', 'Reference could not be fully assessed.'],
] as const)('distinguishes %s from publication authorization', async (status, message) => {
  const diagnostic = {
    code: 'RULE_MISMATCH' as const,
    message: 'Rule does not match.',
    stepIndex: 0,
  };
  vi.mocked(api.checkReference).mockResolvedValue({
    ...missing,
    check: {
      status: 'checked',
      report: {
        checkerVersion: 1,
        ruleCatalogVersion: 1,
        status,
        target: status === 'accepted' ? 'established' : 'unknown',
        steps: [
          {
            stepId: derivationDraft.id,
            stepIndex: 0,
            localStatus: 'valid',
            dependencyStatus: 'valid',
          },
        ],
        diagnostics: status === 'accepted' ? [] : [diagnostic],
      },
    },
  });
  render(<SavedReferenceCheck problem={derivationDraft} />);
  await userEvent.click(screen.getByRole('button', { name: 'Check saved reference' }));
  expect(await screen.findByRole('status')).toHaveTextContent(message);
  if (status !== 'accepted')
    expect(screen.getByText('Line 1: Rule does not match.')).toBeInTheDocument();
});
