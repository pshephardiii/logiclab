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
import {
  savedStudentAttemptSchema,
  savedStudentAnswersSchema,
} from '@logiclab/contracts/saved-student-work';
import { studentAttemptSchema } from '@logiclab/contracts';
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
  graded = false,
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
  // Internal fixture isolates draft behavior from assignment authoring.
  const assignment = em.create(db.Assignment, {
    classroom,
    title: 'Proof practice fixture',
    assessmentMode: graded ? db.AssessmentMode.Graded : db.AssessmentMode.UngradedPractice,
    feedbackTiming: graded ? db.FeedbackTiming.OnSubmission : db.FeedbackTiming.OnCheck,
    solutionAccess: graded ? db.SolutionAccess.InstructorRelease : db.SolutionAccess.Never,
    gradeReleaseTiming: graded
      ? db.GradeReleaseTiming.InstructorRelease
      : db.GradeReleaseTiming.OnSubmission,
  });
  const version = em.getReference(db.ProblemVersion, published.version.id);
  const first = em.create(db.AssignmentItem, {
    assignment,
    problemVersion: version,
    position: 1,
    maxPoints: 20,
  });
  const second = em.create(db.AssignmentItem, {
    assignment,
    problemVersion: version,
    position: 2,
    maxPoints: 10,
  });
  let objective;
  if (graded) {
    const conceptual = await problems.create(owner.id, {
      title: 'Objective companion',
      definition: {
        type: 'true_false',
        definitionVersion: 1,
        question: 'P implies P.',
        correctAnswer: true,
      },
    });
    const snapshot = await problems.publish(owner.id, conceptual.id);
    if (snapshot.status !== 'published') throw new Error('Fixture publication failed');
    objective = em.create(db.AssignmentItem, {
      assignment,
      position: 3,
      maxPoints: 5,
      problemVersion: em.getReference(db.ProblemVersion, snapshot.version.id),
    });
    em.persist(objective);
  }
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
    objective,
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

test('proof draft saves reject foreign access, stale revisions, mismatched response types and unsupported proof feedback policies atomically', async () =>
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
    for (const mode of [db.AssessmentMode.CompletionOnly]) {
      await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, {
        assessmentMode: mode,
        feedbackTiming: db.FeedbackTiming.OnCheck,
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
    const checked = await runtime.run(one.sessionId, false, (actor) =>
      runtime.context.studentWork.check(actor.id, assignment.id, {
        itemId: item.id,
        answers: { type: 'derivation', proof: derivationDefinitionFixture().referenceProof! },
      }),
    );
    assert('type' in checked.feedback && checked.feedback.type === 'derivation');
    assert.equal(checked.feedback.report.status, 'accepted');
    await assert.rejects(
      runtime.run(two.sessionId, false, (actor) =>
        runtime.context.studentWork.check(actor.id, assignment.id, {
          itemId: item.id,
          answers: answer(),
        }),
      ),
      failure('not_found'),
    );
    await orm.em
      .fork()
      .nativeUpdate(db.Assignment, assignment.id, { solutionAccess: db.SolutionAccess.Anytime });
    const reference = await runtime.run(one.sessionId, false, (actor) =>
      runtime.context.studentWork.solution(actor.id, assignment.id, item.id),
    );
    assert('type' in reference.solution && reference.solution.type === 'derivation');
    await assert.rejects(
      runtime.run(two.sessionId, false, (actor) =>
        runtime.context.studentWork.solution(actor.id, assignment.id, item.id),
      ),
      failure('not_found'),
    );

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

    const graded = em.create(db.Assignment, {
      classroom,
      title: 'Demo staged proof final',
      assessmentMode: db.AssessmentMode.Graded,
      feedbackTiming: db.FeedbackTiming.OnSubmission,
    });
    const gradedItem = em.create(db.AssignmentItem, {
      assignment: graded,
      position: 1,
      maxPoints: 20,
      problemVersion: em.getReference(db.ProblemVersion, published.version.id),
    });
    em.persist([graded, gradedItem]);
    await em.flush();
    graded.publishedAt = new Date();
    await em.flush();
    const draft = await runtime.run(one.sessionId, true, (actor) =>
      runtime.context.studentWork.save(actor.id, graded.id, {
        revision: 0,
        itemId: gradedItem.id,
        answers: validProofAnswer(),
      }),
    );
    await assert.rejects(
      runtime.run(two.sessionId, true, (actor) =>
        runtime.context.studentWork.submit(actor.id, graded.id, 0),
      ),
      failure('not_found'),
    );
    await assert.rejects(
      runtime.run(one.sessionId, true, async (actor) => {
        await runtime.context.studentWork.submit(actor.id, graded.id, draft.revision);
        throw new Error('ROLLBACK_DEMO_PROOF_FINAL');
      }),
      /ROLLBACK_DEMO_PROOF_FINAL/,
    );
    const rolledBack = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, draft.id);
    assert.equal(rolledBack.submittedAt, null);
    assert.equal(rolledBack.result, null);
    assert.equal(rolledBack.score, null);
    assert.equal(rolledBack.revision, draft.revision);
    const final = await runtime.run(one.sessionId, true, (actor) =>
      runtime.context.studentWork.submit(actor.id, graded.id, draft.revision),
    );
    assert.equal(final.score!.summary.earnedPoints, 20);
    assert.equal(final.result?.gradingVersion, 'proof_mixed_v1');
    assert.deepEqual(
      await runtime.run(one.sessionId, true, (actor) =>
        runtime.context.studentWork.submit(actor.id, graded.id, 0),
      ),
      final,
    );
  }));

