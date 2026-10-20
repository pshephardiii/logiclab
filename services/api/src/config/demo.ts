import { validateDemoPolicy } from '../application/demo/policy';
import type { DemoPolicy } from '../application/demo/types';

/** Internal foundation only: reading configuration does not enable routes or provision users. */
export function readDemoPolicy(env: NodeJS.ProcessEnv): DemoPolicy {
  const policy = {
    idleTimeoutSeconds: Number(env.DEMO_IDLE_TIMEOUT_SECONDS ?? 1800),
    maxLifetimeSeconds: Number(env.DEMO_MAX_LIFETIME_SECONDS ?? 14400),
    activityIntervalSeconds: Number(env.DEMO_ACTIVITY_INTERVAL_SECONDS ?? 60),
  };
  validateDemoPolicy(policy);
  return policy;
}

export function readDemoConfig(env: NodeJS.ProcessEnv) {
  if (env.DEMO_ENABLED === undefined || env.DEMO_ENABLED === 'false') return null;
  if (env.DEMO_ENABLED !== 'true') throw new Error('DEMO_ENABLED must be true or false.');
  const APP_ORIGIN = env.APP_ORIGIN ?? '';
  const origin = new URL(APP_ORIGIN);
  if (origin.origin !== APP_ORIGIN || !['http:', 'https:'].includes(origin.protocol))
    throw new Error('Demo requires an exact HTTP(S) APP_ORIGIN.');
  const secureCookies = origin.protocol === 'https:';
  if (
    !secureCookies &&
    (env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(origin.hostname))
  )
    throw new Error('Demo requires HTTPS outside localhost.');
  const capacity = Number(env.DEMO_MAX_WORKSPACES ?? 25);
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100)
    throw new Error('DEMO_MAX_WORKSPACES must be between 1 and 100.');
  return {
    ...readDemoPolicy(env),
    capacity,
    APP_ORIGIN,
    secureCookies,
    clearInvalidSessionCookie: false,
    sessionCookieName: 'logiclab_demo',
    sessionCookiePath: '/api/demo',
  };
}
export type DemoConfig = NonNullable<ReturnType<typeof readDemoConfig>>;
