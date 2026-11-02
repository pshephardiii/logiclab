import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { createDatabase, User, Classroom } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import {
  savedStudentAnswersSchema,
  savedStudentAttemptResponseSchema,
} from '@logiclab/contracts/saved-student-work';
import { generateTruthTable } from '@logiclab/logic-engine';
import { buildApp } from '../../src/app';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { StudentWorkError } from '../../src/application/student-work/errors';
import { derivationDefinitionFixture } from '../derivation-fixture';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';
const valid = () => ({
  type: 'derivation' as const,
  proof: structuredClone(derivationDefinitionFixture().referenceProof!),
});
function wrong() {
  const answer = valid();
  answer.proof.steps[0]!.formula = 'Q';
  return answer;
}
const failure = (reason: string) => (error: unknown) =>
  error instanceof StudentWorkError && error.reason === reason;
async function fixture(work: (f: Awaited<ReturnType<typeof seed>>) => Promise<void>, demo = false) {
  const db = await import('@logiclab/db');
  const schema = `proof_completion_work_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  let f: Awaited<ReturnType<typeof seed>> | undefined;
  try {
    await orm.schema.create();
    f = await seed(orm, db, demo);
    await work(f);
  } finally {
    await f?.app.close();
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}
async function seed(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
  useDemo: boolean,
) {
  const em = orm.em.fork();
  const runtime = await createDemoRuntime(
    orm,
    readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: origin })!,
  );
  let owner: User;
  let student: User;
  let classroom: Classroom;
  let sessionId = '';
  let cookie = `logiclab_session=${'a'.repeat(43)}`;
  let otherCookie = `logiclab_session=${'b'.repeat(43)}`;
  const outsider = em.create(db.User, {
    cognitoUserPoolId: 'completion-work',
    cognitoSubject: randomUUID(),
    role: db.UserRole.Student,
  });
  em.persist(outsider);
  if (useDemo) {
    const one = await runtime.workspaces.provision();
    const two = await runtime.workspaces.provision();
    const session = await runtime.sessions.issue(one.workspaceId, 'student');
    const other = await runtime.sessions.issue(two.workspaceId, 'student');
    sessionId = session.sessionId;
    cookie = `logiclab_demo=${sessionId}`;
    otherCookie = `logiclab_demo=${other.sessionId}`;
    student = await em.findOneOrFail(db.User, session.actor.id);
    owner = await em.findOneOrFail(db.User, {
      demoWorkspace: one.workspaceId,
      role: db.UserRole.Instructor,
    });
    classroom = await em.findOneOrFail(db.Classroom, {
      owner: owner.id,
      name: 'Demo: Introduction to Logic',
    });
  } else {
    owner = em.create(db.User, {
      cognitoUserPoolId: 'completion-work',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    student = em.create(db.User, {
      cognitoUserPoolId: 'completion-work',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Student,
    });
    classroom = em.create(db.Classroom, { owner, name: 'Internal completion fixture' });
    em.persist([owner, student, classroom, em.create(db.Enrollment, { student, classroom })]);
  }
  await em.flush();
  const problems = await createProblemStore(orm);
  const proof = await problems.create(owner.id, {
    title: 'Pinned completion proof',
    definition: derivationDefinitionFixture(),
  });
  const concept = await problems.create(owner.id, {
    title: 'Completion concept',
    definition: {
      type: 'true_false',
      definitionVersion: 1,
      question: 'P implies P?',
      correctAnswer: true,
      explanation: 'PRIVATE_OBJECTIVE_KEY',
    },
  });
  const table = await problems.create(owner.id, {
    title: 'Completion table',
    definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
  });
  const publications = await Promise.all(
    [proof, concept, table].map((item) => problems.publish(owner.id, item.id)),
  );
  const versions = publications.map((value) => {
    if (value.status !== 'published') throw new Error('Expected publication');
    return em.getReference(db.ProblemVersion, value.version.id);
  });
  // Completion proof admission remains guarded; only internal fixtures exercise the staged path.
  const assignment = em.create(db.Assignment, {
    classroom,
    title: 'Mixed proof completion',
    assessmentMode: db.AssessmentMode.CompletionOnly,
    feedbackTiming: db.FeedbackTiming.OnSubmission,
    solutionAccess: db.SolutionAccess.AfterSubmission,
  });
  const items = [versions[0]!, versions[0]!, versions[1]!, versions[2]!].map((version, index) =>
    em.create(db.AssignmentItem, { assignment, problemVersion: version, position: index + 1 }),
  );
  em.persist([assignment, ...items]);
  await em.flush();
  assignment.publishedAt = new Date();
  await em.flush();
  const store = await createStudentWorkStore(orm);
  const app = buildApp({
    studentWork: {
      config: { APP_ORIGIN: origin, secureCookies: false },
      service: {
        authenticate: async (id) => ({
          id: id === 'a'.repeat(43) ? student.id : outsider.id,
          role: 'student' as const,
        }),
      },
      studentWork: store,
    },
    demo: runtime,
  });
  let address = 1;
  const prefix = `/api/${useDemo ? 'demo/resources/' : ''}student/assignments/${assignment.id}`;
  const request = (
    method: 'GET' | 'PATCH' | 'POST',
    suffix: string,
    payload?: object,
    credentials = cookie,
  ) =>
    app.inject({
      method,
      url: prefix + suffix,
      payload,
      headers: { origin, cookie: credentials },
      remoteAddress: `127.0.0.${address++}`,
    });
  const tableData = generateTruthTable('P');
  const responses = () =>
    [
      wrong(),
      valid(),
      { type: 'true_false' as const, answer: false },
      tableData.rows.flatMap((row) =>
        tableData.columns
          .filter((column) => column.kind === 'answer')
          .map((column) => ({ rowId: row.id, columnId: column.id, value: false })),
      ),
    ] as const;
  async function saveAll() {
    let revision = 0;
    for (const [index, answers] of responses().entries()) {
      const saved = await store.save(
        student.id,
        assignment.id,
        savedStudentAnswersSchema.parse({ revision, itemId: items[index]!.id, answers }),
      );
      revision = saved.revision;
      assert.equal(saved.result, null);
      assert.equal(saved.score, undefined);
    }
    return revision;
  }
  const snapshot = async () => {
    const attempt = await orm.em
      .fork()
      .findOneOrFail(db.AssignmentAttempt, { assignment: assignment.id, student: student.id });
    return JSON.stringify({
      id: attempt.id,
      answers: attempt.answers,
      revision: attempt.revision,
      result: attempt.result,
      score: attempt.score,
      submittedAt: attempt.submittedAt,
      updatedAt: attempt.updatedAt,
    });
  };
  return {
    orm,
    db,
    owner,
    student,
    outsider,
    classroom,
    assignment,
    items,
    proof,
    problems,
    store,
    runtime,
    sessionId,
    cookie,
    otherCookie,
    app,
    request,
    responses,
    saveAll,
    snapshot,
  };
}
for (const demo of [false, true])
  test(`${demo ? 'demo' : 'normal'} HTTP completion proofs save unfinished drafts, finalize finished mistakes score-free and preserve independent references/retries`, async () =>
    fixture(async (f) => {
      assert.equal((await f.request('GET', '')).statusCode, 200);
      assert.equal(
        (await f.request('POST', '/check', { itemId: f.items[0]!.id, answers: valid() }))
          .statusCode,
        403,
      );
      assert.equal((await f.request('GET', `/items/${f.items[0]!.id}/solution`)).statusCode, 403);
      assert.equal((await f.request('POST', '/submission', { revision: 0 })).statusCode, 409);
      assert.equal(
        await f.orm.em.fork().count(f.db.AssignmentAttempt, { assignment: f.assignment.id }),
        0,
      );
      const empty = {
        type: 'derivation',
        proof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
      };
      const draft = await f.request('PATCH', '/attempt', {
        revision: 0,
        itemId: f.items[0]!.id,
        answers: empty,
      });
      assert.equal(draft.statusCode, 200, draft.body);
      assert.equal(draft.json().attempt.result, null);
      assert(!draft.body.includes('diagnostics'));
      const before = await f.snapshot();
      const unfinished = await f.request('POST', '/submission', { revision: 1 });
      assert.equal(unfinished.statusCode, 409, unfinished.body);
      assert.equal(unfinished.json().error.code, 'ATTEMPT_INCOMPLETE');
      assert.equal(await f.snapshot(), before);
      let revision = 1;
      for (const [index, answers] of f.responses().entries()) {
        const response = await f.request('PATCH', '/attempt', {
          revision,
          itemId: f.items[index]!.id,
          answers,
        });
        assert.equal(response.statusCode, 200, response.body);
        revision = response.json().attempt.revision;
        assert.equal(response.json().attempt.result, null);
        assert(!response.body.includes('diagnostics'));
      }
      await f.problems.update(f.owner.id, f.proof.id, {
        definition: {
          ...derivationDefinitionFixture(),
          conclusion: 'Q',
          referenceProof: null,
          explanation: 'NEW_PRIVATE_REFERENCE',
        },
      });
      assert.equal(
        (await f.request('POST', '/submission', { revision: revision - 1 })).statusCode,
        409,
      );
      const posted = await f.request('POST', '/submission', { revision });
      assert.equal(posted.statusCode, 200, posted.body);
      assert.equal(posted.headers['cache-control'], 'no-store');
      const final = savedStudentAttemptResponseSchema.parse(posted.json()).attempt;
      assert.equal(final.revision, revision + 1);
      assert.equal(final.gradePending, false);
      assert.equal(final.score, undefined);
      assert.equal(final.result?.gradingVersion, 'proof_completion_v1');
      if (final.result?.gradingVersion !== 'proof_completion_v1')
        assert.fail('Expected completion');
      assert.deepEqual(final.result.summary, {
        completedResponses: 5,
        totalResponses: 5,
        proofVerification: { verified: 1, errorsFound: 1, unavailable: 0, total: 2 },
      });
      for (const item of final.result.items)
        if (item.type !== 'derivation') assert(!('feedback' in item));
      for (const field of [
        'referenceProof',
        'explanation',
        'PRIVATE_OBJECTIVE_KEY',
        'NEW_PRIVATE_REFERENCE',
        'earnedPoints',
      ])
        assert(!posted.body.includes(field));
      const frozen = await f.snapshot();
      const retried = await f.request('POST', '/submission', { revision: 0 });
      assert.equal(retried.statusCode, 200, retried.body);
      assert.deepEqual(retried.json().attempt, final);
      assert.deepEqual((await f.request('GET', '')).json().attempt, final);
      assert.equal(
        (
          await f.request('PATCH', '/attempt', {
            revision: final.revision,
            itemId: f.items[0]!.id,
            answers: valid(),
          })
        ).statusCode,
        409,
      );
      const solution = await f.request('GET', `/items/${f.items[0]!.id}/solution`);
      assert.equal(solution.statusCode, 200, solution.body);
      assert.deepEqual(
        solution.json().solution.referenceProof,
        derivationDefinitionFixture().referenceProof,
      );
      assert.equal(solution.json().solution.explanation, derivationDefinitionFixture().explanation);
      assert.equal(await f.snapshot(), frozen);
      assert.equal((await f.request('GET', '', undefined, f.otherCookie)).statusCode, 404);
      assert.equal(
        (await f.request('POST', '/submission', { revision: 0 }, f.otherCookie)).statusCode,
        404,
      );
      await f.orm.em
        .fork()
        .nativeUpdate(f.db.Assignment, f.assignment.id, { archivedAt: new Date() });
      assert.equal((await f.request('GET', '')).statusCode, 404);
      assert.equal((await f.request('POST', '/submission', { revision: 0 })).statusCode, 404);
    }, demo));

test('completion proof references remain independent before and after finalization; unsupported pre-submission diagnostic policies fail closed', async () =>
  fixture(async (f) => {
    await f.orm.em.fork().nativeUpdate(f.db.Assignment, f.assignment.id, {
      solutionAccess: f.db.SolutionAccess.Anytime,
    });
    const reference = (await f.store.solution(f.student.id, f.assignment.id, f.items[0]!.id))
      .solution;
    assert('type' in reference && reference.type === 'derivation');
    assert.equal(
      await f.orm.em.fork().count(f.db.AssignmentAttempt, { assignment: f.assignment.id }),
      0,
    );
    await f.orm.em.fork().nativeUpdate(f.db.Assignment, f.assignment.id, {
      feedbackTiming: f.db.FeedbackTiming.OnCheck,
    });
    for (const operation of [
      () => f.store.read(f.student.id, f.assignment.id),
      () =>
        f.store.save(f.student.id, f.assignment.id, {
          revision: 0,
          itemId: f.items[0]!.id,
          answers: valid(),
        }),
      () =>
        f.store.check(f.student.id, f.assignment.id, { itemId: f.items[0]!.id, answers: valid() }),
      () => f.store.submit(f.student.id, f.assignment.id, 0),
      () => f.store.solution(f.student.id, f.assignment.id, f.items[0]!.id),
    ])
      await assert.rejects(operation(), failure('unsupported_policy'));
    assert.equal(
      await f.orm.em.fork().count(f.db.AssignmentAttempt, { assignment: f.assignment.id }),
      0,
    );
    await f.orm.em.fork().nativeUpdate(f.db.Assignment, f.assignment.id, {
      feedbackTiming: f.db.FeedbackTiming.OnSubmission,
      solutionAccess: f.db.SolutionAccess.Never,
    });
    const revision = await f.saveAll();
    const final = await f.store.submit(f.student.id, f.assignment.id, revision);
    assert.equal(final.result?.gradingVersion, 'proof_completion_v1');
    await assert.rejects(
      f.store.solution(f.student.id, f.assignment.id, f.items[0]!.id),
      failure('solution_locked'),
    );
    await f.orm.em.fork().nativeUpdate(f.db.Assignment, f.assignment.id, {
      solutionAccess: f.db.SolutionAccess.InstructorRelease,
    });
    await assert.rejects(
      f.store.solution(f.student.id, f.assignment.id, f.items[0]!.id),
      failure('solution_locked'),
    );
    await f.orm.em.fork().nativeUpdate(f.db.Assignment, f.assignment.id, {
      answersRevealedAt: new Date(),
      answersRevealedBy: f.owner.id,
    });
    const revealed = (await f.store.solution(f.student.id, f.assignment.id, f.items[0]!.id))
      .solution;
    assert('type' in revealed && revealed.type === 'derivation');
    assert.deepEqual((await f.store.read(f.student.id, f.assignment.id)).attempt, final);
  }));

test('unfinished objective companions, caller failure and database write rejection leave completion drafts unchanged', async () =>
  fixture(async (f) => {
    let revision = 0;
    for (const [index, answers] of f.responses().slice(0, 3).entries())
      revision = (
        await f.store.save(
          f.student.id,
          f.assignment.id,
          savedStudentAnswersSchema.parse({ revision, itemId: f.items[index]!.id, answers }),
        )
      ).revision;
    const incomplete = await f.snapshot();
    await assert.rejects(
      f.store.submit(f.student.id, f.assignment.id, revision),
      failure('incomplete_work'),
    );
    assert.equal(await f.snapshot(), incomplete);
    revision = (
      await f.store.save(f.student.id, f.assignment.id, {
        revision,
        itemId: f.items[3]!.id,
        answers: f.responses()[3],
      })
    ).revision;
    const before = await f.snapshot();
    await assert.rejects(
      f.orm.em.fork().transactional(async (em) => {
        const store = await createStudentWorkStore(f.orm, em);
        await store.submit(f.student.id, f.assignment.id, revision);
        throw new Error('ROLLBACK_COMPLETION_FINAL');
      }),
      /ROLLBACK_COMPLETION_FINAL/,
    );
    assert.equal(await f.snapshot(), before);
    const schema = f.orm.config.get('schema');
    await f.orm.em.execute(
      `alter table "${schema}".assignment_attempts add constraint reject_completion_final_for_test check (submitted_at is null)`,
    );
    await assert.rejects(
      f.store.submit(f.student.id, f.assignment.id, revision),
      /reject_completion_final_for_test/,
    );
    await f.orm.em.execute(
      `alter table "${schema}".assignment_attempts drop constraint reject_completion_final_for_test`,
    );
    assert.equal(await f.snapshot(), before);
    assert((await f.store.submit(f.student.id, f.assignment.id, revision)).submittedAt);
  }));

test('completion submit retries and racing saves serialize without partial results or points', async () =>
  fixture(async (f) => {
    const revision = await f.saveAll();
    const outcomes = await Promise.allSettled([
      f.store.save(f.student.id, f.assignment.id, {
        revision,
        itemId: f.items[0]!.id,
        answers: valid(),
      }),
      f.store.submit(f.student.id, f.assignment.id, revision),
    ]);
    assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    assert(rejected?.status === 'rejected');
    if (outcomes[0]!.status === 'fulfilled') assert(failure('revision_conflict')(rejected.reason));
    else assert(failure('submitted')(rejected.reason));
    const current = (await f.store.read(f.student.id, f.assignment.id)).attempt!;
    const [one, two] = await Promise.all([
      f.store.submit(f.student.id, f.assignment.id, current.revision),
      f.store.submit(f.student.id, f.assignment.id, current.revision),
    ]);
    assert.deepEqual(one, two);
    assert(one.submittedAt);
    assert.equal(one.score, undefined);
    assert.equal(one.result?.gradingVersion, 'proof_completion_v1');
    if (one.result?.gradingVersion !== 'proof_completion_v1') assert.fail('Expected completion');
    assert.equal(
      one.result.summary.proofVerification.verified,
      outcomes[0]!.status === 'fulfilled' ? 2 : 1,
    );
    assert.equal(one.revision, outcomes[0]!.status === 'fulfilled' ? revision + 2 : revision + 1);
    assert.equal(
      await f.orm.em.fork().count(f.db.AssignmentAttempt, { assignment: f.assignment.id }),
      1,
    );
  }));

test('completion finalization waits for archive/enrollment removal and rechecks access before freezing work', async () =>
  fixture(async (f) => {
    const revision = await f.saveAll();
    const before = await f.snapshot();
    async function waitForLock() {
      const until = Date.now() + 5000;
      while (Date.now() < until) {
        const rows = await f.orm.em
          .getConnection()
          .execute<{ count: number }[]>(
            "select count(*)::int as count from pg_stat_activity where wait_event_type = 'Lock' and query like ?",
            [`%${f.orm.config.get('schema')}%`],
          );
        if (rows[0]!.count) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.fail('Expected a database lock wait');
    }
    let pending!: Promise<unknown>;
    await f.orm.em.fork().transactional(async (em) => {
      const assignment = await em.findOneOrFail(f.db.Assignment, f.assignment.id, {
        lockMode: f.db.LockMode.PESSIMISTIC_WRITE,
      });
      pending = f.store.submit(f.student.id, f.assignment.id, revision);
      void pending.catch(() => {});
      await waitForLock();
      assignment.archivedAt = new Date();
      await em.flush();
    });
    await assert.rejects(pending, failure('not_found'));
    assert.equal(await f.snapshot(), before);
    await f.orm.em.fork().nativeUpdate(f.db.Assignment, f.assignment.id, { archivedAt: null });
    await f.orm.em.fork().transactional(async (em) => {
      const enrollment = await em.findOneOrFail(
        f.db.Enrollment,
        { student: f.student.id, classroom: f.classroom.id },
        { lockMode: f.db.LockMode.PESSIMISTIC_WRITE },
      );
      pending = f.store.submit(f.student.id, f.assignment.id, revision);
      void pending.catch(() => {});
      await waitForLock();
      em.remove(enrollment);
      await em.flush();
    });
    await assert.rejects(pending, failure('not_found'));
    assert.equal(await f.snapshot(), before);
  }));

test('demo completion finalization joins the workspace transaction and rolls back the entire final on caller failure', async () =>
  fixture(async (f) => {
    const revision = await f.saveAll();
    const before = await f.snapshot();
    await assert.rejects(
      f.runtime.run(f.sessionId, true, async (actor) => {
        await f.runtime.context.studentWork.submit(actor.id, f.assignment.id, revision);
        throw new Error('ROLLBACK_DEMO_COMPLETION');
      }),
      /ROLLBACK_DEMO_COMPLETION/,
    );
    assert.equal(await f.snapshot(), before);
    const final = await f.runtime.run(f.sessionId, true, (actor) =>
      f.runtime.context.studentWork.submit(actor.id, f.assignment.id, revision),
    );
    assert.equal(final.result?.gradingVersion, 'proof_completion_v1');
    assert.equal(final.score, undefined);
  }, true));
