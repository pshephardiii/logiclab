import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { assignmentResponseSchema } from '@logiclab/contracts';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

async function fixture() {
  const db = await import('@logiclab/db');
  const schema = `duplicate_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(databaseUrl!, { schema, snapshotOnMigrate: false });
  await orm.schema.create();
  const em = orm.em.fork();
  const owner = em.create(db.User, {
    cognitoUserPoolId: schema,
    cognitoSubject: 'owner',
    role: db.UserRole.Instructor,
  });
  const other = em.create(db.User, {
    cognitoUserPoolId: schema,
    cognitoSubject: 'other',
    role: db.UserRole.Instructor,
  });
  const student = em.create(db.User, {
    cognitoUserPoolId: schema,
    cognitoSubject: 'student',
    role: db.UserRole.Student,
  });
  const classroom = em.create(db.Classroom, { name: 'Source class', owner });
  const problem = em.create(db.Problem, {
    owner,
    title: 'Original problem',
    definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
  });
  const version = em.create(db.ProblemVersion, {
    problem,
    version: 1,
    title: problem.title,
    definition: problem.definition,
  });
  const second = em.create(db.ProblemVersion, {
    problem,
    version: 2,
    title: 'Another snapshot',
    definition: { ...problem.definition, formula: 'Q' },
  });
  em.persist([
    owner,
    other,
    student,
    classroom,
    problem,
    version,
    second,
    em.create(db.Enrollment, { classroom, student }),
  ]);
  await em.flush();
  const store = await createAssignmentStore(orm);
  async function source() {
    return store.create(owner.id, classroom.id, {
      title: 'Saved work',
      instructions: 'Keep these instructions',
      problemVersionIds: [version.id, second.id, version.id],
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
      solutionAccess: 'after_submission',
    });
  }
  async function close() {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
  return { db, orm, em, schema, store, owner, other, student, classroom, version, source, close };
}

test('duplicates draft, published and archived saved assignments with fresh IDs and no student work', async () => {
  const f = await fixture();
  try {
    const source = await f.source();
    for (const status of ['draft', 'published', 'archived'] as const) {
      if (status === 'published') {
        // Fixture publication deliberately bypasses coverage to test duplication without entitlements.
        await f.em.nativeUpdate(f.db.Assignment, source.id, { publishedAt: new Date() });
        const work = await createStudentWorkStore(f.orm);
        await work.submit(f.student.id, source.id, 0);
      }
      if (status === 'archived') await f.store.setArchived(f.owner.id, source.id, true);
      const before = await f.store.findOwned(f.owner.id, source.id);
      const attempts = JSON.stringify(await f.orm.em.fork().find(f.db.AssignmentAttempt, {}));
      const copy = await f.store.duplicate(f.owner.id, source.id);
      assignmentResponseSchema.parse({ assignment: copy });
      assert.notEqual(copy.id, source.id);
      assert.equal(copy.classId, source.classId);
      assert.equal(copy.title, 'Copy of Saved work');
      assert.equal(copy.instructions, source.instructions);
      assert.equal(copy.assessmentMode, source.assessmentMode);
      assert.equal(copy.feedbackTiming, source.feedbackTiming);
      assert.equal(copy.solutionAccess, source.solutionAccess);
      assert.equal(copy.publishedAt, null);
      assert.equal(copy.archivedAt, null);
      assert.deepEqual(
        copy.items.map((item) => item.position),
        [1, 2, 3],
      );
      assert.deepEqual(
        copy.items.map((item) => item.problemVersion),
        source.items.map((item) => item.problemVersion),
      );
      assert(copy.items.every((item) => !source.items.some((original) => original.id === item.id)));
      assert.equal(new Set(copy.items.map((item) => item.id)).size, 3);
      assert.equal(await f.em.count(f.db.AssignmentAttempt, { assignment: copy.id }), 0);
      assert.equal(
        JSON.stringify(await f.orm.em.fork().find(f.db.AssignmentAttempt, {})),
        attempts,
      );
      assert.deepEqual(await f.store.findOwned(f.owner.id, source.id), before);
      assert.equal(await f.em.count(f.db.ClassPurchase, {}), 0);
      assert.equal(await f.em.count(f.db.ClassEntitlement, {}), 0);
      await assert.rejects(f.store.publish(f.owner.id, copy.id), /coverage_required/);
      await f.store.update(f.owner.id, copy.id, { title: 'Editable copy' });
      assert.equal((await f.store.findOwned(f.owner.id, source.id)).title, source.title);
    }
    const count = await f.em.count(f.db.Assignment, {});
    await assert.rejects(f.store.duplicate(f.other.id, source.id), /not_found/);
    await assert.rejects(f.store.duplicate(f.owner.id, randomUUID()), /not_found/);
    assert.equal(await f.em.count(f.db.Assignment, {}), count);
  } finally {
    await f.close();
  }
});

test('copies immediate policies, empty drafts and bounded Unicode titles without changing the source', async () => {
  const f = await fixture();
  try {
    for (const assessmentMode of ['completion_only', 'ungraded_practice'] as const) {
      const source = await f.store.create(f.owner.id, f.classroom.id, {
        title: 'A'.repeat(111) + '😀' + 'B'.repeat(7),
        instructions: null,
        problemVersionIds: [],
        assessmentMode,
        feedbackTiming: 'immediate',
        solutionAccess: 'anytime',
      });
      const copy = await f.store.duplicate(f.owner.id, source.id);
      assignmentResponseSchema.parse({ assignment: copy });
      assert.equal(copy.title, 'Copy of ' + 'A'.repeat(111));
      assert.equal(copy.instructions, null);
      assert.equal(copy.assessmentMode, assessmentMode);
      assert.equal(copy.feedbackTiming, 'immediate');
      assert.equal(copy.solutionAccess, 'anytime');
      assert.deepEqual(copy.items, []);
      await assert.rejects(f.store.publish(f.owner.id, copy.id), /empty/);
    }
  } finally {
    await f.close();
  }
});

test('duplication participates in the caller transaction and rolls back its entire draft', async () => {
  const f = await fixture();
  try {
    const source = await f.source();
    await assert.rejects(
      f.orm.em.fork().transactional(async (em) => {
        const scoped = await createAssignmentStore(f.orm, em);
        const copy = await scoped.duplicate(f.owner.id, source.id);
        assert.equal(copy.items.length, 3);
        throw new Error('Abort caller transaction');
      }),
      /Abort caller transaction/,
    );
    assert.equal(await f.em.count(f.db.Assignment, {}), 1);
    assert.equal(await f.em.count(f.db.AssignmentItem, {}), 3);
  } finally {
    await f.close();
  }
});

test(
  'duplication waits for source edits and copies their committed saved snapshot',
  { timeout: 15000 },
  async () => {
    const f = await fixture();
    const writer = f.orm.em.fork();
    let pending: ReturnType<typeof f.store.duplicate> | undefined;
    try {
      const source = await f.source();
      await writer.begin();
      await writer.findOneOrFail(f.db.Assignment, source.id, {
        lockMode: f.db.LockMode.PESSIMISTIC_WRITE,
      });
      pending = f.store.duplicate(f.owner.id, source.id);
      const deadline = Date.now() + 5000;
      let waiting = false;
      while (Date.now() < deadline) {
        const rows = await f.orm.em.fork().execute<{ count: number }[]>(
          `
        select count(*)::int as count
        from pg_stat_activity
        where datname = current_database()
          and wait_event_type = 'Lock'
          and query like ?
      `,
          ['%' + f.schema + '%'],
        );
        if (rows[0]!.count > 0) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert(waiting, 'Expected duplication to wait for the source parent lock.');
      await writer.nativeUpdate(f.db.Assignment, source.id, { title: 'Committed edit' });
      await writer.nativeDelete(f.db.AssignmentItem, { assignment: source.id });
      writer.persist(
        writer.create(f.db.AssignmentItem, {
          assignment: writer.getReference(f.db.Assignment, source.id),
          problemVersion: writer.getReference(f.db.ProblemVersion, f.version.id),
          position: 1,
        }),
      );
      await writer.flush();
      await writer.commit();
      const copy = await pending;
      assert.equal(copy.title, 'Copy of Committed edit');
      assert.equal(copy.items.length, 1);
      assert.equal(copy.items[0]!.problemVersion.id, f.version.id);
    } finally {
      if (writer.isInTransaction()) await writer.rollback();
      if (pending) await pending.catch(() => {});
      await f.close();
    }
  },
);
