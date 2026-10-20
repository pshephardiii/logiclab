import {
  demoWorkspaceNeedsCleanup,
  validateDemoCleanupBatchSize,
} from '../../application/demo/expiration';
import { databaseTime } from '../database-time';
import type { Database } from '../transactions';
import { deleteDemoWorkspaceData } from './delete-data';

/** One bounded, atomic batch; a failed ownership/retention check rolls back the entire batch. */
export async function cleanupExpiredDemoWorkspaces(
  orm: Database,
  limit = 10,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  validateDemoCleanupBatchSize(limit);
  const { DemoWorkspace, DemoWorkspaceStatus, LockMode } = await import('@logiclab/db');
  return orm.em.fork().transactional(async (em) => {
    // Bound database waits as well as cooperative cancellation between deletions.
    await em.execute("set local statement_timeout = '20s'");
    await em.execute("set local lock_timeout = '5s'");
    const eligibleAt = await databaseTime(em);
    const workspaces = await em.find(
      DemoWorkspace,
      {
        $or: [
          { status: DemoWorkspaceStatus.Expired },
          { idleExpiresAt: { $lte: eligibleAt } },
          { expiresAt: { $lte: eligibleAt } },
        ],
      },
      {
        limit,
        orderBy: { idleExpiresAt: 'ASC', id: 'ASC' },
        lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
      },
    );
    let removed = 0;
    for (const workspace of workspaces) {
      signal?.throwIfAborted();
      // The row is locked. Use fresh database time before making the final deletion decision.
      const now = await databaseTime(em);
      if (!demoWorkspaceNeedsCleanup(workspace, now)) continue;
      workspace.status = DemoWorkspaceStatus.Expired;
      await em.flush();
      await deleteDemoWorkspaceData(em, workspace.id);
      removed += await em.nativeDelete(DemoWorkspace, workspace.id);
    }
    // A timed-out worker must not commit a batch that is still executing.
    signal?.throwIfAborted();
    return { removed };
  });
}
