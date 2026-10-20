import {
  demoWorkspaceNeedsCleanup,
  validateDemoCleanupBatchSize,
} from '../../application/demo/expiration';
import { databaseTime } from '../database-time';
import type { Database } from '../transactions';
import { deleteDemoWorkspaceData } from './delete-data';

/** One bounded, atomic batch; a failed ownership/retention check rolls back the entire batch. */
export async function cleanupExpiredDemoWorkspaces(orm: Database, limit = 10) {
  validateDemoCleanupBatchSize(limit);
  const { DemoWorkspace, DemoWorkspaceStatus, LockMode } = await import('@logiclab/db');
  return orm.em.fork().transactional(async (em) => {
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
      // The row is locked. Use fresh database time before making the final deletion decision.
      const now = await databaseTime(em);
      if (!demoWorkspaceNeedsCleanup(workspace, now)) continue;
      workspace.status = DemoWorkspaceStatus.Expired;
      await em.flush();
      await deleteDemoWorkspaceData(em, workspace.id);
      removed += await em.nativeDelete(DemoWorkspace, workspace.id);
    }
    return { removed };
  });
}
