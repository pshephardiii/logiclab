import type { PublishedProblemVersion } from '@logiclab/contracts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { readAuthConfig } from '../../src/config/auth';
import { readDemoConfig } from '../../src/config/demo';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import type { AuthContext } from '../../src/routes/auth/context';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { generateTruthTable } from '@logiclab/logic-engine';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
async function fixture() {
  const db = await import('@logiclab/db');
  const schema = `assignment_scoring_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
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
  const classroom = em.create(db.Classroom, { owner, name: 'Weighted class' });
  em.persist([
    owner,
    other,
    student,
    classroom,
    em.create(db.Enrollment, { classroom, student }),
    em.create(db.ClassEntitlement, {
      classroom,
      provider: db.BillingProvider.Simulator,
      source: db.EntitlementSource.ClassPurchase,
      sourceReference: randomUUID(),
      startsAt: new Date(Date.now() - 60000),
      endsAt: new Date(Date.now() + 86400000),
    }),
  ]);
  await em.flush();
  const assignments = await createAssignmentStore(orm);
  const work = await createStudentWorkStore(orm);
  const problems = await createProblemStore(orm);
  const table = await problems.create(owner.id, {
    title: 'Table',
    definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
  });
  const question = await problems.create(owner.id, {
    title: 'Concept',
    definition: {
      type: 'true_false',
      definitionVersion: 1,
      question: 'Always true?',
      correctAnswer: false,
    },
  });
  const versions: PublishedProblemVersion[] = [];
  for (const problem of [table, question]) {
    const published = await problems.publish(owner.id, problem.id);
    assert.equal(published.status, 'published');
    if (published.status !== 'published') throw new Error('Fixture publication failed');
    versions.push(published.version);
  }
  let active = owner;
  const config = readAuthConfig({
    AUTH_ENABLED: 'true',
    AWS_REGION: 'us-east-1',
    COGNITO_USER_POOL_ID: 'us-east-1_test',
    COGNITO_CLIENT_ID: 'synthetic',
    COGNITO_CLIENT_SECRET: 'synthetic',
    AUTH_TOKEN_KEY: 'ab'.repeat(32),
    APP_ORIGIN: 'http://localhost:5173',
  })!;
  const context = {
    config,
    service: {
      authenticate: async () => ({
        id: active.id,
        subject: active.cognitoSubject,
        role: active.role,
      }),
    },
  } as unknown as AuthContext;
  const app = buildApp({
    assignment: { ...context, assignments },
    studentWork: { ...context, studentWork: work },
    demo: await createDemoRuntime(
      orm,
      readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: config.APP_ORIGIN })!,
    ),
  });
  let address = 1;
  const request = (
    actor: typeof owner,
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    payload?: object,
    cookie = `logiclab_session=${'a'.repeat(43)}`,
  ) => {
    active = actor;
    return app.inject({
      method,
      url: path,
      payload,
      remoteAddress: `127.0.0.${address++}`,
      headers: { origin: config.APP_ORIGIN, cookie },
    });
  };
  async function create(overrides: object = {}) {
    const response = await request(owner, 'POST', `/api/classes/${classroom.id}/assignments`, {
      title: 'Point draft',
      items: versions.map((version, index) => ({
        problemVersionId: version.id,
        maxPoints: index === 0 ? 20 : 5,
      })),
      ...overrides,
    });
    assert.equal(response.statusCode, 201, response.body);
    return response.json().assignment;
  }
  const close = async () => {
    await app.close();
    await em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  };
  return {
    db,
    orm,
    em,
    owner,
    other,
    student,
    classroom,
    versions,
    assignments,
    work,
    request,
    create,
    close,
  };
}

test('graded drafts default to points, preserve occurrence identity and roll back invalid allocations', async () => {
  const f = await fixture();
  try {
    const plain = await f.assignments.create(f.owner.id, f.classroom.id, {
      title: 'Default points',
      problemVersionIds: f.versions.map((version) => version.id),
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
      solutionAccess: 'never',
    });
    assert.deepEqual(
      plain.items.map((item) => item.maxPoints),
      [10, 10],
    );
    const path = `/api/assignments/${plain.id}`;
    const enabled = await f.request(f.owner, 'GET', path);
    assert.equal(enabled.statusCode, 200, enabled.body);
    const draft = enabled.json().assignment;
    assert.deepEqual(
      draft.items.map((item: { id: string; maxPoints: number }) => [item.id, item.maxPoints]),
      plain.items.map((item) => [item.id, 10]),
    );
    const allocations = draft.items.map((item: { id: string }, index: number) => ({
      itemId: item.id,
      maxPoints: index === 0 ? 30 : 10,
    }));
    const weighted = await f.request(f.owner, 'PATCH', path, { pointAllocations: allocations });
    assert.equal(weighted.statusCode, 200, weighted.body);
    const before = await f.assignments.findOwned(f.owner.id, plain.id);
    for (const bad of [
      [],
      [allocations[0]],
      [allocations[0], allocations[0]],
      [{ itemId: randomUUID(), maxPoints: 10 }, allocations[1]],
      [{ ...allocations[0], maxPoints: 0 }, allocations[1]],
    ]) {
      const invalid = await f.request(f.owner, 'PATCH', path, {
        title: 'Must roll back',
        pointAllocations: bad,
      });
      assert.equal(invalid.statusCode, 400, invalid.body);
      assert.deepEqual(await f.assignments.findOwned(f.owner.id, plain.id), before);
    }
    const sameList = await f.request(f.owner, 'PATCH', path, {
      problemVersionIds: f.versions.map((version) => version.id),
      title: 'Metadata edit preserves weights',
    });
    assert.equal(sameList.statusCode, 200, sameList.body);
    assert.deepEqual(sameList.json().assignment.items, before.items);
    const reorder = await f.request(f.owner, 'PATCH', path, {
      problemVersionIds: f.versions.map((version) => version.id).reverse(),
    });
    assert.equal(reorder.statusCode, 400, reorder.body);
    const completionMode = await f.request(f.owner, 'PATCH', path, {
      assessmentMode: 'completion_only',
    });
    assert.equal(completionMode.statusCode, 200, completionMode.body);

    assert(
      (await f.em.fork().find(f.db.AssignmentItem, { assignment: plain.id })).every(
        (item) => item.maxPoints > 0,
      ),
    );
    assert.equal(
      (await f.request(f.student, 'PATCH', path, { pointAllocations: allocations })).statusCode,
      403,
    );
    assert.equal(
      (await f.request(f.other, 'PATCH', path, { pointAllocations: allocations })).statusCode,
      404,
    );
  } finally {
    await f.close();
  }
});

test('weighted mixed finalization freezes point scores, withholds every student projection until grade release and preserves duplication', async () => {
  const f = await fixture();
  try {
    const draft = await f.create({
      gradeReleaseTiming: 'instructor_release',
      solutionAccess: 'instructor_release',
    });
    const path = `/api/assignments/${draft.id}`;
    assert.equal((await f.request(f.owner, 'POST', path + '/publish', {})).statusCode, 200);
    assert.equal(
      (
        await f.request(f.owner, 'PATCH', path, {
          pointAllocations: draft.items.map((item: { id: string }) => ({
            itemId: item.id,
            maxPoints: 1,
          })),
        })
      ).statusCode,
      409,
    );
    const table = generateTruthTable('P');
    const tableAnswer = [
      {
        rowId: table.rows[0]!.id,
        columnId: table.columns.find((column) => column.kind === 'answer')!.id,
        value: true,
      },
    ];
    const studentPath = `/api/student/assignments/${draft.id}`;
    const initial = await f.request(f.student, 'GET', studentPath);
    assert.deepEqual(
      initial.json().assignment.items.map((item: { maxPoints: number }) => item.maxPoints),
      [20, 5],
    );
    const first = await f.request(f.student, 'PATCH', studentPath + '/attempt', {
      revision: 0,
      itemId: draft.items[0].id,
      answers: tableAnswer,
    });
    assert.equal(first.statusCode, 200, first.body);
    assert.equal(first.json().attempt.score, null);
    const second = await f.request(f.student, 'PATCH', studentPath + '/attempt', {
      revision: 1,
      itemId: draft.items[1].id,
      answers: { type: 'true_false', answer: false },
    });
    assert.equal(second.statusCode, 200, second.body);
    const final = await f.request(f.student, 'POST', studentPath + '/submission', { revision: 2 });
    assert.equal(final.statusCode, 200, final.body);
    assert.equal(final.json().attempt.result, null);
    assert.equal(final.json().attempt.score, null);
    assert.equal(final.json().attempt.gradePending, true);
    const retained = await f.em
      .fork()
      .findOneOrFail(f.db.AssignmentAttempt, final.json().attempt.id);
    assert.deepEqual(retained.score!.summary, {
      status: 'graded',
      maxPoints: 25,
      earnedPoints: 15,
      percentage: 60,
    });
    const frozen = structuredClone(retained.score);
    const retry = await f.request(f.student, 'POST', studentPath + '/submission', { revision: 0 });
    assert.deepEqual(retry.json().attempt, final.json().attempt);
    const summaries = await f.request(f.owner, 'GET', path + '/submissions');
    assert.equal(summaries.statusCode, 200, summaries.body);
    assert.deepEqual(summaries.json().submissions[0].score, retained.score);
    const review = await f.request(f.owner, 'GET', path + `/submissions/${retained.id}`);
    assert.equal(review.statusCode, 200, review.body);
    assert.deepEqual(review.json().attempt.score, retained.score);
    await f.assignments.release(f.owner.id, draft.id, 'answers');
    assert.equal((await f.work.read(f.student.id, draft.id)).attempt!.score, null);
    await f.assignments.release(f.owner.id, draft.id, 'grades');
    const visible = await f.work.read(f.student.id, draft.id);
    assert.deepEqual(visible.attempt!.score, frozen);
    assert.deepEqual((await f.work.submit(f.student.id, draft.id, 0)).score, frozen);
    await f.assignments.setArchived(f.owner.id, draft.id, true);
    await f.assignments.setArchived(f.owner.id, draft.id, false);
    assert.deepEqual((await f.work.read(f.student.id, draft.id)).attempt!.score, frozen);
    const copy = await f.assignments.duplicate(f.owner.id, draft.id);

    assert.deepEqual(
      copy.items.map((item) => item.maxPoints),
      [20, 5],
    );
    assert(
      copy.items.every(
        (item) => !draft.items.some((original: { id: string }) => original.id === item.id),
      ),
    );
    assert.equal(copy.publishedAt, null);
    assert.equal(copy.gradesReleasedAt, null);
    assert.equal(await f.em.count(f.db.AssignmentAttempt, { assignment: copy.id }), 0);
  } finally {
    await f.close();
  }
});

test('weighted item replacement validates references atomically and all graded finals receive a score', async () => {
  const f = await fixture();
  try {
    const draft = await f.create();
    const path = `/api/assignments/${draft.id}`;
    const invalid = await f.request(f.owner, 'PATCH', path, {
      title: 'Must not survive',
      items: [{ problemVersionId: randomUUID(), maxPoints: 9 }],
    });
    assert.equal(invalid.statusCode, 404, invalid.body);
    assert.deepEqual(await f.assignments.findOwned(f.owner.id, draft.id), draft);
    const changed = await f.request(f.owner, 'PATCH', path, {
      items: [
        { problemVersionId: f.versions[1]!.id, maxPoints: 7 },
        { problemVersionId: f.versions[1]!.id, maxPoints: 3 },
      ],
    });
    assert.equal(changed.statusCode, 200, changed.body);
    assert.deepEqual(
      changed.json().assignment.items.map((item: { maxPoints: number }) => item.maxPoints),
      [7, 3],
    );
    assert.notEqual(changed.json().assignment.items[0].id, changed.json().assignment.items[1].id);
    const plain = await f.create({
      items: undefined,
      problemVersionIds: [f.versions[1]!.id],
    });
    await f.assignments.publish(f.owner.id, plain.id);
    const result = await f.work.submit(f.student.id, plain.id, 0);
    assert.equal(result.score!.summary.maxPoints, 10);
    assert.equal(result.result!.gradingVersion, 'mixed_v1');
    assert.equal(
      (await f.em.fork().findOneOrFail(f.db.AssignmentAttempt, result.id)).score!.scoringVersion,
      'points_v1',
    );
    const broken = await f.create();
    await assert.rejects(
      f.em.nativeUpdate(f.db.AssignmentItem, broken.items[0].id, { maxPoints: null }),
    );
    await f.assignments.publish(f.owner.id, broken.id);
    assert((await f.em.fork().findOneOrFail(f.db.Assignment, broken.id)).publishedAt);
  } finally {
    await f.close();
  }
});

test('demo point scoring follows workspace transactions and rejects cross-visitor access', async () => {
  const f = await fixture();
  try {
    const start = await f.request(f.owner, 'POST', '/api/demo/start', { role: 'instructor' }, '');
    assert.equal(start.statusCode, 200, start.body);
    const cookieFor = (response: typeof start) => {
      const header = response.headers['set-cookie'];
      return (Array.isArray(header) ? header[0]! : header!).split(';')[0]!;
    };
    const instructorCookie = cookieFor(start);
    const classes = await f.request(
      f.owner,
      'GET',
      '/api/demo/resources/classes',
      undefined,
      instructorCookie,
    );
    const classroom = classes
      .json()
      .classrooms.find((value: { name: string }) => value.name.includes('Introduction'));
    const library = await f.request(
      f.owner,
      'GET',
      '/api/demo/resources/problems',
      undefined,
      instructorCookie,
    );
    const problem = library
      .json()
      .problems.find(
        (value: { definition: { type: string } }) => value.definition.type === 'true_false',
      );
    const publications = await f.request(
      f.owner,
      'GET',
      `/api/demo/resources/problems/${problem.id}/versions`,
      undefined,
      instructorCookie,
    );
    const created = await f.request(
      f.owner,
      'POST',
      `/api/demo/resources/classes/${classroom.id}/assignments`,
      {
        title: 'Demo points',
        items: [{ problemVersionId: publications.json().versions[0].id, maxPoints: 8 }],
      },
      instructorCookie,
    );
    assert.equal(created.statusCode, 201, created.body);
    const id = created.json().assignment.id;
    assert.equal(
      (
        await f.request(
          f.owner,
          'POST',
          `/api/demo/resources/assignments/${id}/publish`,
          {},
          instructorCookie,
        )
      ).statusCode,
      200,
    );
    const switched = await f.request(
      f.owner,
      'POST',
      '/api/demo/role',
      { role: 'student' },
      instructorCookie,
    );
    const studentCookie = cookieFor(switched);
    const final = await f.request(
      f.owner,
      'POST',
      `/api/demo/resources/student/assignments/${id}/submission`,
      { revision: 0 },
      studentCookie,
    );
    assert.equal(final.statusCode, 200, final.body);
    assert.deepEqual(final.json().attempt.score.summary, {
      status: 'graded',
      maxPoints: 8,
      earnedPoints: 0,
      percentage: 0,
    });
    assert.equal(
      (await f.request(f.student, 'GET', `/api/student/assignments/${id}`)).statusCode,
      404,
    );
    const other = await f.request(f.owner, 'POST', '/api/demo/start', { role: 'student' }, '');
    assert.equal(
      (
        await f.request(
          f.owner,
          'GET',
          `/api/demo/resources/student/assignments/${id}`,
          undefined,
          cookieFor(other),
        )
      ).statusCode,
      404,
    );
  } finally {
    await f.close();
  }
});
