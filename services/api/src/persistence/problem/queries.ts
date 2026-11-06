import type { DatabaseManager } from '../transactions';

export async function ownedProblem(em: DatabaseManager, ownerId: string, problemId: string) {
  const { Problem } = await import('@logiclab/db');

  return em.findOne(Problem, { id: problemId, owner: ownerId });
}

/** Caller retains the parent lock through edits, publication or archive changes. */
export async function lockedProblem(em: DatabaseManager, ownerId: string, problemId: string) {
  const { Problem, LockMode } = await import('@logiclab/db');

  return em.findOne(
    Problem,
    { id: problemId, owner: ownerId },
    { lockMode: LockMode.PESSIMISTIC_WRITE },
  );
}
