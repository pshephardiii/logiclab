import type { JobDefinition } from './types';

export function retryDelaySeconds(
  attempt: number,
  policy: { retryBaseSeconds: number; retryMaxSeconds: number },
) {
  return Math.min(policy.retryMaxSeconds, policy.retryBaseSeconds * 2 ** Math.max(0, attempt - 1));
}

/** Failed and abandoned attempts share the same budget and backoff policy. */
export function failureTransition(
  attempts: number,
  maxAttempts: number,
  policy: Pick<JobDefinition, 'retryBaseSeconds' | 'retryMaxSeconds'>,
  now: Date,
) {
  const exhausted = attempts >= maxAttempts;
  return {
    exhausted,
    completedAt: exhausted ? now : undefined,
    availableAt: new Date(now.getTime() + retryDelaySeconds(attempts, policy) * 1000),
  };
}
