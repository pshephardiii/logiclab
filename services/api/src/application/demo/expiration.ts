/** Cleanup also recovers abandoned provisioning/reset states once either deadline has passed. */
export function demoWorkspaceNeedsCleanup(
  workspace: { status: string; idleExpiresAt: Date; expiresAt: Date },
  now: Date,
): boolean {
  return (
    workspace.status === 'expired' || workspace.idleExpiresAt <= now || workspace.expiresAt <= now
  );
}

export function validateDemoCleanupBatchSize(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Demo cleanup batch size must be an integer between 1 and 100.');
}