for (const operation of ['save', 'submit'] as const) {
  test(`proof ${operation} waits for assignment/enrollment locks and rechecks archive/removal before writing`, async () =>
    fixture(async (orm, db) => {
      const f = await seed(orm, db, operation === 'submit');
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
        pending =
          operation === 'submit'
            ? f.store.submit(f.student.id, f.assignment.id, 0)
            : f.store.save(f.student.id, f.assignment.id, {
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
        pending =
          operation === 'submit'
            ? f.store.submit(f.other.id, f.assignment.id, 0)
            : f.store.save(f.other.id, f.assignment.id, {
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
}

test('practice proof checks use pinned content and unsaved answers without creating or changing attempts', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db);
    const valid = {
      type: 'derivation' as const,
      proof: derivationDefinitionFixture().referenceProof!,
    };
    const checked = await f.store.check(f.student.id, f.assignment.id, {
      itemId: f.first.id,
      answers: valid,
    });
    assert('type' in checked.feedback && checked.feedback.type === 'derivation');
    assert.equal(checked.feedback.report.status, 'accepted');
    assert(!JSON.stringify(checked).includes('referenceProof'));
    assert(!JSON.stringify(checked).includes('explanation'));
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 0);
    const repeated = await f.store.check(f.student.id, f.assignment.id, {
      itemId: f.second.id,
      answers: valid,
    });
    assert.equal(repeated.itemId, f.second.id);
    assert.deepEqual(repeated.feedback, checked.feedback);
    const saved = await f.store.save(f.student.id, f.assignment.id, {
      revision: 0,
      itemId: f.first.id,
      answers: answer(),
    });
    const before = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, saved.id);
    const snapshot = {
      answers: structuredClone(before.answers),
      revision: before.revision,
      updatedAt: before.updatedAt.toISOString(),
      result: before.result,
      score: before.score,
    };
    await f.problems.update(f.owner.id, f.problem.id, {
      definition: {
        ...derivationDefinitionFixture(),
        conclusion: 'Q',
        referenceProof: null,
        explanation: 'NEW_PRIVATE_REFERENCE',
      },
    });
    const afterEdit = await f.store.check(f.student.id, f.assignment.id, {
      itemId: f.first.id,
      answers: valid,
    });
    assert.deepEqual(afterEdit.feedback, checked.feedback);
    const row = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, saved.id);
    assert.deepEqual(
      {
        answers: row.answers,
        revision: row.revision,
        updatedAt: row.updatedAt.toISOString(),
        result: row.result,
        score: row.score,
      },
      snapshot,
    );
    assert.deepEqual(
      (await f.store.read(f.student.id, f.assignment.id)).attempt!.answers[f.first.id],
      answer(),
    );
    const incomplete = await f.store.check(f.student.id, f.assignment.id, {
      itemId: f.first.id,
      answers: answer(),
    });
    assert('type' in incomplete.feedback && incomplete.feedback.type === 'derivation');
    assert.notEqual(incomplete.feedback.report.status, 'accepted');
  }));

test('reference access is independent from checking and returns only an authorized pinned proof/explanation', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db);
    await assert.rejects(
      f.store.solution(f.student.id, f.assignment.id, f.first.id),
      failure('solution_locked'),
    );
    await orm.em
      .fork()
      .nativeUpdate(db.Assignment, f.assignment.id, { solutionAccess: db.SolutionAccess.Anytime });
    const solution = await f.store.solution(f.student.id, f.assignment.id, f.first.id);
    assert.equal(solution.itemId, f.first.id);
    assert('type' in solution.solution && solution.solution.type === 'derivation');
    assert.deepEqual(
      solution.solution.referenceProof,
      derivationDefinitionFixture().referenceProof,
    );
    assert.equal(solution.solution.explanation, derivationDefinitionFixture().explanation);
    assert(!('report' in solution.solution));
    assert(!('rules' in solution.solution));
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 0);
    await f.problems.update(f.owner.id, f.problem.id, {
      definition: {
        ...derivationDefinitionFixture(),
        conclusion: 'Q',
        referenceProof: null,
        explanation: 'DIFFERENT_PRIVATE_KEY',
      },
    });
    assert.deepEqual(await f.store.solution(f.student.id, f.assignment.id, f.first.id), solution);
    await orm.em
      .fork()
      .nativeUpdate(db.Assignment, f.assignment.id, { solutionAccess: db.SolutionAccess.Never });
    await assert.rejects(
      f.store.solution(f.student.id, f.assignment.id, f.first.id),
      failure('solution_locked'),
    );
    const check = await f.store.check(f.student.id, f.assignment.id, {
      itemId: f.first.id,
      answers: { type: 'derivation', proof: derivationDefinitionFixture().referenceProof! },
    });
    assert('type' in check.feedback && check.feedback.type === 'derivation');
    assert.equal(check.feedback.report.status, 'accepted');
  }));

