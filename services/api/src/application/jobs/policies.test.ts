import { failureTransition } from './execution-policy';
import { nextScheduledTime, scheduledOccurrenceKey } from './scheduling';
import { validResult } from './result-validation';
import type { JobResult } from './types';

const now = new Date('2026-10-19T12:00:00Z');
const policy = { retryBaseSeconds: 30, retryMaxSeconds: 90 };

describe('job policies', () => {
  it('skips missed slots and advances exact boundaries into the future', () => {
    const occurrence = new Date('2026-10-19T09:00:00Z');
    expect(nextScheduledTime(occurrence, 3600, now).toISOString()).toBe('2026-10-19T13:00:00.000Z');
    expect(
      nextScheduledTime(occurrence, 3600, new Date('2026-10-19T11:30:00Z')).toISOString(),
    ).toBe('2026-10-19T12:00:00.000Z');
    expect(occurrence.toISOString()).toBe('2026-10-19T09:00:00.000Z');
  });

  it('identifies an occurrence independently of when the scheduler runs', () => {
    expect(scheduledOccurrenceKey('schedule-id', now)).toBe(
      'schedule:schedule-id:2026-10-19T12:00:00.000Z',
    );
  });

  it('retries within the saved attempt budget with capped backoff', () => {
    expect(failureTransition(1, 5, policy, now)).toEqual({
      exhausted: false,
      completedAt: undefined,
      availableAt: new Date(now.getTime() + 30000),
    });
    expect(failureTransition(4, 5, policy, now).availableAt.getTime()).toBe(now.getTime() + 90000);
    expect(failureTransition(5, 5, policy, now)).toMatchObject({
      exhausted: true,
      completedAt: now,
    });
  });

  it('accepts bounded results and rejects invalid handler data', () => {
    const finding = {
      kind: 'paid_purchase_missing_grant',
      purchaseId: '00000000-0000-0000-0000-000000000001',
      classId: '00000000-0000-0000-0000-000000000002',
    };
    const valid = { recordsChecked: 1, findings: [finding] } as JobResult;
    expect(validResult(valid)).toBe(true);
    for (const result of [
      { ...valid, recordsChecked: -1 },
      { ...valid, recordsChecked: 2147483648 },
      { ...valid, findings: Array(1001).fill(finding) },
      { ...valid, findings: [{ ...finding, kind: 'unknown' }] },
      { ...valid, findings: [{ ...finding, grantId: 'invalid' }] },
    ])
      expect(validResult(result as JobResult)).toBe(false);
  });
});
