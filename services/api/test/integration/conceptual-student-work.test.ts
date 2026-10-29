import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { readAuthConfig } from '../../src/config/auth';
import { readDemoConfig } from '../../src/config/demo';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import type { AuthContext } from '../../src/routes/auth/context';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { generateTruthTable } from '@logiclab/logic-engine';
import type { ProblemDefinition } from '@logiclab/contracts';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const first = 'b1111111-1111-4111-8111-111111111111';
const second = 'b2222222-2222-4222-8222-222222222222';
const definitions: ProblemDefinition[] = [
  { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
  {
    type: 'true_false',
    definitionVersion: 1,
    question: 'Every contradiction is true.',
    correctAnswer: false,
    explanation: 'Private false explanation.',
  },
  {
    type: 'multiple_choice',
    definitionVersion: 1,
    question: 'Which is always false?',
    options: [
      { id: first, text: 'Contradiction' },
      { id: second, text: 'Tautology' },
    ],
    correctOptionId: first,
    explanation: 'Private choice explanation.',
  },
];

async function fixture() {
  const db = await import('@logiclab/db');
  const schema = `conceptual_work_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  await orm.schema.create();
  const em = orm.em.fork();
  const owner = em.create(db.User, {
    cognitoUserPoolId: schema,
    cognitoSubject: 'owner',
    role: db.UserRole.Instructor,
  });
  const student = em.create(db.User, {
    cognitoUserPoolId: schema,
    cognitoSubject: 'student',
    role: db.UserRole.Student,
  });
  const outsider = em.create(db.User, {
    cognitoUserPoolId: schema,
    cognitoSubject: 'outsider',
    role: db.UserRole.Student,
  });
  const classroom = em.create(db.Classroom, { owner, name: 'Mixed work' });
  em.persist([
    owner,
    student,
    outsider,
    classroom,
    em.create(db.Enrollment, { student, classroom }),
  ]);
  await em.flush();
  const work = await createStudentWorkStore(orm);
  const assignments = await createAssignmentStore(orm);
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
  // Pin fixtures directly to isolate storage/release checks from the separately tested authoring flow.
  async function pinned(mode = db.AssessmentMode.Graded) {
    const assignment = em.create(db.Assignment, {
      classroom,
      title: mode,
      assessmentMode: mode,
      publishedAt: new Date(),
      feedbackTiming:
        mode === db.AssessmentMode.Graded
          ? db.FeedbackTiming.OnSubmission
          : db.FeedbackTiming.OnCheck,
      solutionAccess:
        mode === db.AssessmentMode.UngradedPractice
          ? db.SolutionAccess.Anytime
          : db.SolutionAccess.InstructorRelease,
      gradeReleaseTiming:
        mode === db.AssessmentMode.Graded
          ? db.GradeReleaseTiming.InstructorRelease
          : db.GradeReleaseTiming.OnSubmission,
    });
    const items = [...definitions, definitions[1]!].map((definition, index) => {
      const problem = em.create(db.Problem, { owner, title: `Question ${index}`, definition });
      const version = em.create(db.ProblemVersion, {
        problem,
        version: 1,
        title: problem.title,
        definition,
      });
      const item = em.create(db.AssignmentItem, {
        assignment,
        problemVersion: version,
        position: index + 1,
      });
      em.persist([problem, version, item]);
      return item;
    });
    em.persist(assignment);
    await em.flush();
    return { assignment, items };
  }
  const close = async () => {
    await app.close();
    await em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  };
  return { db, orm, em, owner, student, outsider, work, assignments, request, pinned, close };
}

function noSecrets(value: unknown) {
  const json = JSON.stringify(value);
  for (const key of ['correctAnswer', 'correctOptionId', 'explanation'])
    assert.equal(json.includes(`"${key}"`), false, json);
}
function tableAnswers() {
  const table = generateTruthTable('P & Q');
  return table.rows.flatMap((row) =>
    table.columns
      .filter((column) => column.kind === 'answer')
      .map((column) => ({ rowId: row.id, columnId: column.id, value: row.values[column.id]! })),
  );
}

test('mixed graded HTTP work persists typed answers and freezes independent grade/answer disclosures', async () => {
  const f = await fixture();
  try {
    const { assignment, items } = await f.pinned();
    const path = `/api/student/assignments/${assignment.id}`;
    const read = await f.request(f.student, 'GET', path);
    assert.equal(read.statusCode, 200, read.body);
    noSecrets(read.json());
    assert.equal(read.json().assignment.items[1].content.type, 'true_false');
    const answers = [
      tableAnswers(),
      { type: 'true_false', answer: false },
      { type: 'multiple_choice', optionId: second },
      { type: 'true_false', answer: null },
    ];
    let revision = 0;
    for (const [index, item] of items.entries()) {
      const saved = await f.request(f.student, 'PATCH', path + '/attempt', {
        itemId: item.id,
        revision,
        answers: answers[index],
      });
      assert.equal(saved.statusCode, 200, saved.body);
      revision = saved.json().attempt.revision;
      noSecrets(saved.json());
    }
    const stale = await f.request(f.student, 'PATCH', path + '/attempt', {
      itemId: items[1]!.id,
      revision: 0,
      answers: { type: 'true_false', answer: true },
    });
    assert.equal(stale.statusCode, 409);
    const invalid = await f.request(f.student, 'PATCH', path + '/attempt', {
      itemId: items[2]!.id,
      revision,
      answers: { type: 'multiple_choice', optionId: randomUUID() },
    });
    assert.equal(invalid.statusCode, 400, invalid.body);
    assert.equal((await f.work.read(f.student.id, assignment.id)).attempt!.revision, revision);
    const submitted = await f.request(f.student, 'POST', path + '/submission', { revision });
    assert.equal(submitted.statusCode, 200, submitted.body);
    assert.equal(submitted.json().attempt.result, null);
    assert.equal(submitted.json().attempt.gradePending, true);
    noSecrets(submitted.json());
    const pending = submitted.json().attempt;
    const retry = await f.request(f.student, 'POST', path + '/submission', { revision: 0 });
    assert.deepEqual(retry.json().attempt, pending);
    assert.equal(
      (await f.request(f.student, 'GET', path + `/items/${items[1]!.id}/solution`)).statusCode,
      403,
    );
    const reviews = await f.assignments.listSubmissions(f.owner.id, assignment.id, {
      limit: 20,
      offset: 0,
    });
    assert.equal(reviews.length, 1);
    const review = await f.request(
      f.owner,
      'GET',
      `/api/assignments/${assignment.id}/submissions/${pending.id}`,
    );
    assert.equal(review.statusCode, 200, review.body);
    const frozen = review.json().attempt.result;
    assert.equal(frozen.gradingVersion, 'mixed_v1');
    assert.deepEqual(frozen.summary, {
      correct: tableAnswers().length + 1,
      incorrect: 1,
      unanswered: 1,
      total: tableAnswers().length + 3,
    });
    noSecrets(review.json());
    // Draft edits cannot replace the published key used by either grading or reveal.
    await f.em.nativeUpdate(f.db.Problem, items[1]!.problemVersion.problem.id, {
      definition: {
        type: 'true_false',
        definitionVersion: 1,
        question: 'Edited draft',
        correctAnswer: true,
        explanation: 'Changed draft explanation.',
      },
    });
    const reveal = await f.request(
      f.owner,
      'POST',
      `/api/assignments/${assignment.id}/reveal-answers`,
      {},
    );
    assert.equal(reveal.statusCode, 200, reveal.body);
    const solution = await f.request(f.student, 'GET', path + `/items/${items[1]!.id}/solution`);
    assert.equal(solution.statusCode, 200, solution.body);
    assert.deepEqual(solution.json().solution, {
      type: 'true_false',
      correctAnswer: false,
      explanation: 'Private false explanation.',
    });
    assert.equal((await f.work.read(f.student.id, assignment.id)).attempt!.result, null);
    const released = await f.request(
      f.owner,
      'POST',
      `/api/assignments/${assignment.id}/release-grades`,
      {},
    );
    assert.equal(released.statusCode, 200, released.body);
    const visible = await f.work.read(f.student.id, assignment.id);
    assert.deepEqual(visible.attempt!.result, frozen);
    noSecrets(visible);
    assert.deepEqual((await f.work.submit(f.student.id, assignment.id, 0)).result, frozen);
    const lateSave = await f.request(f.student, 'PATCH', path + '/attempt', {
      itemId: items[1]!.id,
      revision: pending.revision,
      answers: { type: 'true_false', answer: true },
    });
    assert.equal(lateSave.statusCode, 409);
    assert.equal((await f.request(f.outsider, 'GET', path)).statusCode, 404);
    assert.equal(
      (
        await f.request(
          f.student,
          'GET',
          `/api/assignments/${assignment.id}/submissions/${pending.id}`,
        )
      ).statusCode,
      403,
    );
    const demoStart = await f.request(f.owner, 'POST', '/api/demo/start', { role: 'student' }, '');
    assert.equal(demoStart.statusCode, 200, demoStart.body);
    const header = demoStart.headers['set-cookie'];
    const cookie = (Array.isArray(header) ? header[0]! : header!).split(';')[0]!;
    assert.equal(
      (
        await f.request(
          f.student,
          'GET',
          `/api/demo/resources/student/assignments/${assignment.id}`,
          undefined,
          cookie,
        )
      ).statusCode,
      404,
    );
  } finally {
    await f.close();
  }
});

test('mixed completion and practice enforce filled responses without exposing correctness or private drafts', async () => {
  const f = await fixture();
  try {
    for (const mode of [f.db.AssessmentMode.CompletionOnly, f.db.AssessmentMode.UngradedPractice]) {
      const { assignment, items } = await f.pinned(mode);
      const path = `/api/student/assignments/${assignment.id}`;
      const check = await f.request(f.student, 'POST', path + '/check', {
        itemId: items[1]!.id,
        answers: { type: 'true_false', answer: true },
      });
      assert.equal(check.statusCode, 200, check.body);
      assert.deepEqual(check.json().feedback, { status: 'incorrect' });
      noSecrets(check.json());
      assert.equal(await f.em.count(f.db.AssignmentAttempt, { assignment: assignment.id }), 0);
      const forged = await f.request(f.student, 'POST', path + '/check', {
        itemId: items[2]!.id,
        answers: { type: 'true_false', answer: false },
      });
      assert.equal(forged.statusCode, 400);
      const values = [
        tableAnswers(),
        { type: 'true_false', answer: true },
        { type: 'multiple_choice', optionId: second },
        { type: 'true_false', answer: false },
      ];
      let revision = 0;
      for (const [index, item] of items.entries()) {
        if (index === items.length - 1 && mode === f.db.AssessmentMode.CompletionOnly) {
          const incomplete = await f.request(f.student, 'POST', path + '/submission', { revision });
          assert.equal(incomplete.statusCode, 409, incomplete.body);
          assert.equal((await f.work.read(f.student.id, assignment.id)).attempt!.submittedAt, null);
        }
        const save = await f.request(f.student, 'PATCH', path + '/attempt', {
          revision,
          itemId: item.id,
          answers: values[index],
        });
        assert.equal(save.statusCode, 200, save.body);
        revision = save.json().attempt.revision;
      }
      if (mode === f.db.AssessmentMode.UngradedPractice) {
        assert.equal(
          (await f.request(f.student, 'POST', path + '/submission', { revision })).statusCode,
          403,
        );
        await assert.rejects(() =>
          f.assignments.listSubmissions(f.owner.id, assignment.id, { offset: 0, limit: 20 }),
        );
        const solution = await f.request(
          f.student,
          'GET',
          path + `/items/${items[2]!.id}/solution`,
        );
        assert.deepEqual(solution.json().solution, {
          type: 'multiple_choice',
          correctOptionId: first,
          explanation: 'Private choice explanation.',
        });
      } else {
        const submit = await f.request(f.student, 'POST', path + '/submission', { revision });
        assert.equal(submit.statusCode, 200, submit.body);
        const result = submit.json().attempt.result;
        assert.equal(result.gradingVersion, 'mixed_completion_v1');
        assert.deepEqual(result.summary, {
          completedResponses: tableAnswers().length + 3,
          totalResponses: tableAnswers().length + 3,
        });
        noSecrets(result);
        assert.equal(JSON.stringify(result).includes('correct'), false);
        assert.equal(
          (
            await f.request(f.student, 'POST', path + '/check', {
              itemId: items[1]!.id,
              answers: values[1],
            })
          ).statusCode,
          409,
        );
      }
    }
  } finally {
    await f.close();
  }
});

test('grade release does not reveal conceptual answer keys, and demo work stays workspace scoped', async () => {
  const f = await fixture();
  try {
    const { assignment, items } = await f.pinned();
    const submitted = await f.work.submit(f.student.id, assignment.id, 0);
    const release = await f.request(
      f.owner,
      'POST',
      `/api/assignments/${assignment.id}/release-grades`,
      {},
    );
    assert.equal(release.statusCode, 200, release.body);
    const visible = await f.work.read(f.student.id, assignment.id);
    assert.equal(visible.attempt!.result!.gradingVersion, 'mixed_v1');
    noSecrets(visible);
    assert.equal(
      (
        await f.request(
          f.student,
          'GET',
          `/api/student/assignments/${assignment.id}/items/${items[1]!.id}/solution`,
        )
      ).statusCode,
      403,
    );
    assert.deepEqual(
      (await f.work.submit(f.student.id, assignment.id, submitted.revision)).result,
      visible.attempt!.result,
    );

    const started = await f.request(f.owner, 'POST', '/api/demo/start', { role: 'instructor' }, '');
    assert.equal(started.statusCode, 200, started.body);
    const cookieFor = (response: typeof started) => {
      const header = response.headers['set-cookie'];
      return (Array.isArray(header) ? header[0]! : header!).split(';')[0]!;
    };
    let cookie = cookieFor(started);
    const demoOwner = f.em.getReference(f.db.User, started.json().user.id);
    const classroom = await f.em.findOneOrFail(f.db.Classroom, {
      owner: demoOwner.id,
      name: 'Demo: Introduction to Logic',
    });
    const definition = definitions[1]!;
    const problem = f.em.create(f.db.Problem, {
      owner: demoOwner,
      title: 'Demo concept',
      definition,
    });
    const version = f.em.create(f.db.ProblemVersion, {
      problem,
      version: 1,
      title: problem.title,
      definition,
    });
    const demoAssignment = f.em.create(f.db.Assignment, {
      classroom,
      title: 'Demo concept assignment',
      publishedAt: new Date(),
      solutionAccess: f.db.SolutionAccess.InstructorRelease,
    });
    const item = f.em.create(f.db.AssignmentItem, {
      assignment: demoAssignment,
      problemVersion: version,
      position: 1,
    });
    f.em.persist([problem, version, demoAssignment, item]);
    await f.em.flush();
    const switched = await f.request(
      f.owner,
      'POST',
      '/api/demo/role',
      { role: 'student' },
      cookie,
    );
    assert.equal(switched.statusCode, 200, switched.body);
    cookie = cookieFor(switched);
    const path = `/api/demo/resources/student/assignments/${demoAssignment.id}`;
    const read = await f.request(f.owner, 'GET', path, undefined, cookie);
    assert.equal(read.statusCode, 200, read.body);
    noSecrets(read.json());
    const saved = await f.request(
      f.owner,
      'PATCH',
      path + '/attempt',
      { revision: 0, itemId: item.id, answers: { type: 'true_false', answer: false } },
      cookie,
    );
    assert.equal(saved.statusCode, 200, saved.body);
    const final = await f.request(
      f.owner,
      'POST',
      path + '/submission',
      { revision: saved.json().attempt.revision },
      cookie,
    );
    assert.equal(final.statusCode, 200, final.body);
    assert.equal(final.json().attempt.result.gradingVersion, 'mixed_v1');
    assert.deepEqual(final.json().attempt.result.summary, {
      correct: 1,
      incorrect: 0,
      unanswered: 0,
      total: 1,
    });
    noSecrets(final.json());
    assert.equal(
      (await f.request(f.student, 'GET', `/api/student/assignments/${demoAssignment.id}`))
        .statusCode,
      404,
    );
    const visitor = await f.request(f.owner, 'POST', '/api/demo/start', { role: 'student' }, '');
    assert.equal(visitor.statusCode, 200, visitor.body);
    assert.equal(
      (await f.request(f.owner, 'GET', path, undefined, cookieFor(visitor))).statusCode,
      404,
    );
    const instructor = await f.request(
      f.owner,
      'POST',
      '/api/demo/role',
      { role: 'instructor' },
      cookie,
    );
    assert.equal(instructor.statusCode, 200, instructor.body);
    const review = await f.request(
      f.owner,
      'GET',
      `/api/demo/resources/assignments/${demoAssignment.id}/submissions/${final.json().attempt.id}`,
      undefined,
      cookieFor(instructor),
    );
    assert.equal(review.statusCode, 200, review.body);
    noSecrets(review.json());
  } finally {
    await f.close();
  }
});