test('proof checking/reference access enforce ownership, graded feedback locks and completion policy', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db);
    await orm.em
      .fork()
      .nativeUpdate(db.Assignment, f.assignment.id, { solutionAccess: db.SolutionAccess.Anytime });
    await assert.rejects(
      f.store.check(f.outsider.id, f.assignment.id, { itemId: f.first.id, answers: answer() }),
      failure('not_found'),
    );
    await assert.rejects(
      f.store.solution(f.outsider.id, f.assignment.id, f.first.id),
      failure('not_found'),
    );
    const em = orm.em.fork();
    const parent = em.create(db.Assignment, {
      classroom: em.getReference(db.Classroom, f.classroom.id),
      title: 'Other staged practice',
      assessmentMode: db.AssessmentMode.UngradedPractice,
      feedbackTiming: db.FeedbackTiming.OnCheck,
      solutionAccess: db.SolutionAccess.Anytime,
    });
    const ownItem = await em.findOneOrFail(db.AssignmentItem, f.first.id);
    const foreign = em.create(db.AssignmentItem, {
      assignment: parent,
      position: 1,
      problemVersion: ownItem.problemVersion,
    });
    em.persist([parent, foreign]);
    await em.flush();
    await assert.rejects(
      f.store.check(f.student.id, f.assignment.id, { itemId: foreign.id, answers: answer() }),
      failure('not_found'),
    );
    await assert.rejects(
      f.store.solution(f.student.id, f.assignment.id, foreign.id),
      failure('not_found'),
    );
    await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, { archivedAt: new Date() });
    await assert.rejects(
      f.store.check(f.student.id, f.assignment.id, { itemId: f.first.id, answers: answer() }),
      failure('not_found'),
    );
    await assert.rejects(
      f.store.solution(f.student.id, f.assignment.id, f.first.id),
      failure('not_found'),
    );
    await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, {
      archivedAt: null,
      assessmentMode: db.AssessmentMode.Graded,
      feedbackTiming: db.FeedbackTiming.OnSubmission,
    });
    await assert.rejects(
      f.store.check(f.student.id, f.assignment.id, { itemId: f.first.id, answers: answer() }),
      failure('check_locked'),
    );
    const revealed = (await f.store.solution(f.student.id, f.assignment.id, f.first.id)).solution;
    assert('type' in revealed && revealed.type === 'derivation');
    await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, {
      assessmentMode: db.AssessmentMode.CompletionOnly,
      feedbackTiming: db.FeedbackTiming.OnCheck,
    });
    await assert.rejects(
      f.store.check(f.student.id, f.assignment.id, { itemId: f.first.id, answers: answer() }),
      failure('unsupported_policy'),
    );
    await assert.rejects(
      f.store.solution(f.student.id, f.assignment.id, f.first.id),
      failure('unsupported_policy'),
    );
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 0);
  }));

