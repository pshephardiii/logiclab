import type { createDatabase, ClassCapability } from '@logiclab/db' with {
  'resolution-mode': 'import',
};

/**
 * Call inside the publication transaction. Funding writers take the same class lock
 * exclusively, so a refund either commits before this check or waits for publication.
 */
export async function hasClassCapability(
  em: Awaited<ReturnType<typeof createDatabase>>['em'],
  classId: string,
  capability: ClassCapability,
  clock = () => new Date(),
): Promise<boolean> {
  const { Classroom, ClassEntitlement, LockMode } = await import('@logiclab/db');
  const classroom = await em.findOne(Classroom, classId, { lockMode: LockMode.PESSIMISTIC_READ });
  if (!classroom) return false;
  // Evaluate time after acquiring the lock, including any time spent waiting for a refund.
  const now = clock();
  const grant = await em.findOne(ClassEntitlement, {
    classroom: classId,
    capability,
    startsAt: { $lte: now },
    endsAt: { $gt: now },
    revokedAt: null,
  });
  return grant !== null;
}
