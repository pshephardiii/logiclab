import { createBillingStore } from '../../src/persistence/billing/store';
import { createBillingService } from '../../src/application/billing/service';
import { createSimulatorProvider } from '../../src/integrations/payments/simulator/provider';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { createDemoWorkspaceStore } from '../../src/persistence/demo/workspaces';
import { createDemoSessionStore } from '../../src/persistence/demo/sessions';
import { createDemoSessionService } from '../../src/application/demo/service';
import { createDemoWorkspaceService } from '../../src/application/demo/workspaces';
import { createDemoAccess } from '../../src/persistence/demo/access';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { DEMO_TEMPLATE, DEMO_CONCEPTUAL_QUESTIONS } from '../../src/application/demo/template';
import { readDemoPolicy } from '../../src/config/demo';
import { demoSessionHash } from '../../src/application/demo/service';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const policy = readDemoPolicy({});
async function fixture(
  check: (
    orm: Awaited<ReturnType<typeof createDatabase>>,
    db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
  ) => Promise<void>,
) {
  const db = await import('@logiclab/db');
  const schema = `demo_seed_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await check(orm, db);
  } finally {
    await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}

test('concurrent provisioning is repeatable and seeds actual simulator coverage and published student work', async () =>
  fixture(async (orm, db) => {
    const store = await createDemoWorkspaceStore(orm, policy);
    const id = randomUUID();
    const [one, two] = await Promise.all([store.provision(id), store.provision(id)]);
    assert.deepEqual(one, two);
    assert.equal(one.templateVersion, DEMO_TEMPLATE.version);
    const em = orm.em.fork();
    assert.equal(await em.count(db.DemoWorkspace, {}), 1);
    assert.equal(await em.count(db.User, { demoWorkspace: id }), 2);
    assert.equal(await em.count(db.Classroom, {}), 2);
    assert.equal(await em.count(db.Enrollment, {}), 2);
    assert.equal(await em.count(db.ProblemVersion, {}), 3);
    assert.equal(
      await em.count(db.ClassPurchase, { status: db.PurchaseStatus.Paid, lastEventSequence: 1 }),
      1,
    );
    assert.equal(await em.count(db.ClassEntitlement, {}), 1);
    assert.equal(await em.count(db.PaymentEvent, {}), 1);
    const purchase = await em.findOneOrFail(db.ClassPurchase, { status: db.PurchaseStatus.Paid });
    const grant = await em.findOneOrFail(db.ClassEntitlement, {
      capability: db.ClassCapability.PublishAssignments,
    });
    const receipt = await em.findOneOrFail(db.PaymentEvent, { sequence: 1 });
    assert.equal(grant.sourceReference, purchase.checkoutReference);
    assert.equal(receipt.sourceReference, purchase.checkoutReference);
    assert.equal(
      grant.endsAt.getTime() - grant.startsAt.getTime(),
      purchase.coverageDays * 86400000,
    );
    const assignment = await em.findOneOrFail(db.Assignment, {
      title: DEMO_TEMPLATE.assignmentTitle,
    });
    assert(assignment.publishedAt);
    assert.equal(assignment.feedbackTiming, db.FeedbackTiming.OnSubmission);
    const student = await em.findOneOrFail(db.User, {
      demoWorkspace: id,
      role: db.UserRole.Student,
    });
    const work = await createStudentWorkStore(orm);
    await work.read(student.id, assignment.id);
    const submitted = await work.submit(student.id, assignment.id, 0);
    assert(submitted.submittedAt);
    const practice = await em.findOneOrFail(db.Assignment, {
      title: DEMO_TEMPLATE.practiceAssignmentTitle,
    });
    assert(practice.publishedAt);
    const practiceDetail = await work.read(student.id, practice.id);
    assert.equal(practiceDetail.assignment.assessmentMode, 'ungraded_practice');
    assert.equal(practiceDetail.assignment.feedbackTiming, 'immediate');
    assert.equal(practiceDetail.assignment.solutionAccess, 'anytime');
    const practiceItem = practiceDetail.assignment.items[0]!;
    assert((await work.solution(student.id, practice.id, practiceItem.id)).solution);
    assert(
      (await work.check(student.id, practice.id, { itemId: practiceItem.id, answers: [] }))
        .feedback,
    );
    await assert.rejects(work.submit(student.id, practice.id, 0), /submission_unavailable/);
    assert.equal(await em.count(db.AssignmentAttempt, { assignment: practice.id }), 0);
    const instructor = await em.findOneOrFail(db.User, {
      demoWorkspace: id,
      role: db.UserRole.Instructor,
    });
    const unpaid = await em.findOneOrFail(db.Classroom, { name: DEMO_TEMPLATE.unpaidClassName });
    assert.equal(await em.count(db.ClassEntitlement, { classroom: unpaid.id }), 0);
    const versions = await em.find(db.ProblemVersion, {});
    const assignments = await createAssignmentStore(orm);
    const draft = await assignments.create(instructor.id, unpaid.id, {
      title: 'Unpaid draft',
      solutionAccess: 'never',
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
      problemVersionIds: [versions[0]!.id],
    });
    await assert.rejects(assignments.publish(instructor.id, draft.id), /coverage_required/);
  }));

test('reset restores the template, clears submitted work and billing history, and preserves other workspaces and normal data', async () =>
  fixture(async (orm, db) => {
    const store = await createDemoWorkspaceStore(orm, policy);
    const service = createDemoWorkspaceService(store);
    const first = await service.provision();
    const other = await service.provision();
    const sessions = createDemoSessionService(await createDemoSessionStore(orm, policy));
    const initial = await sessions.issue(first.workspaceId, 'student');
    const otherSession = await sessions.issue(other.workspaceId, 'instructor');
    const em = orm.em.fork();
    const workspace = await em.findOneOrFail(db.DemoWorkspace, first.workspaceId);
    const absoluteDeadline = workspace.expiresAt.getTime();
    const oldUsers = await em.find(db.User, { demoWorkspace: first.workspaceId });
    const oldAssignment = await em.findOneOrFail(db.Assignment, {
      assessmentMode: db.AssessmentMode.Graded,
      title: DEMO_TEMPLATE.assignmentTitle,
      classroom: { owner: { demoWorkspace: first.workspaceId } },
    });
    const oldPurchase = await em.findOneOrFail(db.ClassPurchase, {
      payer: { demoWorkspace: first.workspaceId },
    });
    const work = await createStudentWorkStore(orm);
    await work.submit(initial.actor.id, oldAssignment.id, 0);
    const billingConfig = { signingSecret: randomBytes(32).toString('hex') };
    const billing = createBillingService(
      await createBillingStore(orm),
      createSimulatorProvider(billingConfig),
      billingConfig,
    );
    await billing.simulate(oldPurchase.payer.id, oldPurchase.id, 'refunded');
    const job = em.create(db.DurableJob, {
      jobType: db.JobType.BillingReconciliation,
      deduplicationKey: randomUUID(),
    });
    const finding = em.create(db.ReconciliationFinding, {
      job,
      kind: db.FindingKind.PaidPurchaseMissingGrant,
      purchaseId: oldPurchase.id,
      classId: oldAssignment.classroom.id,
    });
    em.persist([job, finding]);
    await em.flush();
    await em.nativeUpdate(
      db.Problem,
      { owner: { demoWorkspace: first.workspaceId } },
      { title: 'Visitor changed this' },
    );
    const plan = await em.findOneOrFail(db.BillingPlan, { billingModel: db.BillingModel.OneTime });
    await em.nativeUpdate(db.BillingPlan, plan.id, { name: 'Preserve operator catalog edit' });
    const normal = em.create(db.User, {
      cognitoUserPoolId: 'normal',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    const normalClass = em.create(db.Classroom, { name: 'Real data stays', owner: normal });
    em.persist([normal, normalClass]);
    await em.flush();
    // Simulate a retained template-3 visitor: authentication must not upgrade its content.
    await em.nativeUpdate(db.DemoWorkspace, first.workspaceId, { templateVersion: 3 });
    await em.nativeUpdate(
      db.Assignment,
      {
        classroom: { owner: { demoWorkspace: first.workspaceId } },
        title: DEMO_TEMPLATE.practiceAssignmentTitle,
      },
      { feedbackTiming: db.FeedbackTiming.OnCheck },
    );
    await sessions.authenticate(initial.sessionId);
    assert.equal(
      (await em.fork().findOneOrFail(db.DemoWorkspace, first.workspaceId)).templateVersion,
      3,
    );
    assert.equal(
      (
        await em.fork().findOneOrFail(db.Assignment, {
          classroom: { owner: { demoWorkspace: first.workspaceId } },
          title: DEMO_TEMPLATE.practiceAssignmentTitle,
        })
      ).feedbackTiming,
      db.FeedbackTiming.OnCheck,
    );
    assert.equal(await em.fork().count(db.Assignment, { id: oldAssignment.id }), 1);
    assert.equal(
      await em.fork().count(db.Problem, {
        owner: { demoWorkspace: first.workspaceId },
        title: 'Visitor changed this',
      }),
      3,
    );
    const reset = await service.reset(initial.sessionId);
    assert.equal(reset.actor.workspaceId, first.workspaceId);
    assert.equal(reset.actor.generation, 2);
    assert.equal(reset.actor.role, 'student');
    assert.notEqual(reset.actor.id, initial.actor.id);
    await assert.rejects(sessions.authenticate(initial.sessionId));
    assert.deepEqual(await sessions.authenticate(reset.sessionId), reset.actor);
    assert.equal(
      (await sessions.authenticate(otherSession.sessionId)).workspaceId,
      other.workspaceId,
    );
    em.clear();
    assert.equal(
      (await em.findOneOrFail(db.DemoWorkspace, first.workspaceId)).expiresAt.getTime(),
      absoluteDeadline,
    );
    assert.equal(await em.count(db.User, { id: { $in: oldUsers.map((user) => user.id) } }), 0);
    assert.equal(await em.count(db.Assignment, { id: oldAssignment.id }), 0);
    assert.equal(
      (await em.findOneOrFail(db.DemoWorkspace, first.workspaceId)).templateVersion,
      DEMO_TEMPLATE.version,
    );
    assert.equal(
      await em.count(db.Assignment, {
        classroom: { owner: { demoWorkspace: first.workspaceId } },
        publishedAt: { $ne: null },
      }),
      3,
    );
    assert.equal(
      await em.count(db.Assignment, {
        classroom: { owner: { demoWorkspace: first.workspaceId } },
        title: DEMO_TEMPLATE.practiceAssignmentTitle,
        feedbackTiming: db.FeedbackTiming.Immediate,
      }),
      1,
    );

    assert.equal(await em.count(db.AssignmentAttempt, {}), 0);
    assert.equal(await em.count(db.ClassPurchase, { id: oldPurchase.id }), 0);
    assert.equal(
      await em.count(db.PaymentEvent, { sourceReference: oldPurchase.checkoutReference }),
      0,
    );
    assert.equal(await em.count(db.Problem, { title: DEMO_TEMPLATE.problemTitle }), 2);
    assert.equal(await em.count(db.ClassPurchase, { status: db.PurchaseStatus.Paid }), 2);
    assert.equal(await em.count(db.ClassEntitlement, { revokedAt: null }), 2);
    assert.equal(
      (await em.findOneOrFail(db.ReconciliationFinding, finding.id)).purchaseId,
      oldPurchase.id,
    );
    assert.equal((await em.findOneOrFail(db.Classroom, normalClass.id)).name, 'Real data stays');
    assert.equal(
      (await em.findOneOrFail(db.BillingPlan, plan.id)).name,
      'Preserve operator catalog edit',
    );
  }));

test('failed seed/reset rolls back all graph, credential and generation changes and can be retried', async () =>
  fixture(async (orm, db) => {
    const store = await createDemoWorkspaceStore(orm, policy);
    const service = createDemoWorkspaceService(store);
    const first = await service.provision();
    const sessions = createDemoSessionService(await createDemoSessionStore(orm, policy));
    const session = await sessions.issue(first.workspaceId, 'instructor');
    const em = orm.em.fork();
    const plan = await em.findOneOrFail(db.BillingPlan, { billingModel: db.BillingModel.OneTime });
    const student = await em.findOneOrFail(db.User, {
      demoWorkspace: first.workspaceId,
      role: db.UserRole.Student,
    });
    const assignment = await em.findOneOrFail(db.Assignment, {
      assessmentMode: db.AssessmentMode.Graded,
      title: DEMO_TEMPLATE.assignmentTitle,
      classroom: { owner: { demoWorkspace: first.workspaceId } },
    });
    await (await createStudentWorkStore(orm)).submit(student.id, assignment.id, 0);
    await em.nativeUpdate(db.BillingPlan, plan.id, { active: false });
    await assert.rejects(service.reset(session.sessionId));
    assert.equal((await sessions.authenticate(session.sessionId)).generation, 1);
    em.clear();
    assert.equal(
      (await em.findOneOrFail(db.DemoWorkspace, first.workspaceId)).status,
      db.DemoWorkspaceStatus.Active,
    );
    assert.equal(await em.count(db.User, { demoWorkspace: first.workspaceId }), 2);
    assert.equal(await em.count(db.ProblemVersion, {}), 3);
    assert.equal(await em.count(db.ClassPurchase, {}), 1);
    assert.equal(await em.count(db.AssignmentAttempt, { submittedAt: { $ne: null } }), 1);
    const nextId = randomUUID();
    await assert.rejects(store.provision(nextId));
    assert.equal(await em.count(db.DemoWorkspace, { id: nextId }), 0);
    assert.equal(await em.count(db.User, {}), 2);
    await em.nativeUpdate(db.BillingPlan, plan.id, { active: true });
    assert.equal((await service.reset(session.sessionId)).actor.generation, 2);
    assert.equal((await store.provision(nextId)).generation, 1);
  }));

test('concurrent resets accept the credential once and fence writes made with the previous generation', async () =>
  fixture(async (orm, db) => {
    const service = createDemoWorkspaceService(await createDemoWorkspaceStore(orm, policy));
    const workspace = await service.provision();
    const sessions = createDemoSessionService(await createDemoSessionStore(orm, policy));
    const session = await sessions.issue(workspace.workspaceId, 'instructor');
    const access = await createDemoAccess(orm);
    let releaseWrite!: () => void;
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    let writeLocked!: (pid: number) => void;
    const locked = new Promise<number>((resolve) => {
      writeLocked = resolve;
    });
    const write = access.withSession(
      demoSessionHash(session.sessionId),
      async (em, current, record) => {
        const actor = await access.actorFor(em, current.id, record.generation, record.selectedRole);
        assert(actor);
        em.persist(
          em.create(db.Problem, {
            owner: em.getReference(db.User, actor.id),
            title: 'Before reset',
            definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
          }),
        );
        await em.flush();
        const rows = await em.execute<{ pid: number }[]>('select pg_backend_pid() as pid');
        writeLocked(rows[0]!.pid);
        await writeGate;
        return true;
      },
    );
    const blockerPid = await locked;
    const pendingResets = Promise.allSettled([
      service.reset(session.sessionId),
      service.reset(session.sessionId),
    ]);
    try {
      const deadline = Date.now() + 5000;
      let blocked = false;
      while (Date.now() < deadline) {
        const rows = await orm.em
          .fork()
          .execute<{ blocked: boolean }[]>(
            'select exists(select 1 from pg_stat_activity where ? = any(pg_blocking_pids(pid))) as blocked',
            [blockerPid],
          );
        if (rows[0]!.blocked) {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(blocked, true, 'Reset must wait until the fenced write completes.');
    } finally {
      releaseWrite();
    }
    assert.equal(await write, true);
    const resets = await pendingResets;
    assert.equal(resets.filter((result) => result.status === 'fulfilled').length, 1);
    let executed = false;
    assert.equal(
      await access.withSession(demoSessionHash(session.sessionId), async () => {
        executed = true;
        return true;
      }),
      null,
    );
    assert.equal(executed, false);
    assert.equal(await orm.em.fork().count(db.Problem, { title: 'Before reset' }), 0);
  }));

test('reset fails closed on cross-workspace enrollment rather than deleting another visitor data', async () =>
  fixture(async (orm, db) => {
    const service = createDemoWorkspaceService(await createDemoWorkspaceStore(orm, policy));
    const first = await service.provision();
    const other = await service.provision();
    const sessions = createDemoSessionService(await createDemoSessionStore(orm, policy));
    const session = await sessions.issue(first.workspaceId, 'instructor');
    const em = orm.em.fork();
    const classroom = await em.findOneOrFail(db.Classroom, {
      owner: { demoWorkspace: first.workspaceId },
    });
    const student = await em.findOneOrFail(db.User, {
      demoWorkspace: other.workspaceId,
      role: db.UserRole.Student,
    });
    em.persist(em.create(db.Enrollment, { classroom, student }));
    await em.flush();
    await assert.rejects(service.reset(session.sessionId), /cross-workspace/);
    assert.equal((await sessions.authenticate(session.sessionId)).generation, 1);
    assert.equal(await em.count(db.User, {}), 4);
    assert.equal(await em.count(db.Enrollment, { student: student.id }), 3);
  }));

test('demo retention guards allow delete only during reset/expiry and never allow immutable updates', async () =>
  fixture(async (orm, db) => {
    const service = createDemoWorkspaceService(await createDemoWorkspaceStore(orm, policy));
    const workspace = await service.provision();
    const em = orm.em.fork();
    const version = await em.findOneOrFail(db.ProblemVersion, {
      problem: { owner: { demoWorkspace: workspace.workspaceId } },
    });
    const assignment = await em.findOneOrFail(db.Assignment, {
      assessmentMode: db.AssessmentMode.Graded,
      title: DEMO_TEMPLATE.assignmentTitle,
      classroom: { owner: { demoWorkspace: workspace.workspaceId } },
    });
    const student = await em.findOneOrFail(db.User, {
      demoWorkspace: workspace.workspaceId,
      role: db.UserRole.Student,
    });
    const work = await createStudentWorkStore(orm);
    await work.submit(student.id, assignment.id, 0);
    const attempt = await em.findOneOrFail(db.AssignmentAttempt, { assignment: assignment.id });
    await assert.rejects(em.nativeDelete(db.ProblemVersion, version.id), /immutable/);
    await assert.rejects(em.nativeDelete(db.AssignmentAttempt, attempt.id), /immutable/);
    await em.nativeUpdate(db.DemoWorkspace, workspace.workspaceId, {
      status: db.DemoWorkspaceStatus.Resetting,
    });
    await assert.rejects(
      em.nativeUpdate(db.ProblemVersion, version.id, { title: 'Still forbidden' }),
      /immutable/,
    );
    await assert.rejects(
      em.nativeUpdate(db.AssignmentAttempt, attempt.id, { revision: 999 }),
      /immutable/,
    );
    const normal = em.create(db.User, {
      cognitoUserPoolId: 'normal',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    const problem = em.create(db.Problem, {
      owner: normal,
      title: 'Normal immutable content',
      definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
    });
    const normalVersion = em.create(db.ProblemVersion, {
      problem,
      title: problem.title,
      definition: problem.definition,
      version: 1,
    });
    em.persist([normal, problem, normalVersion]);
    await em.flush();
    await assert.rejects(em.nativeDelete(db.ProblemVersion, normalVersion.id), /immutable/);
    await em.nativeUpdate(db.DemoWorkspace, workspace.workspaceId, {
      status: db.DemoWorkspaceStatus.Expired,
    });
    await em.nativeDelete(db.AssignmentAttempt, attempt.id);
    await em.nativeDelete(db.AssignmentItem, { problemVersion: version.id });
    await em.nativeDelete(db.ProblemVersion, version.id);
    assert.equal(await em.count(db.AssignmentAttempt, { id: attempt.id }), 0);
    assert.equal(await em.count(db.ProblemVersion, { id: version.id }), 0);
    assert.equal(await em.count(db.ProblemVersion, { id: normalVersion.id }), 1);
  }));

test('reset cannot revive an idle-expired workspace or extend its absolute deadline', async () =>
  fixture(async (orm, db) => {
    const service = createDemoWorkspaceService(await createDemoWorkspaceStore(orm, policy));
    const workspace = await service.provision();
    const sessions = createDemoSessionService(await createDemoSessionStore(orm, policy));
    const session = await sessions.issue(workspace.workspaceId, 'instructor');
    const em = orm.em.fork();
    const original = await em.findOneOrFail(db.DemoWorkspace, workspace.workspaceId);
    const expiresAt = original.expiresAt.getTime();
    const past = new Date(original.createdAt.getTime() - 3600000);
    await em.nativeUpdate(db.DemoWorkspace, workspace.workspaceId, {
      createdAt: past,
      lastActivityAt: past,
      idleExpiresAt: new Date(original.createdAt.getTime() - 1000),
    });
    await assert.rejects(service.reset(session.sessionId), /DEMO_SESSION_INVALID/);
    em.clear();
    const saved = await em.findOneOrFail(db.DemoWorkspace, workspace.workspaceId);
    assert.equal(saved.generation, 1);
    assert.equal(saved.expiresAt.getTime(), expiresAt);
    assert.equal(await em.count(db.User, { demoWorkspace: workspace.workspaceId }), 2);
  }));

test('template 5 seeds weighted graded assignments and score-free private practice with pinned conceptual keys', async () =>
  fixture(async (orm, db) => {
    const workspace = await (await createDemoWorkspaceStore(orm, policy)).provision(randomUUID());
    const em = orm.em.fork();
    const owner = await em.findOneOrFail(db.User, {
      demoWorkspace: workspace.workspaceId,
      role: db.UserRole.Instructor,
    });
    const student = await em.findOneOrFail(db.User, {
      demoWorkspace: workspace.workspaceId,
      role: db.UserRole.Student,
    });
    const work = await createStudentWorkStore(orm);
    const assignments = await createAssignmentStore(orm);
    const practice = await em.findOneOrFail(db.Assignment, {
      classroom: { owner },
      title: DEMO_TEMPLATE.practiceAssignmentTitle,
    });
    const graded = await em.findOneOrFail(db.Assignment, {
      classroom: { owner },
      title: DEMO_TEMPLATE.mixedAssignmentTitle,
    });
    const first = await em.findOneOrFail(db.Assignment, {
      classroom: { owner },
      title: DEMO_TEMPLATE.assignmentTitle,
    });
    assert.deepEqual(
      (await assignments.findOwned(owner.id, first.id)).items.map((item) => item.maxPoints),
      [20],
    );
    const gradedRead = await work.read(student.id, graded.id);
    assert.deepEqual(
      gradedRead.assignment.items.map((item) => item.maxPoints),
      [20, 5, 5],
    );
    const read = await work.read(student.id, practice.id);
    assert.equal(read.assignment.items.length, 3);
    assert.equal(read.assignment.feedbackTiming, 'immediate');
    assert.equal(read.assignment.assessmentMode, 'ungraded_practice');
    assert(read.assignment.items.every((item) => item.maxPoints === undefined));
    for (const key of ['correctAnswer', 'correctOptionId', 'explanation'])
      assert.equal(JSON.stringify(read).includes(`"${key}"`), false);
    for (const example of DEMO_CONCEPTUAL_QUESTIONS) {
      const item = read.assignment.items.find((item) => item.title === example.title)!;
      assert('content' in item);
      const answer =
        example.definition.type === 'true_false'
          ? { type: 'true_false' as const, answer: false }
          : { type: 'multiple_choice' as const, optionId: example.definition.correctOptionId };
      const checked = await work.check(student.id, practice.id, {
        itemId: item.id,
        answers: answer,
      });
      assert.deepEqual(checked.feedback, { status: 'correct' });
      assert.equal(await em.count(db.AssignmentAttempt, { assignment: practice.id }), 0);
      const solution = await work.solution(student.id, practice.id, item.id);
      assert('type' in solution.solution);
      assert.equal(solution.solution.explanation, example.definition.explanation);
    }
    const final = await work.submit(student.id, graded.id, 0);
    assert.equal(final.gradePending, true);
    assert.equal(final.result, null);
    assert.equal(final.score, null);
    const detail = await work.read(student.id, graded.id);
    const conceptual = detail.assignment.items.find((item) => 'content' in item)!;
    await assert.rejects(work.solution(student.id, graded.id, conceptual.id), /solution_locked/);
    await assignments.release(owner.id, graded.id, 'answers');
    assert('type' in (await work.solution(student.id, graded.id, conceptual.id)).solution);
    assert.equal((await work.read(student.id, graded.id)).attempt!.result, null);
    await assignments.release(owner.id, graded.id, 'grades');
    assert.equal((await work.read(student.id, graded.id)).attempt!.score!.summary.maxPoints, 30);
    assert.equal(
      (await work.read(student.id, graded.id)).attempt!.result!.gradingVersion,
      'mixed_v1',
    );
    assert.equal((await work.submit(student.id, graded.id, 0)).gradePending, false);
  }));