const validProofAnswer = () => ({
  type: 'derivation' as const,
  proof: derivationDefinitionFixture().referenceProof!,
});
async function saveGradedWork(f: Awaited<ReturnType<typeof seed>>, incomplete = false) {
  let revision = 0;
  for (const [itemId, answers] of [
    [f.first.id, validProofAnswer()],
    [f.second.id, incomplete ? answer() : validProofAnswer()],
    [f.objective!.id, { type: 'true_false' as const, answer: true }],
  ] as const) {
    const saved = await f.store.save(
      f.student.id,
      f.assignment.id,
      savedStudentAnswersSchema.parse({ revision, itemId, answers }),
    );
    revision = saved.revision;
    assert.equal(saved.result, null);
    assert.equal(saved.score, null);
  }
  return revision;
}

for (const incomplete of [false, true]) {
  test(`staged mixed proof finalization freezes ${incomplete ? 'pending review' : 'full credit'} independently from grade release and answer reveal`, async () =>
    fixture(async (orm, db) => {
      const f = await seed(orm, db, true);
      const revision = await saveGradedWork(f, incomplete);
      // Later mutable authoring must not change the pinned conclusion/reference used for evaluation.
      await f.problems.update(f.owner.id, f.problem.id, {
        definition: {
          ...derivationDefinitionFixture(),
          conclusion: 'Q',
          referenceProof: null,
          explanation: 'PRIVATE_NEW_REFERENCE',
        },
      });
      const receipt = await f.store.submit(f.student.id, f.assignment.id, revision);
      assert.equal(receipt.revision, revision + 1);
      assert.equal(receipt.result, null);
      assert.equal(receipt.score, null);
      assert.equal(receipt.gradePending, true);
      assert(savedStudentAttemptSchema.safeParse(receipt).success);
      assert(!studentAttemptSchema.safeParse(receipt).success);
      const retained = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, receipt.id);
      assert.equal(retained.result?.gradingVersion, 'proof_mixed_v1');
      if (retained.result?.gradingVersion !== 'proof_mixed_v1')
        assert.fail('Expected proof evidence');
      assert.equal(retained.result.summary.proofs.accepted, incomplete ? 1 : 2);
      assert.equal(retained.result.summary.proofs.needsReview, incomplete ? 1 : 0);
      assert.equal(retained.result.summary.objective.correct, 1);
      assert.equal(retained.score!.summary.maxPoints, 35);
      assert.equal(retained.score!.summary.earnedPoints, incomplete ? null : 35);
      assert.equal(retained.score!.summary.status, incomplete ? 'needs_review' : 'graded');
      for (const item of retained.result.items) {
        if (item.type === 'derivation')
          assert.equal(item.problemVersionId, f.first.problemVersion.id);
      }
      const frozen = JSON.stringify({
        result: retained.result,
        score: retained.score,
        answers: retained.answers,
        revision: retained.revision,
        submittedAt: retained.submittedAt,
        updatedAt: retained.updatedAt,
      });
      assert(!frozen.includes('referenceProof'));
      assert(!frozen.includes('PRIVATE_NEW_REFERENCE'));
      // Neither a stale retry nor independent answer reveal may recompute or release the grade.
      assert.deepEqual(await f.store.submit(f.student.id, f.assignment.id, 0), receipt);
      await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, {
        answersRevealedAt: new Date(),
        answersRevealedBy: f.owner.id,
      });
      assert.deepEqual((await f.store.read(f.student.id, f.assignment.id)).attempt, receipt);
      await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, {
        gradesReleasedAt: new Date(),
        gradesReleasedBy: f.owner.id,
      });
      const released = (await f.store.read(f.student.id, f.assignment.id)).attempt!;
      assert.equal(released.gradePending, false);
      assert.deepEqual(released.result, retained.result);
      assert.deepEqual(released.score, retained.score);
      assert.deepEqual(await f.store.submit(f.student.id, f.assignment.id, 0), released);
      await assert.rejects(
        f.store.save(f.student.id, f.assignment.id, {
          revision: released.revision,
          itemId: f.first.id,
          answers: answer(),
        }),
        failure('submitted'),
      );
      const after = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, receipt.id);
      assert.equal(
        JSON.stringify({
          result: after.result,
          score: after.score,
          answers: after.answers,
          revision: after.revision,
          submittedAt: after.submittedAt,
          updatedAt: after.updatedAt,
        }),
        frozen,
      );
    }));
}

