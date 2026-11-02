import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { derivationDefinitionFixture } from '../derivation-fixture';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createSubmissionReviewStore } from '../../src/persistence/submission-review/store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { StudentWorkError } from '../../src/application/student-work/errors';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
async function fixture(
  work: (
    orm: Awaited<ReturnType<typeof createDatabase>>,
    db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
  ) => Promise<void>,
) {
  const db = await import('@logiclab/db');
  const schema = `proof_draft_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await work(orm, db);
  } finally {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}
function failure(reason: string) {
  return (error: unknown) => error instanceof StudentWorkError && error.reason === reason;
}
const answer = () => ({
  type: 'derivation' as const,
  proof: { ...derivationDefinitionFixture().referenceProof!, steps: [] },
});

async function seed(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
) {
  const em = orm.em.fork();
  const owner = em.create(db.User, {
    cognitoUserPoolId: 'proof-drafts',
    cognitoSubject: randomUUID(),
    role: db.UserRole.Instructor,
  });
  const student = em.create(db.User, {
    cognitoUserPoolId: 'proof-drafts',
    cognitoSubject: randomUUID(),
    role: db.UserRole.Student,
  });
  const other = em.create(db.User, {
    cognitoUserPoolId: 'proof-drafts',
    cognitoSubject: randomUUID(),
    role: db.UserRole.Student,
  });
  const outsider = em.create(db.User, {
    cognitoUserPoolId: 'proof-drafts',
    cognitoSubject: randomUUID(),
    role: db.UserRole.Student,
  });
  const classroom = em.create(db.Classroom, { owner, name: 'Staged proof practice' });
  em.persist([
    owner,
    student,
    other,
    outsider,
    classroom,
    em.create(db.Enrollment, { classroom, student }),
    em.create(db.Enrollment, { classroom, student: other }),
  ]);
  await em.flush();
  const problems = await createProblemStore(orm);
  const problem = await problems.create(owner.id, {
    title: 'Pinned proof',
    definition: derivationDefinitionFixture(),
  });
  const published = await problems.publish(owner.id, problem.id);
  if (published.status !== 'published') throw new Error('Fixture publication failed');
  // Internal staged assignment: live authoring/publication still rejects derivations.
  const assignment = em.create(db.Assignment, {
    classroom,
    title: 'Proof practice fixture',
    assessmentMode: db.AssessmentMode.UngradedPractice,
    feedbackTiming: db.FeedbackTiming.OnCheck,
    solutionAccess: db.SolutionAccess.Never,
  });
  const version = em.getReference(db.ProblemVersion, published.version.id);
  const first = em.create(db.AssignmentItem, { assignment, problemVersion: version, position: 1 });
  const second = em.create(db.AssignmentItem, { assignment, problemVersion: version, position: 2 });
  em.persist([assignment, first, second]);
  await em.flush();
  assignment.publishedAt = new Date();
  await em.flush();
  return {
    owner,
    student,
    other,
    outsider,
    classroom,
    assignment,
    first,
    second,
    problem,
    problems,
    store: await createStudentWorkStore(orm),
  };
}

test('staged proof drafts retain invalid/incomplete work, pin content and keep private references out of student/instructor draft views', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db);
    const read = await f.store.read(f.student.id, f.assignment.id);
    assert.equal(read.attempt, null);
    assert(!JSON.stringify(read).includes('referenceProof'));
    assert(!JSON.stringify(read).includes('Assuming P permits'));
    const work = answer();
    const saved = await f.store.save(f.student.id, f.assignment.id, {
      revision: 0,
      itemId: f.first.id,
      answers: work,
    });
    assert.equal(saved.revision, 1);
    assert.deepEqual(saved.answers[f.first.id], work);
    assert.equal(saved.result, null);
    assert.equal(saved.submittedAt, null);
    assert.equal(saved.score, undefined);
    const twice = await f.store.save(f.student.id, f.assignment.id, {
      revision: 1,
      itemId: f.second.id,
      answers: {
        type: 'derivation',
        proof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
      },
    });
    assert.deepEqual(twice.answers[f.first.id], work);
    assert.equal(twice.revision, 2);
    const loaded = await f.store.read(f.student.id, f.assignment.id);
    assert.deepEqual(loaded.attempt, twice);
    assert.equal((await f.store.read(f.other.id, f.assignment.id)).attempt, null);
    await f.problems.update(f.owner.id, f.problem.id, {
      definition: {
        ...derivationDefinitionFixture(),
        conclusion: 'Q',
        explanation: 'NEW_PRIVATE_EXPLANATION',
      },
    });
    assert(
      !JSON.stringify(await f.store.read(f.student.id, f.assignment.id)).includes(
        'NEW_PRIVATE_EXPLANATION',
      ),
    );
    assert.deepEqual(
      (await f.store.read(f.student.id, f.assignment.id)).assignment.items,
      read.assignment.items,
    );
    const review = await createSubmissionReviewStore(orm);
    await assert.rejects(
      review.listSubmissions(f.owner.id, f.assignment.id, { limit: 20, offset: 0 }),
      /not_found/,
    );
    await assert.rejects(
      f.store.submit(f.student.id, f.assignment.id, 2),
      failure('submission_unavailable'),
    );
  }));

test('proof draft saves reject foreign access, stale revisions, mismatched response types and unsupported modes atomically', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db);
    await assert.rejects(
      f.store.save(f.outsider.id, f.assignment.id, {
        revision: 0,
        itemId: f.first.id,
        answers: answer(),
      }),
      failure('not_found'),
    );
    await assert.rejects(
      f.store.save(f.student.id, f.assignment.id, {
        revision: 0,
        itemId: randomUUID(),
        answers: answer(),
      }),
      failure('not_found'),
    );
    await assert.rejects(
      f.store.save(f.student.id, f.assignment.id, { revision: 0, itemId: f.first.id, answers: [] }),
      failure('invalid_answer'),
    );
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 0);
    const before = await f.store.save(f.student.id, f.assignment.id, {
      revision: 0,
      itemId: f.first.id,
      answers: answer(),
    });
    await assert.rejects(
      f.store.save(f.student.id, f.assignment.id, {
        revision: 0,
        itemId: f.first.id,
        answers: answer(),
      }),
      failure('revision_conflict'),
    );
    assert.deepEqual((await f.store.read(f.student.id, f.assignment.id)).attempt, before);
    for (const mode of [db.AssessmentMode.Graded, db.AssessmentMode.CompletionOnly]) {
      await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, {
        assessmentMode: mode,
        feedbackTiming: db.FeedbackTiming.OnSubmission,
      });
      await assert.rejects(
        f.store.save(f.other.id, f.assignment.id, {
          revision: 0,
          itemId: f.first.id,
          answers: answer(),
        }),
        failure('unsupported_policy'),
      );
      await assert.rejects(
        f.store.read(f.student.id, f.assignment.id),
        failure('unsupported_policy'),
      );
    }
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 1);
  }));

test('concurrent proof saves serialize revisions and caller transaction failures roll back the entire attempt', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db);
    const results = await Promise.allSettled([
      f.store.save(f.student.id, f.assignment.id, {
        revision: 0,
        itemId: f.first.id,
        answers: answer(),
      }),
      f.store.save(f.student.id, f.assignment.id, {
        revision: 0,
        itemId: f.second.id,
        answers: answer(),
      }),
    ]);
    assert.equal(results.filter((value) => value.status === 'fulfilled').length, 1);
    const rejected = results.find((value) => value.status === 'rejected');
    assert(rejected?.status === 'rejected' && failure('revision_conflict')(rejected.reason));
    const attempt = (await f.store.read(f.student.id, f.assignment.id)).attempt!;
    assert.equal(attempt.revision, 1);
    assert.equal(Object.keys(attempt.answers).length, 1);
    await assert.rejects(
      orm.em.fork().transactional(async (em) => {
        const store = await createStudentWorkStore(orm, em);
        await store.save(f.other.id, f.assignment.id, {
          revision: 0,
          itemId: f.first.id,
          answers: answer(),
        });
        throw new Error('ROLLBACK_PROOF_SAVE');
      }),
      /ROLLBACK_PROOF_SAVE/,
    );
    assert.equal((await f.store.read(f.other.id, f.assignment.id)).attempt, null);
  }));

test('demo proof drafts use workspace transaction binding and reject cross-visitor access', async () =>
  fixture(async (orm, db) => {
    const runtime = await createDemoRuntime(
      orm,
      readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173' })!,
    );
    const first = await runtime.workspaces.provision();
    const second = await runtime.workspaces.provision();
    const one = await runtime.sessions.issue(first.workspaceId, 'student');
    const two = await runtime.sessions.issue(second.workspaceId, 'student');
    const em = orm.em.fork();
    const instructor = await em.findOneOrFail(db.User, {
      demoWorkspace: first.workspaceId,
      role: db.UserRole.Instructor,
    });
    const classroom = await em.findOneOrFail(db.Classroom, {
      owner: instructor.id,
      name: 'Demo: Introduction to Logic',
    });
    const ownerStore = await createProblemStore(orm);
    const problem = await ownerStore.create(instructor.id, {
      title: 'Demo staged proof',
      definition: derivationDefinitionFixture(),
    });
    const published = await ownerStore.publish(instructor.id, problem.id);
    if (published.status !== 'published') throw new Error('Fixture publication failed');
    const assignment = em.create(db.Assignment, {
      classroom,
      title: 'Demo staged proof practice',
      assessmentMode: db.AssessmentMode.UngradedPractice,
      feedbackTiming: db.FeedbackTiming.OnCheck,
      solutionAccess: db.SolutionAccess.Never,
    });
    const item = em.create(db.AssignmentItem, {
      assignment,
      position: 1,
      problemVersion: em.getReference(db.ProblemVersion, published.version.id),
    });
    em.persist([assignment, item]);
    await em.flush();
    assignment.publishedAt = new Date();
    await em.flush();
    const saved = await runtime.run(one.sessionId, true, (actor) =>
      runtime.context.studentWork.save(actor.id, assignment.id, {
        revision: 0,
        itemId: item.id,
        answers: answer(),
      }),
    );
    assert.equal(saved.revision, 1);
    await assert.rejects(
      runtime.run(two.sessionId, true, (actor) =>
        runtime.context.studentWork.save(actor.id, assignment.id, {
          revision: 0,
          itemId: item.id,
          answers: answer(),
        }),
      ),
      failure('not_found'),
    );
    await assert.rejects(
      runtime.run(one.sessionId, true, async (actor) => {
        await runtime.context.studentWork.save(actor.id, assignment.id, {
          revision: 1,
          itemId: item.id,
          answers: {
            type: 'derivation',
            proof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
          },
        });
        throw new Error('ROLLBACK_DEMO_PROOF');
      }),
      /ROLLBACK_DEMO_PROOF/,
    );
    assert.equal(
      (
        await runtime.run(one.sessionId, false, (actor) =>
          runtime.context.studentWork.read(actor.id, assignment.id),
        )
      ).attempt!.revision,
      1,
    );
  }));

test('proof saves wait for assignment/enrollment locks and recheck archive/removal before writing', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db);
    const schema = orm.config.get('schema');
    async function waitForLock() {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const rows = await orm.em
          .getConnection()
          .execute<{ count: number }[]>(
            "select count(*)::int as count from pg_stat_activity where wait_event_type = 'Lock' and query like ?",
            [`%${schema}%`],
          );
        if (rows[0]!.count > 0) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.fail('Expected a real database lock wait');
    }
    let pending: Promise<unknown> | undefined;
    await orm.em.fork().transactional(async (em) => {
      const assignment = await em.findOneOrFail(db.Assignment, f.assignment.id, {
        lockMode: db.LockMode.PESSIMISTIC_WRITE,
      });
      pending = f.store.save(f.student.id, f.assignment.id, {
        revision: 0,
        itemId: f.first.id,
        answers: answer(),
      });
      void pending.catch(() => {});
      await waitForLock();
      assignment.archivedAt = new Date();
      await em.flush();
    });
    assert(pending);
    await assert.rejects(pending, failure('not_found'));
    await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, { archivedAt: null });
    await orm.em.fork().transactional(async (em) => {
      const enrollment = await em.findOneOrFail(
        db.Enrollment,
        { classroom: f.classroom.id, student: f.other.id },
        { lockMode: db.LockMode.PESSIMISTIC_WRITE },
      );
      pending = f.store.save(f.other.id, f.assignment.id, {
        revision: 0,
        itemId: f.second.id,
        answers: answer(),
      });
      void pending.catch(() => {});
      await waitForLock();
      em.remove(enrollment);
      await em.flush();
    });
    assert(pending);
    await assert.rejects(pending, failure('not_found'));
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 0);
  }));
