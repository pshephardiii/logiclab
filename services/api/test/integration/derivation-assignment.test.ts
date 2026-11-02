import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { assignmentSchema } from '@logiclab/contracts';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { AssignmentOperationError } from '../../src/application/assignment/errors';
import { derivationDefinitionFixture } from '../derivation-fixture';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const failure = (reason: string) => (error: unknown) =>
  error instanceof AssignmentOperationError && error.reason === reason;
async function fixture(work: (f: Awaited<ReturnType<typeof seed>>) => Promise<void>) {
  const db = await import('@logiclab/db');
  const schema = `proof_assignment_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await work(await seed(orm, db));
  } finally {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}
async function seed(
  orm: Awaited<
    ReturnType<
      (typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }))['createDatabase']
    >
  >,
  db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
) {
  const em = orm.em.fork();
  const owner = em.create(db.User, {
    cognitoUserPoolId: 'proof-assignment',
    cognitoSubject: randomUUID(),
    role: db.UserRole.Instructor,
  });
  const other = em.create(db.User, {
    cognitoUserPoolId: 'proof-assignment',
    cognitoSubject: randomUUID(),
    role: db.UserRole.Instructor,
  });
  const student = em.create(db.User, {
    cognitoUserPoolId: 'proof-assignment',
    cognitoSubject: randomUUID(),
    role: db.UserRole.Student,
  });
  const classroom = em.create(db.Classroom, { owner, name: 'Proof assignment' });
  em.persist([owner, other, student, classroom, em.create(db.Enrollment, { classroom, student })]);
  await em.flush();
  const problems = await createProblemStore(orm);
  const proof = await problems.create(owner.id, {
    title: 'Identity proof',
    definition: derivationDefinitionFixture(),
  });
  const table = await problems.create(owner.id, {
    title: 'Table companion',
    definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
  });
  const proofVersion = await problems.publish(owner.id, proof.id);
  const tableVersion = await problems.publish(owner.id, table.id);
  if (proofVersion.status !== 'published' || tableVersion.status !== 'published')
    throw new Error('Expected publications');
  const assignments = await createAssignmentStore(orm);
  const practice = {
    title: 'Mixed proof practice',
    assessmentMode: 'ungraded_practice' as const,
    feedbackTiming: 'immediate' as const,
    solutionAccess: 'never' as const,
    problemVersionIds: [proofVersion.version.id, tableVersion.version.id, proofVersion.version.id],
  };
  async function cover() {
    const manager = orm.em.fork();
    const grant = manager.create(db.ClassEntitlement, {
      classroom: manager.getReference(db.Classroom, classroom.id),
      provider: db.BillingProvider.Simulator,
      source: db.EntitlementSource.ClassPurchase,
      sourceReference: randomUUID(),
      startsAt: new Date(Date.now() - 60000),
      endsAt: new Date(Date.now() + 86400000),
    });
    manager.persist(grant);
    await manager.flush();
  }
  return {
    orm,
    db,
    owner,
    other,
    student,
    classroom,
    problems,
    proof,
    proofVersion: proofVersion.version,
    tableVersion: tableVersion.version,
    assignments,
    practice,
    cover,
  };
}
test('practice admission pins repeated proof versions, keeps student content private and preserves duplicate/archive behavior', async () =>
  fixture(async (f) => {
    const { orm, db, assignments, owner, classroom } = f;
    const draft = await assignments.create(owner.id, classroom.id, f.practice);
    assert(assignmentSchema.safeParse(draft).success);
    assert.equal(draft.items[0]!.problemVersion.definition.type, 'derivation');
    assert.equal(draft.items[0]!.problemVersion.id, draft.items[2]!.problemVersion.id);
    assert.notEqual(draft.items[0]!.id, draft.items[2]!.id);
    await assert.rejects(assignments.publish(owner.id, draft.id), failure('coverage_required'));
    assert.equal((await assignments.findOwned(owner.id, draft.id)).publishedAt, null);
    await f.cover();
    const published = await assignments.publish(owner.id, draft.id);
    assert(published.publishedAt);
    await assert.rejects(
      assignments.update(owner.id, draft.id, { title: 'Blocked' }),
      failure('published'),
    );
    await f.problems.update(owner.id, f.proof.id, {
      definition: {
        ...derivationDefinitionFixture(),
        conclusion: 'Q',
        referenceProof: null,
        explanation: 'NEW_PRIVATE_DRAFT',
      },
    });
    await f.problems.setArchived(owner.id, f.proof.id, true);
    assert.deepEqual((await assignments.findOwned(owner.id, draft.id)).items, published.items);
    const studentWork = await createStudentWorkStore(orm);
    const read = await studentWork.read(f.student.id, draft.id);
    assert(!JSON.stringify(read).includes('referenceProof'));
    assert(!JSON.stringify(read).includes('explanation'));
    const check = await studentWork.check(f.student.id, draft.id, {
      itemId: draft.items[0]!.id,
      answers: { type: 'derivation', proof: derivationDefinitionFixture().referenceProof! },
    });
    assert('type' in check.feedback && check.feedback.type === 'derivation');
    assert.equal(check.feedback.report.status, 'accepted');
    const copy = await assignments.duplicate(owner.id, draft.id);
    assert.equal(copy.publishedAt, null);
    assert.equal(copy.assessmentMode, 'ungraded_practice');
    assert.deepEqual(
      copy.items.map((item) => item.problemVersion),
      published.items.map((item) => item.problemVersion),
    );
    assert(
      copy.items.every((item) => !published.items.some((original) => original.id === item.id)),
    );
    await assignments.setArchived(owner.id, draft.id, true);
    const restored = await assignments.setArchived(owner.id, draft.id, false);
    assert.equal(restored.publishedAt, published.publishedAt);
    assert.deepEqual(restored.items, published.items);
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 0);
  }));
test('proof mode guards validate the complete merged draft and roll back rejected creates and policy edits', async () =>
  fixture(async (f) => {
    const { assignments, owner, classroom, orm, db } = f;
    for (const assessmentMode of ['graded'] as const) {
      await assert.rejects(
        assignments.create(owner.id, classroom.id, {
          ...f.practice,
          assessmentMode,
          feedbackTiming: 'on_submission',
        }),
        failure('proof_mode_unavailable'),
      );
    }
    assert.equal(await orm.em.fork().count(db.Assignment, {}), 0);
    const draft = await assignments.create(owner.id, classroom.id, f.practice);
    for (const assessmentMode of ['graded'] as const) {
      await assert.rejects(
        assignments.update(owner.id, draft.id, {
          assessmentMode,
          feedbackTiming: 'on_submission',
          title: 'Must roll back',
        }),
        failure('proof_mode_unavailable'),
      );
      assert.deepEqual(await assignments.findOwned(owner.id, draft.id), draft);
    }
    const completion = await assignments.update(owner.id, draft.id, {
      assessmentMode: 'completion_only',
      feedbackTiming: 'on_submission',
    });
    assert.equal(completion.assessmentMode, 'completion_only');
    assert(assignmentSchema.safeParse(completion).success);
    for (const feedbackTiming of ['on_check', 'immediate'] as const) {
      await assert.rejects(
        assignments.update(owner.id, draft.id, { feedbackTiming }),
        failure('proof_mode_unavailable'),
      );
      assert.deepEqual(await assignments.findOwned(owner.id, draft.id), completion);
    }
    // Removing proofs and changing mode in one PATCH is allowed; an intermediate old item set must not block it.
    const graded = await assignments.update(owner.id, draft.id, {
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
      items: [{ problemVersionId: f.tableVersion.id, maxPoints: 10 }],
    });
    assert.equal(graded.assessmentMode, 'graded');
    assert.equal(graded.items.length, 1);
    await assert.rejects(
      assignments.update(owner.id, draft.id, {
        items: [{ problemVersionId: f.proofVersion.id, maxPoints: 10 }],
      }),
      failure('proof_mode_unavailable'),
    );
    assert.deepEqual(await assignments.findOwned(owner.id, draft.id), graded);
  }));
test('publication independently rejects unsupported proof modes, and foreign publications or archived drafts stay protected', async () =>
  fixture(async (f) => {
    const { orm, db, assignments } = f;
    await assert.rejects(
      assignments.create(f.other.id, f.classroom.id, f.practice),
      failure('not_found'),
    );
    const manager = orm.em.fork();
    const otherClass = manager.create(db.Classroom, {
      owner: manager.getReference(db.User, f.other.id),
      name: 'Foreign',
    });
    manager.persist(otherClass);
    await manager.flush();
    await assert.rejects(
      assignments.create(f.other.id, otherClass.id, f.practice),
      failure('version_not_found'),
    );
    const draft = await assignments.create(f.owner.id, f.classroom.id, f.practice);
    await assignments.setArchived(f.owner.id, draft.id, true);
    await assert.rejects(
      assignments.update(f.owner.id, draft.id, { title: 'Blocked' }),
      failure('archived'),
    );
    await assert.rejects(assignments.publish(f.owner.id, draft.id), failure('archived'));
    const bypass = manager.create(db.Assignment, {
      classroom: manager.getReference(db.Classroom, f.classroom.id),
      title: 'Internal invalid graded fixture',
    });
    manager.persist([
      bypass,
      manager.create(db.AssignmentItem, {
        assignment: bypass,
        position: 1,
        problemVersion: manager.getReference(db.ProblemVersion, f.proofVersion.id),
        maxPoints: 10,
      }),
    ]);
    await manager.flush();
    await f.cover();
    await assert.rejects(
      assignments.publish(f.owner.id, bypass.id),
      failure('proof_mode_unavailable'),
    );
    assert.equal((await orm.em.fork().findOneOrFail(db.Assignment, bypass.id)).publishedAt, null);
  }));
test('racing publication and mode/item replacement never produce a graded proof assignment', async () =>
  fixture(async (f) => {
    await f.cover();
    const draft = await f.assignments.create(f.owner.id, f.classroom.id, f.practice);
    const outcomes = await Promise.allSettled([
      f.assignments.update(f.owner.id, draft.id, {
        assessmentMode: 'graded',
        feedbackTiming: 'on_submission',
        items: [{ problemVersionId: f.tableVersion.id, maxPoints: 10 }],
      }),
      f.assignments.publish(f.owner.id, draft.id),
    ]);
    assert.equal(outcomes[1]!.status, 'fulfilled');
    const final = await f.assignments.findOwned(f.owner.id, draft.id);
    assert(final.publishedAt);
    if (outcomes[0]!.status === 'fulfilled') {
      assert.equal(final.assessmentMode, 'graded');
      assert(final.items.every((item) => item.problemVersion.definition.type !== 'derivation'));
    } else {
      assert(failure('published')(outcomes[0]!.reason));
      assert.equal(final.assessmentMode, 'ungraded_practice');
      assert.equal(final.items.length, 3);
    }
  }));