test('missing proof work is retained as review-needed evidence rather than zero credit; submission-time release preserves pending totals', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db, true);
    await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, {
      gradeReleaseTiming: db.GradeReleaseTiming.OnSubmission,
    });
    const final = await f.store.submit(f.student.id, f.assignment.id, 0);
    assert.equal(final.gradePending, false);
    assert.equal(final.result?.gradingVersion, 'proof_mixed_v1');
    if (final.result?.gradingVersion !== 'proof_mixed_v1') assert.fail('Expected proof evidence');
    assert.equal(final.result.summary.proofs.needsReview, 2);
    assert.equal(final.result.summary.objective.unanswered, 1);
    assert.deepEqual(final.answers, {});
    assert.equal(final.score!.summary.status, 'needs_review');
    assert.equal(final.score!.summary.earnedPoints, null);
    assert.equal(final.score!.summary.percentage, null);
    assert.equal(final.revision, 1);
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 1);
  }));

test('proof finalization rejects stale revisions, foreign access, archives and unfinished completion work without partial writes', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db, true);
    const revision = await saveGradedWork(f);
    const before = (await f.store.read(f.student.id, f.assignment.id)).attempt!;
    await assert.rejects(
      f.store.submit(f.student.id, f.assignment.id, revision - 1),
      failure('revision_conflict'),
    );
    await assert.rejects(f.store.submit(f.outsider.id, f.assignment.id, 0), failure('not_found'));
    assert.deepEqual((await f.store.read(f.student.id, f.assignment.id)).attempt, before);
    await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, { archivedAt: new Date() });
    await assert.rejects(
      f.store.submit(f.student.id, f.assignment.id, revision),
      failure('not_found'),
    );
    await orm.em.fork().nativeUpdate(db.Assignment, f.assignment.id, {
      archivedAt: null,
      assessmentMode: db.AssessmentMode.CompletionOnly,
      gradeReleaseTiming: db.GradeReleaseTiming.OnSubmission,
    });
    await assert.rejects(
      f.store.submit(f.other.id, f.assignment.id, 0),
      failure('incomplete_work'),
    );
    const retained = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, before.id);
    assert.equal(retained.submittedAt, null);
    assert.equal(retained.result, null);
    assert.equal(retained.score, null);
    assert.equal(retained.revision, revision);
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 1);
  }));

