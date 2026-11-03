import { calculateSubmissionResult } from '../../src/persistence/student-work/submission-result';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { buildApp } from '../../src/app';
import { readAuthConfig } from '../../src/config/auth';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createSubmissionReviewStore } from '../../src/persistence/submission-review/store';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSubmissionGradingStore } from '../../src/persistence/submission-review/grading-store';
import { evaluateProofSubmission } from '../../src/application/student-work/proof-submission';
import { scoreProofSubmission } from '../../src/application/assignment/proof-scoring';
import { derivationDefinitionFixture } from '../derivation-fixture';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { createDemoAccess } from '../../src/persistence/demo/access';
import { demoSessionHash } from '../../src/application/demo/service';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
async function fixture(demo = false) {
  const db = await import('@logiclab/db');
  const schema = `grading_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  await orm.schema.create();
  try {
    const em = orm.em.fork();
    const runtime = demo
      ? await createDemoRuntime(
          orm,
          readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173' })!,
        )
      : null;
    const workspace = runtime ? await runtime.workspaces.provision() : null;
    const owner = workspace
      ? await em.findOneOrFail(db.User, {
          demoWorkspace: workspace.workspaceId,
          role: db.UserRole.Instructor,
        })
      : em.create(db.User, {
          cognitoUserPoolId: schema,
          cognitoSubject: 'owner',
          role: db.UserRole.Instructor,
        });
    const student = workspace
      ? await em.findOneOrFail(db.User, {
          demoWorkspace: workspace.workspaceId,
          role: db.UserRole.Student,
        })
      : em.create(db.User, {
          cognitoUserPoolId: schema,
          cognitoSubject: 'student',
          role: db.UserRole.Student,
        });
    const other = em.create(db.User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'other',
      role: db.UserRole.Instructor,
    });
    const classroom = em.create(db.Classroom, { owner, name: 'Grading fixture' });
    const definition = derivationDefinitionFixture();
    const question = {
      type: 'true_false' as const,
      definitionVersion: 1 as const,
      question: 'Is this true?',
      correctAnswer: false,
    };
    const versions = [definition, question].map((content) => {
      const problem = em.create(db.Problem, {
        owner,
        title: 'Pinned grading work',
        definition: content,
      });
      const version = em.create(db.ProblemVersion, {
        problem,
        version: 1,
        title: problem.title,
        definition: content,
      });
      em.persist([problem, version]);
      return version;
    });
    // Staged graded proofs are inserted internally; public authoring remains guarded.
    const assignment = em.create(db.Assignment, {
      classroom,
      title: 'Staged mixed grading',
      publishedAt: new Date(),
      gradeReleaseTiming: db.GradeReleaseTiming.InstructorRelease,
    });
    const items = [versions[0]!, versions[0]!, versions[1]!].map((problemVersion, i) =>
      em.create(db.AssignmentItem, {
        assignment,
        problemVersion,
        position: i + 1,
        maxPoints: i === 0 ? 20 : 5,
      }),
    );
    const answers = {
      [items[0]!.id]: {
        type: 'derivation' as const,
        proof: { proofVersion: 1 as const, format: 'fitch' as const, steps: [], blocks: [] },
      },
      [items[1]!.id]: { type: 'derivation' as const, proof: definition.referenceProof! },
      [items[2]!.id]: { type: 'true_false' as const, answer: false },
    };
    const result = evaluateProofSubmission(
      items.map((item) => ({
        id: item.id,
        problemVersionId: item.problemVersion.id,
        definition: item.problemVersion.definition,
      })),
      answers,
    );
    const score = scoreProofSubmission(
      items.map((item) => ({ itemId: item.id, maxPoints: item.maxPoints })),
      result,
    );
    const attempt = em.create(db.AssignmentAttempt, {
      assignment,
      student,
      answers,
      result,
      score,
      submittedAt: new Date(),
      revision: 3,
    });
    const enrollment = em.create(db.Enrollment, { classroom, student });
    em.persist([owner, student, other, classroom, assignment, ...items, attempt, enrollment]);
    await em.flush();
    const store = await createSubmissionGradingStore(orm);
    const update = (
      revision: number,
      changes = [
        { itemId: items[0]!.id, earnedPoints: 12.25, comment: 'Check the missing justification.' },
      ],
    ) => store.update(owner.id, assignment.id, attempt.id, { revision, items: changes });
    return {
      db,
      orm,
      em,
      owner,
      student,
      other,
      assignment,
      attempt,
      items,
      store,
      update,
      runtime,
      workspace,
      close: async () => {
        await orm.em.execute(`drop schema if exists "${schema}" cascade`);
        await orm.close(true);
      },
    };
  } catch (error) {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
    throw error;
  }
}

test('grading appends corrections/comments and resolves mixed totals without changing frozen work or release metadata', async () => {
  const f = await fixture();
  try {
    const before = structuredClone({
      answers: f.attempt.answers,
      result: f.attempt.result,
      score: f.attempt.score,
      revision: f.attempt.revision,
      submittedAt: f.attempt.submittedAt,
    });
    assert.equal(
      (await f.store.read(f.owner.id, f.assignment.id, f.attempt.id)).grading.revision,
      0,
    );
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 0);
    const first = await f.update(0);
    assert.equal(first.score.summary.earnedPoints, 22.25);
    assert.equal(first.grading.revision, 1);
    assert.equal(first.grading.items[0]!.reviewedBy, f.owner.id);
    const second = await f.update(1, [
      { itemId: f.items[2]!.id, earnedPoints: 0, comment: 'Adjusted conceptual award.' },
    ]);
    assert.equal(second.score.summary.earnedPoints, 17.25);
    assert.equal(second.grading.items.length, 2);
    const commentOnly = await f.store.update(f.owner.id, f.assignment.id, f.attempt.id, {
      revision: 2,
      items: [{ itemId: f.items[0]!.id, earnedPoints: null, comment: 'Reopened for review.' }],
    });
    assert.equal(commentOnly.score.summary.status, 'needs_review');
    assert.equal(commentOnly.score.summary.earnedPoints, null);
    const page = await f.store.history(f.owner.id, f.assignment.id, f.attempt.id, {
      limit: 2,
      offset: 0,
    });
    assert.deepEqual(
      page.revisions.map((row) => row.grading.revision),
      [3, 2],
    );
    assert.equal(page.nextOffset, 2);
    const last = await f.store.history(f.owner.id, f.assignment.id, f.attempt.id, {
      limit: 1,
      offset: 2,
    });
    assert.equal(last.nextOffset, null);
    assert.equal(last.revisions[0]!.score.summary.earnedPoints, 22.25);
    assert.deepEqual(
      (await f.store.history(f.owner.id, f.assignment.id, f.attempt.id, { limit: 1, offset: 3 }))
        .revisions,
      [],
    );
    const retained = await f.em.fork().findOneOrFail(f.db.AssignmentAttempt, f.attempt.id);
    assert.deepEqual(
      {
        answers: retained.answers,
        result: retained.result,
        score: retained.score,
        revision: retained.revision,
        submittedAt: retained.submittedAt,
      },
      before,
    );
    const assignment = await f.em.fork().findOneOrFail(f.db.Assignment, f.assignment.id);
    assert.equal(assignment.gradesReleasedAt ?? null, null);
    assert.equal(assignment.answersRevealedAt ?? null, null);
  } finally {
    await f.close();
  }
});

test('grading rejects outsiders, drafts, unsupported modes, invalid awards and stale revisions without appending history', async () => {
  const f = await fixture();
  try {
    for (const id of [f.other.id, f.student.id, randomUUID()]) {
      await assert.rejects(f.store.read(id, f.assignment.id, f.attempt.id), /not_found/);
      await assert.rejects(
        f.store.update(id, f.assignment.id, f.attempt.id, {
          revision: 0,
          items: [{ itemId: f.items[0]!.id, earnedPoints: 1, comment: null }],
        }),
        /not_found/,
      );
      await assert.rejects(
        f.store.history(id, f.assignment.id, f.attempt.id, { limit: 1, offset: 0 }),
        /not_found/,
      );
    }
    await assert.rejects(f.store.read(f.owner.id, f.assignment.id, randomUUID()), /not_found/);
    for (const [itemId, earnedPoints] of [
      [randomUUID(), 1],
      [f.items[0]!.id, 20.01],
    ] as const)
      await assert.rejects(
        f.store.update(f.owner.id, f.assignment.id, f.attempt.id, {
          revision: 0,
          items: [{ itemId, earnedPoints, comment: null }],
        }),
        /invalid_grading/,
      );
    await assert.rejects(f.update(1), /revision_conflict/);
    const draft = f.em.create(f.db.AssignmentAttempt, {
      assignment: f.assignment,
      student: f.other,
    });
    f.em.persist(draft);
    await f.em.flush();
    await assert.rejects(f.store.read(f.owner.id, f.assignment.id, draft.id), /not_found/);
    await f.em.nativeUpdate(f.db.Assignment, f.assignment.id, {
      assessmentMode: f.db.AssessmentMode.CompletionOnly,
      gradeReleaseTiming: f.db.GradeReleaseTiming.OnSubmission,
    });
    await assert.rejects(f.update(0), /grading_unavailable/);
    await f.em.nativeUpdate(f.db.Assignment, f.assignment.id, {
      assessmentMode: f.db.AssessmentMode.Graded,
      archivedAt: new Date(),
    });
    await assert.rejects(f.update(0), /archived/);
    assert.equal(
      (await f.store.read(f.owner.id, f.assignment.id, f.attempt.id)).grading.revision,
      0,
    );
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 0);
  } finally {
    await f.close();
  }
});

test('racing revisions accept one writer and later corrections preserve both immutable snapshots', async () => {
  const f = await fixture();
  try {
    const results = await Promise.allSettled([f.update(0), f.update(0)]);
    assert.equal(results.filter((row) => row.status === 'fulfilled').length, 1);
    const rejected = results.find((row) => row.status === 'rejected');
    assert(rejected?.status === 'rejected');
    assert.match(String(rejected.reason), /revision_conflict/);
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 1);
    await f.update(1);
    assert.equal(
      (await f.store.read(f.owner.id, f.assignment.id, f.attempt.id)).grading.revision,
      2,
    );
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 2);
    await assert.rejects(
      f.em.nativeUpdate(f.db.SubmissionGradingRevision, {}, { changes: [] }),
      /immutable/,
    );
    await assert.rejects(f.em.nativeDelete(f.db.SubmissionGradingRevision, {}), /immutable/);
  } finally {
    await f.close();
  }
});

test('caller rollback and database insertion failure leave current grading and original submission unchanged', async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      f.orm.em.fork().transactional(async (em) => {
        const scoped = await createSubmissionGradingStore(f.orm, em);
        await scoped.update(f.owner.id, f.assignment.id, f.attempt.id, {
          revision: 0,
          items: [{ itemId: f.items[0]!.id, earnedPoints: 5, comment: null }],
        });
        assert.equal(
          (await scoped.read(f.owner.id, f.assignment.id, f.attempt.id)).grading.revision,
          1,
        );
        throw new Error('Caller rollback');
      }),
      /Caller rollback/,
    );
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 0);
    const table = `"${f.orm.config.get('schema')}".submission_grading_revisions`;
    await f.em.execute(
      `alter table ${table} add constraint fail_grading_test check (revision <> 1)`,
    );
    await assert.rejects(f.update(0), /fail_grading_test/);
    assert.equal(
      (await f.store.read(f.owner.id, f.assignment.id, f.attempt.id)).grading.revision,
      0,
    );
    await f.em.execute(`alter table ${table} drop constraint fail_grading_test`);
    await f.update(0);
    assert.equal(
      (await f.store.read(f.owner.id, f.assignment.id, f.attempt.id)).grading.revision,
      1,
    );
  } finally {
    await f.close();
  }
});

test('demo grading joins workspace rollback, denies cross-visitor access and is retained until reset', async () => {
  const f = await fixture(true);
  try {
    const runtime = f.runtime!;
    const session = await runtime.sessions.issue(f.workspace!.workspaceId, 'instructor');
    const otherWorkspace = await runtime.workspaces.provision();
    const otherSession = await runtime.sessions.issue(otherWorkspace.workspaceId, 'instructor');
    await assert.rejects(
      f.store.read(otherSession.actor.id, f.assignment.id, f.attempt.id),
      /not_found/,
    );
    await assert.rejects(
      (await createDemoAccess(f.orm)).withSession(
        demoSessionHash(session.sessionId),
        async (em) => {
          const scoped = await createSubmissionGradingStore(f.orm, em);
          await scoped.update(f.owner.id, f.assignment.id, f.attempt.id, {
            revision: 0,
            items: [{ itemId: f.items[0]!.id, earnedPoints: 10, comment: null }],
          });
          throw new Error('Workspace rollback');
        },
      ),
      /Workspace rollback/,
    );
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 0);
    await f.update(0);
    await assert.rejects(f.em.nativeDelete(f.db.SubmissionGradingRevision, {}), /immutable/);
    const otherBefore = await f.em.count(f.db.Assignment, {
      classroom: { owner: otherSession.actor.id },
    });
    await runtime.workspaces.reset(session.sessionId);
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 0);
    assert.equal(await f.em.count(f.db.AssignmentAttempt, { id: f.attempt.id }), 0);
    assert.equal(
      await f.em.count(f.db.Assignment, { classroom: { owner: otherSession.actor.id } }),
      otherBefore,
    );
  } finally {
    await f.close();
  }
});

test('grading waits for assignment archive and rechecks the locked state before appending', async () => {
  const f = await fixture();
  const lock = f.orm.em.fork();
  let pending: Promise<unknown> | undefined;
  try {
    await lock.begin();
    const [backend] = await lock.execute<{ pid: number }[]>('select pg_backend_pid() as pid');
    await lock.nativeUpdate(f.db.Assignment, f.assignment.id, { archivedAt: new Date() });
    pending = f.update(0).then(
      () => 'unexpected success',
      (error: unknown) => error,
    );
    let waiting = false;
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const [row] = await f.em.execute<{ waiting: boolean }[]>(
        'select exists (select 1 from pg_stat_activity where ? = any(pg_blocking_pids(pid))) as waiting',
        [backend!.pid],
      );
      if (row!.waiting) {
        waiting = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert(
      waiting,
      'Grading must wait for the assignment lock, not inspect an unlocked stale state.',
    );
    await lock.commit();
    assert.match(String(await pending), /archived/);
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 0);
  } finally {
    if (lock.isInTransaction()) await lock.rollback();
    await pending;
    await f.close();
  }
});

for (const demo of [false, true]) {
  test(`${demo ? 'demo' : 'normal'} owner HTTP grading is scoped, revisioned and independent from submission evidence/release`, async () => {
    const f = await fixture(demo);
    const origin = 'http://localhost:5173';
    let actor = f.owner;
    let credential = 'x'.repeat(43);
    const config = readAuthConfig({
      AUTH_ENABLED: 'true',
      AWS_REGION: 'us-east-1',
      COGNITO_USER_POOL_ID: 'us-east-1_test',
      COGNITO_CLIENT_ID: 'synthetic',
      COGNITO_CLIENT_SECRET: 'synthetic',
      AUTH_TOKEN_KEY: 'ab'.repeat(32),
      APP_ORIGIN: origin,
    })!;
    const auth = {
      config,
      service: {
        authenticate: async () => ({
          id: actor.id,
          subject: actor.cognitoSubject!,
          role: actor.role,
        }),
      },
    } as unknown as import('../../src/routes/auth/context').AuthContext;
    if (demo)
      credential = (await f.runtime!.sessions.issue(f.workspace!.workspaceId, 'instructor'))
        .sessionId;
    const app = buildApp(
      demo
        ? { demo: f.runtime! }
        : {
            studentWork: { ...auth, studentWork: await createStudentWorkStore(f.orm) },
            assignment: {
              ...auth,
              assignments: await createAssignmentStore(f.orm),
              submissionReviews: await createSubmissionReviewStore(f.orm),
              submissionGrading: f.store,
            },
          },
    );
    const path = `${demo ? '/api/demo/resources' : '/api'}/assignments/${f.assignment.id}/submissions/${f.attempt.id}/grading`;
    const headers = () => ({
      origin,
      cookie: `${demo ? 'logiclab_demo' : 'logiclab_session'}=${credential}`,
    });
    const input = {
      revision: 0,
      items: [{ itemId: f.items[0]!.id, earnedPoints: 12.25, comment: 'Retained owner comment.' }],
    };
    const original = structuredClone({
      answers: f.attempt.answers,
      result: f.attempt.result,
      score: f.attempt.score,
      revision: f.attempt.revision,
    });
    try {
      const initial = await app.inject({ method: 'GET', url: path, headers: headers() });
      assert.equal(initial.statusCode, 200, initial.body);
      assert.equal(initial.headers['cache-control'], 'no-store');
      assert.equal(initial.json().grading.revision, 0);
      const saved = await app.inject({
        method: 'PATCH',
        url: path,
        headers: headers(),
        payload: input,
      });
      assert.equal(saved.statusCode, 200, saved.body);
      assert.equal(saved.json().grading.revision, 1);
      assert.equal(saved.json().score.summary.earnedPoints, 22.25);
      const detailPath = path.slice(0, -'/grading'.length);
      const ownerReview = await app.inject({ method: 'GET', url: detailPath, headers: headers() });
      assert.equal(ownerReview.statusCode, 200, ownerReview.body);
      assert.deepEqual(ownerReview.json().attempt.result, original.result);
      assert.deepEqual(ownerReview.json().attempt.automaticScore, original.score);
      assert.equal(ownerReview.json().attempt.score.summary.earnedPoints, 22.25);
      assert.equal(
        ownerReview.json().attempt.instructorGrading.items[0].comment,
        'Retained owner comment.',
      );
      assert(!/referenceProof|correctAnswer|explanation/.test(ownerReview.body));
      const ownerList = await app.inject({
        method: 'GET',
        url: detailPath.slice(0, -('/' + f.attempt.id).length),
        headers: headers(),
      });
      assert.equal(ownerList.statusCode, 200, ownerList.body);
      assert.deepEqual(ownerList.json().submissions[0].summary, original.result!.summary);
      assert.equal(ownerList.json().submissions[0].score.summary.earnedPoints, 22.25);

      assert.equal(
        (await app.inject({ method: 'GET', url: path, headers: headers() })).json().grading
          .revision,
        1,
      );
      const history = await app.inject({
        method: 'GET',
        url: path + '/history?limit=1',
        headers: headers(),
      });
      assert.equal(history.statusCode, 200, history.body);
      assert.equal(history.json().revisions[0].changes[0].comment, 'Retained owner comment.');
      assert.equal(history.json().nextOffset, null);
      const stale = await app.inject({
        method: 'PATCH',
        url: path,
        headers: headers(),
        payload: input,
      });
      assert.equal(stale.statusCode, 409, stale.body);
      assert.equal(stale.json().error.code, 'SUBMISSION_GRADING_REVISION_CONFLICT');
      const invalid = await app.inject({
        method: 'PATCH',
        url: path,
        headers: headers(),
        payload: { revision: 1, items: [{ ...input.items[0], earnedPoints: 20.01 }] },
      });
      assert.equal(invalid.statusCode, 400, invalid.body);
      assert.equal(invalid.json().error.code, 'SUBMISSION_GRADING_INVALID');
      assert.equal(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers: { cookie: headers().cookie },
            payload: input,
          })
        ).statusCode,
        403,
      );
      assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 1);
      if (demo) {
        assert.throws(
          () =>
            f.runtime!.context.submissionGrading.read(f.owner.id, f.assignment.id, f.attempt.id),
          /Demo resource transaction is required/,
        );
        await f.runtime!.run(credential, false, async () => {
          assert.throws(
            () =>
              f.runtime!.context.submissionGrading.read(
                randomUUID(),
                f.assignment.id,
                f.attempt.id,
              ),
            /SESSION_INVALID/,
          );
        });
        const otherWorkspace = await f.runtime!.workspaces.provision();
        const otherSession = await f.runtime!.sessions.issue(
          otherWorkspace.workspaceId,
          'instructor',
        );
        const ownerCredential = credential;
        credential = otherSession.sessionId;
        assert.equal(
          (await app.inject({ method: 'GET', url: path, headers: headers() })).statusCode,
          404,
        );
        credential = (await f.runtime!.sessions.switchRole(ownerCredential, 'student')).sessionId;
      } else {
        actor = f.other;
        assert.equal(
          (await app.inject({ method: 'GET', url: path, headers: headers() })).statusCode,
          404,
        );
        actor = f.student;
      }
      for (const request of [
        { method: 'GET' as const, url: path },
        { method: 'PATCH' as const, url: path, payload: input },
        { method: 'GET' as const, url: path + '/history' },
      ])
        assert.equal((await app.inject({ ...request, headers: headers() })).statusCode, 403);
      const workPath = `${demo ? '/api/demo/resources' : '/api'}/student/assignments/${f.assignment.id}`;
      const readWork = () => app.inject({ method: 'GET', url: workPath, headers: headers() });
      // Independent answer release must not expose held grading or comments.
      await f.em.nativeUpdate(f.db.Assignment, f.assignment.id, {
        solutionAccess: f.db.SolutionAccess.InstructorRelease,
        answersRevealedAt: new Date(),
        answersRevealedBy: f.owner,
      });
      const held = await readWork();
      assert.equal(held.statusCode, 200, held.body);
      assert.equal(held.json().attempt.result, null);
      assert.equal(held.json().attempt.score, null);
      assert.equal(held.json().attempt.gradePending, true);
      assert(!/automaticScore|instructorGrading|Retained owner comment|reviewedBy/.test(held.body));
      await f.em.nativeUpdate(f.db.Assignment, f.assignment.id, {
        gradesReleasedAt: new Date(),
        gradesReleasedBy: f.owner,
      });
      const released = await readWork();
      assert.equal(released.statusCode, 200, released.body);
      assert.deepEqual(released.json().attempt.result, original.result);
      assert.deepEqual(released.json().attempt.automaticScore, original.score);
      assert.equal(released.json().attempt.score.summary.earnedPoints, 22.25);
      assert.equal(released.json().attempt.instructorGrading.revision, 1);
      assert(!/reviewedBy|reviewedAt|referenceProof|correctAnswer|explanation/.test(released.body));
      const retry = await app.inject({
        method: 'POST',
        url: workPath + '/submission',
        headers: headers(),
        payload: { revision: 0 },
      });
      assert.equal(retry.statusCode, 200, retry.body);
      assert.deepEqual(retry.json().attempt, released.json().attempt);
      // New corrections follow release immediately; repeated pinned versions stay independent.
      await f.update(1, [{ itemId: f.items[0]!.id, earnedPoints: 0, comment: 'Zero, resolved.' }]);
      assert.equal((await readWork()).json().attempt.score.summary.earnedPoints, 10);
      await f.store.update(f.owner.id, f.assignment.id, f.attempt.id, {
        revision: 2,
        items: [{ itemId: f.items[0]!.id, earnedPoints: null, comment: 'Reopened.' }],
      });
      const reopened = (await readWork()).json().attempt;
      assert.equal(reopened.instructorGrading.revision, 3);
      assert.equal(reopened.score.summary.earnedPoints, null);
      assert.equal(reopened.score.summary.status, 'needs_review');
      assert.equal(reopened.score.items[1].earnedPoints, 5);
      assert.deepEqual(reopened.result, original.result);
      assert.deepEqual(reopened.automaticScore, original.score);
      const retained = await f.em.fork().findOneOrFail(f.db.AssignmentAttempt, f.attempt.id);
      assert.deepEqual(
        {
          answers: retained.answers,
          result: retained.result,
          score: retained.score,
          revision: retained.revision,
        },
        original,
      );
      const assignment = await f.em.fork().findOneOrFail(f.db.Assignment, f.assignment.id);
      assert(assignment.gradesReleasedAt);
      assert(assignment.answersRevealedAt);
    } finally {
      await app.close();
      await f.close();
    }
  });
}

test('demo grading returns failure when commit fails and leaves neither a revision nor an effective award', async () => {
  const f = await fixture(true);
  const session = await f.runtime!.sessions.issue(f.workspace!.workspaceId, 'instructor');
  const app = buildApp({ demo: f.runtime! });
  const schema = f.orm.config.get('schema')!;
  try {
    await f.em.execute(`
      create function "${schema}".reject_grading_commit() returns trigger language plpgsql as $$
      begin
        raise exception 'Synthetic private grading commit failure';
      end;
      $$;
    `);
    await f.em.execute(`
      create constraint trigger reject_grading_commit
        after insert on "${schema}".submission_grading_revisions
        deferrable initially deferred
        for each row execute function "${schema}".reject_grading_commit();
    `);
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/demo/resources/assignments/${f.assignment.id}/submissions/${f.attempt.id}/grading`,
      headers: { origin: 'http://localhost:5173', cookie: `logiclab_demo=${session.sessionId}` },
      payload: { revision: 0, items: [{ itemId: f.items[0]!.id, earnedPoints: 5, comment: null }] },
    });
    assert.equal(response.statusCode, 503, response.body);
    assert(!response.body.includes('Synthetic private'));
    assert.equal(await f.em.count(f.db.SubmissionGradingRevision, {}), 0);
    assert.equal(
      (await f.store.read(f.owner.id, f.assignment.id, f.attempt.id)).grading.revision,
      0,
    );
  } finally {
    await app.close();
    await f.close();
  }
});

