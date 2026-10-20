import type { DatabaseManager } from '../transactions';

/** Fail closed on references crossing the sandbox boundary; never relax ordinary retention FKs. */
export async function deleteDemoWorkspaceData(em: DatabaseManager, workspaceId: string) {
  if (!em.isInTransaction()) throw new Error('An active workspace transaction is required.');
  const {
    DemoWorkspace,
    DemoWorkspaceStatus,
    LockMode,
    User,
    UserIdentityProvider,
    Classroom,
    Enrollment,
    Assignment,
    AssignmentItem,
    AssignmentAttempt,
    Problem,
    ProblemVersion,
    ClassPurchase,
    ClassEntitlement,
    PaymentEvent,
    BillingProvider,
    EntitlementSource,
    AuthSession,
    DemoSession,
  } = await import('@logiclab/db');
  const workspace = await em.findOne(DemoWorkspace, workspaceId, {
    lockMode: LockMode.PESSIMISTIC_WRITE,
    refresh: true,
  });
  if (
    !workspace ||
    (workspace.status !== DemoWorkspaceStatus.Resetting &&
      workspace.status !== DemoWorkspaceStatus.Expired)
  )
    throw new Error('Demo deletion requires a resetting or expired workspace.');
  const users = await em.find(User, {
    demoWorkspace: workspaceId,
    identityProvider: UserIdentityProvider.Demo,
  });
  const userIds = users.map((user) => user.id);
  const own = { $in: userIds };
  const outside = { $nin: userIds };
  const unsafe = await Promise.all([
    em.count(Enrollment, {
      $or: [
        { classroom: { owner: own }, student: outside },
        { student: own, classroom: { owner: outside } },
      ],
    }),
    em.count(AssignmentAttempt, {
      $or: [
        { assignment: { classroom: { owner: own } }, student: outside },
        { student: own, assignment: { classroom: { owner: outside } } },
      ],
    }),
    em.count(AssignmentItem, {
      $or: [
        {
          assignment: { classroom: { owner: own } },
          problemVersion: { problem: { owner: outside } },
        },
        {
          problemVersion: { problem: { owner: own } },
          assignment: { classroom: { owner: outside } },
        },
      ],
    }),
    em.count(ClassPurchase, {
      $or: [
        { classroom: { owner: own }, payer: outside },
        { payer: own, classroom: { owner: outside } },
      ],
    }),
  ]);
  if (unsafe.some(Boolean)) throw new Error('Demo data has cross-workspace references.');
  const purchases = await em.find(ClassPurchase, { classroom: { owner: own } });
  const references = purchases.map((purchase) => purchase.checkoutReference);
  if (purchases.some((purchase) => purchase.provider !== BillingProvider.Simulator))
    throw new Error('Demo data contains unsupported funding.');
  if (
    await em.count(ClassEntitlement, {
      $or: [
        {
          classroom: { owner: own },
          $or: [
            { provider: { $ne: BillingProvider.Simulator } },
            { source: { $ne: EntitlementSource.ClassPurchase } },
            { sourceReference: { $nin: references } },
          ],
        },
        {
          provider: BillingProvider.Simulator,
          sourceReference: { $in: references },
          classroom: { owner: outside },
        },
      ],
    })
  )
    throw new Error('Demo data has unowned entitlement references.');

  // Guards on immutable versions/submissions permit only demo reset/expiry deletion.
  await em.nativeDelete(AssignmentAttempt, { student: own });
  await em.nativeDelete(AssignmentItem, { assignment: { classroom: { owner: own } } });
  await em.nativeDelete(Assignment, { classroom: { owner: own } });
  await em.nativeDelete(Enrollment, { student: own });
  await em.nativeDelete(ClassEntitlement, { classroom: { owner: own } });
  await em.nativeDelete(PaymentEvent, {
    provider: BillingProvider.Simulator,
    sourceReference: { $in: references },
  });
  await em.nativeDelete(ClassPurchase, { classroom: { owner: own } });
  await em.nativeDelete(ProblemVersion, { problem: { owner: own } });
  await em.nativeDelete(Problem, { owner: own });
  await em.nativeDelete(Classroom, { owner: own });
  await em.nativeDelete(AuthSession, { user: own });
  await em.nativeDelete(DemoSession, { workspace: workspaceId });
  await em.nativeDelete(User, {
    id: own,
    identityProvider: UserIdentityProvider.Demo,
    demoWorkspace: workspaceId,
  });
}
