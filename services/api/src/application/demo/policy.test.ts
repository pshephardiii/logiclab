import { readDemoPolicy } from '../../config/demo';
import { demoActivityUpdate, demoSessionIsUsable, initialDemoLifetime } from './policy';

const now = new Date('2026-10-20T12:00:00Z');
const policy = readDemoPolicy({});
const lifetime = initialDemoLifetime(now, policy);
const workspace = { ...lifetime, status: 'active', generation: 1 };

describe('demo lifetime policy', () => {
  it('uses configurable bounded lifetimes', () => {
    expect(policy).toEqual({
      idleTimeoutSeconds: 1800,
      maxLifetimeSeconds: 14400,
      activityIntervalSeconds: 60,
    });
    expect(lifetime.idleExpiresAt.getTime() - now.getTime()).toBe(1800000);
    expect(lifetime.expiresAt.getTime() - now.getTime()).toBe(14400000);
    expect(readDemoPolicy({ DEMO_IDLE_TIMEOUT_SECONDS: '600' }).idleTimeoutSeconds).toBe(600);
  });
  it.each([
    { DEMO_IDLE_TIMEOUT_SECONDS: '0' },
    { DEMO_IDLE_TIMEOUT_SECONDS: 'NaN' },
    { DEMO_MAX_LIFETIME_SECONDS: '86401' },
    { DEMO_MAX_LIFETIME_SECONDS: '100' },
    { DEMO_ACTIVITY_INTERVAL_SECONDS: '1800' },
    { DEMO_ACTIVITY_INTERVAL_SECONDS: '1.5' },
  ])('rejects invalid configuration %j', (env) => expect(() => readDemoPolicy(env)).toThrow());
  it('rejects exact idle/absolute expiry and stale generations', () => {
    expect(demoSessionIsUsable(workspace, 1, now)).toBe(true);
    expect(demoSessionIsUsable(workspace, 1, lifetime.idleExpiresAt)).toBe(false);
    expect(
      demoSessionIsUsable(
        { ...workspace, idleExpiresAt: lifetime.expiresAt },
        1,
        lifetime.expiresAt,
      ),
    ).toBe(false);
    expect(demoSessionIsUsable(workspace, 2, now)).toBe(false);
    for (const status of ['provisioning', 'resetting', 'expired'])
      expect(demoSessionIsUsable({ ...workspace, status }, 1, now)).toBe(false);
  });
  it('throttles deliberate activity and caps extension at absolute expiry', () => {
    expect(demoActivityUpdate(workspace, new Date(now.getTime() + 59000), policy)).toBeNull();
    const later = new Date(lifetime.expiresAt.getTime() - 1000);
    expect(demoActivityUpdate(workspace, later, policy)).toEqual({
      lastActivityAt: later,
      idleExpiresAt: lifetime.expiresAt,
    });
    expect(workspace.lastActivityAt).toEqual(now);
  });
});