test('objective review pages use the latest award per submission and keep unfinished work private', async () => {
  const f = await fixture();
  try {
    const assignment = f.em.create(f.db.Assignment, {
      classroom: f.assignment.classroom,
      title: 'Objective grading',
      publishedAt: new Date(),
    });
    const table = f.em.create(f.db.Problem, {
      owner: f.owner,
      title: 'Table',
      definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
    });
    const version = f.em.create(f.db.ProblemVersion, {
      problem: table,
      title: table.title,
      version: 1,
      definition: table.definition,
    });
    const items = [version, f.items[2]!.problemVersion].map((problemVersion, i) =>
      f.em.create(f.db.AssignmentItem, {
        assignment,
        problemVersion,
        position: i + 1,
        maxPoints: 10,
      }),
    );
    const answers = { [items[1]!.id]: { type: 'true_false' as const, answer: false } };
    const calculated = calculateSubmissionResult(assignment, items, answers);
    const secondStudent = f.em.create(f.db.User, {
      cognitoUserPoolId: randomUUID(),
      cognitoSubject: 'second',
      role: f.db.UserRole.Student,
    });
    const final = [f.student, secondStudent].map((student) =>
      f.em.create(f.db.AssignmentAttempt, {
        assignment,
        student,
        answers,
        ...calculated,
        submittedAt: new Date(),
        revision: 1,
      }),
    );
    const draft = f.em.create(f.db.AssignmentAttempt, { assignment, student: f.other, answers });
    f.em.persist([assignment, table, version, ...items, secondStudent, ...final, draft]);
    await f.em.flush();
    for (const [index, attempt] of final.entries()) {
      await f.store.update(f.owner.id, assignment.id, attempt.id, {
        revision: 0,
        items: [
          { itemId: items[0]!.id, earnedPoints: index + 1, comment: 'Table adjustment.' },
          { itemId: items[1]!.id, earnedPoints: 0, comment: 'Concept adjustment.' },
        ],
      });
    }
    await f.store.update(f.owner.id, assignment.id, final[0]!.id, {
      revision: 1,
      items: [{ itemId: items[0]!.id, earnedPoints: 6.25, comment: 'Latest table correction.' }],
    });
    const review = await createSubmissionReviewStore(f.orm);
    const page = await review.listSubmissions(f.owner.id, assignment.id, { limit: 20, offset: 0 });
    assert.equal(page.length, 2);
    assert.equal(page.find((row) => row.id === final[0]!.id)!.score!.summary.earnedPoints, 6.25);
    assert.equal(page.find((row) => row.id === final[1]!.id)!.score!.summary.earnedPoints, 2);
    const detail = await review.findSubmission(f.owner.id, assignment.id, final[0]!.id);
    assert.equal(detail.attempt.instructorGrading!.revision, 2);
    assert.deepEqual(detail.attempt.result, calculated.result);
    assert.deepEqual(detail.attempt.automaticScore, calculated.score);
    assert.equal(
      (await review.listSubmissions(f.owner.id, assignment.id, { limit: 1, offset: 1 })).length,
      1,
    );
    assert.deepEqual(
      await review.listSubmissions(f.owner.id, assignment.id, { limit: 1, offset: 2 }),
      [],
    );
    await assert.rejects(review.findSubmission(f.owner.id, assignment.id, draft.id), /not_found/);
    await assert.rejects(
      review.findSubmission(f.other.id, assignment.id, final[0]!.id),
      /not_found/,
    );
    const work = await createStudentWorkStore(f.orm);
    const student = (await work.read(f.student.id, assignment.id)).attempt!;
    assert.deepEqual(student.score, detail.attempt.score);
    assert.deepEqual(student.instructorGrading, detail.attempt.instructorGrading);
    assert.deepEqual(student.automaticScore, calculated.score);
    assert(!JSON.stringify(student).includes('reviewedBy'));
  } finally {
    await f.close();
  }
});
