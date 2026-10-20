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