test('proof submit retries serialize and a racing save either supplies the checked snapshot or is rejected', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db, true);
    const revision = await saveGradedWork(f);
    const [one, two] = await Promise.all([
      f.store.submit(f.student.id, f.assignment.id, revision),
      f.store.submit(f.student.id, f.assignment.id, revision),
    ]);
    assert.deepEqual(one, two);
    assert.equal(one.revision, revision + 1);
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, { student: f.student.id }), 1);
    const race = await Promise.allSettled([
      f.store.save(f.other.id, f.assignment.id, {
        revision: 0,
        itemId: f.first.id,
        answers: validProofAnswer(),
      }),
      f.store.submit(f.other.id, f.assignment.id, 0),
    ]);
    const rejected = race.find((entry) => entry.status === 'rejected');
    assert(rejected?.status === 'rejected');
    const row = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, { student: f.other.id });
    if (race[0]!.status === 'fulfilled') {
      assert(failure('revision_conflict')(rejected.reason));
      assert.equal(row.submittedAt, null);
      assert.equal(row.result, null);
      assert.equal(row.revision, 1);
      const final = await f.store.submit(f.other.id, f.assignment.id, 1);
      assert(final.submittedAt);
    } else {
      assert(failure('submitted')(rejected.reason));
      assert(row.submittedAt);
      assert.deepEqual(row.answers, {});
      assert.equal(row.revision, 1);
    }
  }));

test('caller rollback and failed final writes leave proof evidence, points, revisions and timestamps untouched', async () =>
  fixture(async (orm, db) => {
    const f = await seed(orm, db, true);
    const revision = await saveGradedWork(f);
    const before = await orm.em
      .fork()
      .findOneOrFail(db.AssignmentAttempt, { student: f.student.id });
    const snapshot = JSON.stringify({
      answers: before.answers,
      result: before.result,
      score: before.score,
      revision: before.revision,
      submittedAt: before.submittedAt,
      updatedAt: before.updatedAt,
    });
    await assert.rejects(
      orm.em.fork().transactional(async (em) => {
        const store = await createStudentWorkStore(orm, em);
        await store.submit(f.student.id, f.assignment.id, revision);
        throw new Error('ROLLBACK_PROOF_FINAL');
      }),
      /ROLLBACK_PROOF_FINAL/,
    );
    // A database rejection after evidence/score computation must roll back the whole write.
    const schema = orm.config.get('schema');
    await orm.em.execute(
      `alter table "${schema}".assignment_attempts add constraint reject_proof_final_for_test check (submitted_at is null)`,
    );
    await assert.rejects(
      f.store.submit(f.student.id, f.assignment.id, revision),
      /reject_proof_final_for_test/,
    );
    await orm.em.execute(
      `alter table "${schema}".assignment_attempts drop constraint reject_proof_final_for_test`,
    );
    const after = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, before.id);
    assert.equal(
      JSON.stringify({
        answers: after.answers,
        result: after.result,
        score: after.score,
        revision: after.revision,
        submittedAt: after.submittedAt,
        updatedAt: after.updatedAt,
      }),
      snapshot,
    );
    await assert.rejects(
      orm.em.fork().transactional(async (em) => {
        const store = await createStudentWorkStore(orm, em);
        await store.submit(f.other.id, f.assignment.id, 0);
        throw new Error('ROLLBACK_NEW_PROOF_FINAL');
      }),
      /ROLLBACK_NEW_PROOF_FINAL/,
    );
    assert.equal(await orm.em.fork().count(db.AssignmentAttempt, { student: f.other.id }), 0);
    assert((await f.store.submit(f.student.id, f.assignment.id, revision)).submittedAt);
  }));
