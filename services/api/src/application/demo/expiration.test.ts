import { demoWorkspaceNeedsCleanup, validateDemoCleanupBatchSize } from './expiration';

const now = new Date('2026-10-20T12:00:00Z');
const future = new Date(now.getTime() + 60000);
const workspace = { status: 'active', idleExpiresAt: future, expiresAt: future };

test('cleanup includes exact deadlines and explicit expiry but preserves live unavailable states', () => {
  expect(demoWorkspaceNeedsCleanup(workspace, now)).toBe(false);
  expect(demoWorkspaceNeedsCleanup({ ...workspace, idleExpiresAt: now }, now)).toBe(true);
  expect(demoWorkspaceNeedsCleanup({ ...workspace, expiresAt: now }, now)).toBe(true);
  expect(demoWorkspaceNeedsCleanup({ ...workspace, status: 'expired' }, now)).toBe(true);
  for (const status of ['provisioning', 'resetting']) {
    expect(demoWorkspaceNeedsCleanup({ ...workspace, status }, now)).toBe(false);
    expect(demoWorkspaceNeedsCleanup({ ...workspace, status, idleExpiresAt: now }, now)).toBe(true);
  }
});

test('cleanup accepts only bounded positive integer batch sizes', () => {
  for (const limit of [1, 10, 100]) expect(() => validateDemoCleanupBatchSize(limit)).not.toThrow();
  for (const limit of [0, -1, 101, 1.5, NaN, Infinity])
    expect(() => validateDemoCleanupBatchSize(limit)).toThrow();
});
