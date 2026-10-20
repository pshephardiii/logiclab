import type { DemoPolicy } from './types';

export function validateDemoPolicy(policy: DemoPolicy): void {
  if (
    ![policy.idleTimeoutSeconds, policy.maxLifetimeSeconds, policy.activityIntervalSeconds].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    ) ||
    policy.idleTimeoutSeconds > policy.maxLifetimeSeconds ||
    policy.maxLifetimeSeconds > 24 * 60 * 60 ||
    policy.activityIntervalSeconds >= policy.idleTimeoutSeconds
  )
    throw new Error('Invalid demo lifetime policy.');
}

/** The caller supplies database time; the absolute deadline is never extended. */
export function initialDemoLifetime(now: Date, policy: DemoPolicy) {
  return {
    createdAt: now,
    lastActivityAt: now,
    idleExpiresAt: new Date(now.getTime() + policy.idleTimeoutSeconds * 1000),
    expiresAt: new Date(now.getTime() + policy.maxLifetimeSeconds * 1000),
  };
}

export function demoSessionIsUsable(
  workspace: { status: string; generation: number; idleExpiresAt: Date; expiresAt: Date },
  generation: number,
  now: Date,
): boolean {
  return (
    workspace.status === 'active' &&
    workspace.generation === generation &&
    now < workspace.idleExpiresAt &&
    now < workspace.expiresAt
  );
}

/** Call only for deliberate visitor activity, never background session polling. */
export function demoActivityUpdate(
  workspace: { lastActivityAt: Date; expiresAt: Date },
  now: Date,
  policy: DemoPolicy,
) {
  if (now.getTime() - workspace.lastActivityAt.getTime() < policy.activityIntervalSeconds * 1000)
    return null;
  return {
    lastActivityAt: now,
    idleExpiresAt: new Date(
      Math.min(workspace.expiresAt.getTime(), now.getTime() + policy.idleTimeoutSeconds * 1000),
    ),
  };
}
