import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { readAuthConfig } from '../../src/config/auth';
import { readDemoConfig } from '../../src/config/demo';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import type { AuthContext } from '../../src/routes/auth/context';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const questions = [
  {
    type: 'true_false',
    definitionVersion: 1,
    question: 'Every contradiction is true.',
    correctAnswer: false,
    explanation: 'Private false-answer explanation.',
  },
  {
    type: 'multiple_choice',
    definitionVersion: 1,
    question: 'Which is always false?',
    options: [
      { id: a, text: 'Contradiction' },
      { id: b, text: 'Tautology' },
    ],
    correctOptionId: a,
    explanation: 'Private choice explanation.',
  },
];

test('normal/demo conceptual authoring validates keys, scopes private snapshots and pins conceptual assignment versions', async () => {
  const db = await import('@logiclab/db');
  const schema = `conceptual_authoring_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url, { schema, snapshotOnMigrate: false });
  let app: ReturnType<typeof buildApp> | undefined;
  try {
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
    const classroom = em.create(db.Classroom, { owner, name: 'Normal authoring' });
    const student = em.create(db.User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'student',
      role: db.UserRole.Student,
    });
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
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 86_400_000),
      }),
    ]);
    await em.flush();
    let activeRole: 'instructor' | 'student' = 'instructor';
    let activeOwner = owner;
    const config = readAuthConfig({
      AUTH_ENABLED: 'true',
      AWS_REGION: 'us-east-1',
      COGNITO_USER_POOL_ID: 'us-east-1_test',
      COGNITO_CLIENT_ID: 'synthetic',
      COGNITO_CLIENT_SECRET: 'synthetic',
      AUTH_TOKEN_KEY: 'ab'.repeat(32),
      APP_ORIGIN: origin,
    })!;
    const context = {
      config,
      service: {
        authenticate: async () => ({
          id: activeOwner.id,
          subject: activeOwner.cognitoSubject,
          role: activeRole,
        }),
      },
    } as unknown as AuthContext;
    app = buildApp({
      problem: { ...context, problems: await createProblemStore(orm) },
      assignment: { ...context, assignments: await createAssignmentStore(orm) },
      demo: await createDemoRuntime(
        orm,
        readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: origin })!,
      ),
    });
    const work = await createStudentWorkStore(orm);
    let address = 1;
    async function request(
      method: 'POST' | 'GET' | 'PATCH',
      path: string,
      cookie: string,
      payload?: object,
    ) {
      return app!.inject({
        method,
        url: path,
        payload,
        headers: { origin, cookie },
        remoteAddress: `127.0.0.${address++}`,
      });
    }
    const started = await request('POST', '/api/demo/start', '', { role: 'instructor' });
    assert.equal(started.statusCode, 200, started.body);
    const cookieHeader = started.headers['set-cookie'];
    const demoCookie = (Array.isArray(cookieHeader) ? cookieHeader[0]! : cookieHeader!).split(
      ';',
    )[0]!;
    const demoOwner = started.json().user.id;
    const demoClass = await em.findOneOrFail(db.Classroom, {
      owner: demoOwner,
      name: 'Demo: Introduction to Logic',
    });
    const normalCookie = `logiclab_session=${'a'.repeat(43)}`;
    const scopes = [
      { prefix: '/api', cookie: normalCookie, classId: classroom.id },
      { prefix: '/api/demo/resources', cookie: demoCookie, classId: demoClass.id },
    ];
    for (const scope of scopes) {
      for (const definition of questions) {
        const base = scope.prefix + '/problems';
        const created = await request('POST', base, scope.cookie, {
          title: definition.type,
          definition,
        });
        assert.equal(created.statusCode, 201, created.body);
        assert.equal(created.headers['cache-control'], 'no-store');
        const problem = created.json().problem;
        assert.deepEqual(problem.definition, definition);
        const path = `${base}/${problem.id}`;
        const first = await request('POST', path + '/versions', scope.cookie, {});
        assert.equal(first.statusCode, 201, first.body);
        assert.deepEqual(first.json().version.definition, definition);
        const invalidDefinition =
          definition.type === 'true_false'
            ? { ...definition, correctAnswer: null }
            : { ...definition, correctOptionId: randomUUID() };
        const invalid = await request('PATCH', path, scope.cookie, {
          title: 'Must roll back',
          definition: invalidDefinition,
        });
        assert.equal(invalid.statusCode, 400, invalid.body);
        assert.deepEqual((await request('GET', path, scope.cookie)).json().problem, problem);
        const edited =
          definition.type === 'true_false'
            ? { ...definition, correctAnswer: true, explanation: 'New explanation' }
            : {
                ...definition,
                options: [
                  { id: b, text: 'Edited second' },
                  { id: a, text: 'Edited first' },
                ],
                correctOptionId: b,
                explanation: 'New explanation',
              };
        assert.equal(
          (await request('PATCH', path, scope.cookie, { definition: edited })).statusCode,
          200,
        );
        const second = await request('POST', path + '/versions', scope.cookie, {});
        assert.equal(second.statusCode, 201, second.body);
        assert.deepEqual(second.json().version.definition, edited);
        const old = await request('GET', path + '/versions/1', scope.cookie);
        assert.deepEqual(old.json().version.definition, definition);
        const history = await request('GET', path + '/versions', scope.cookie);
        assert.deepEqual(
          history.json().versions.map((value: { version: number }) => value.version),
          [2, 1],
        );
        assert.equal((await request('POST', path + '/archive', scope.cookie, {})).statusCode, 200);
        assert.equal(
          (await request('PATCH', path, scope.cookie, { title: 'Archived edit' })).statusCode,
          409,
        );
        assert.equal((await request('POST', path + '/restore', scope.cookie, {})).statusCode, 200);
        const assigned = await request(
          'POST',
          `${scope.prefix}/classes/${scope.classId}/assignments`,
          scope.cookie,
          { title: 'Conceptual assignment', problemVersionIds: [first.json().version.id] },
        );
        assert.equal(assigned.statusCode, 201, assigned.body);
        assert.deepEqual(assigned.json().assignment.items[0].problemVersion.definition, definition);
        assert.equal(
          await em.count(db.Assignment, {
            id: assigned.json().assignment.id,
            classroom: scope.classId,
          }),
          1,
        );
        const assignmentPath = `${scope.prefix}/assignments/${assigned.json().assignment.id}`;
        const updated = await request('PATCH', assignmentPath, scope.cookie, {
          problemVersionIds: [
            first.json().version.id,
            second.json().version.id,
            first.json().version.id,
          ],
        });
        assert.equal(updated.statusCode, 200, updated.body);
        assert.equal(
          new Set(updated.json().assignment.items.map((item: { id: string }) => item.id)).size,
          3,
        );
        const published = await request('POST', assignmentPath + '/publish', scope.cookie, {});
        assert.equal(published.statusCode, 200, published.body);
        assert.deepEqual(
          published.json().assignment.items[0].problemVersion.definition,
          definition,
        );
        assert.deepEqual(published.json().assignment.items[1].problemVersion.definition, edited);
        const assignedStudent =
          scope.prefix === '/api'
            ? student
            : await em.findOneOrFail(db.User, {
                demoWorkspace: (await em.findOneOrFail(db.User, demoOwner)).demoWorkspace!.id,
                role: db.UserRole.Student,
              });
        const studentView = await work.read(assignedStudent.id, assigned.json().assignment.id);
        assert.equal(studentView.assignment.items.length, 3);
        for (const key of ['correctAnswer', 'correctOptionId', 'explanation'])
          assert.equal(JSON.stringify(studentView).includes(`"${key}"`), false);
        const final = await work.submit(assignedStudent.id, assigned.json().assignment.id, 0);
        assert.equal(final.result?.gradingVersion, 'mixed_v1');
        if (scope.prefix === '/api') {
          activeRole = 'student';
          assert.equal((await request('GET', path, scope.cookie)).statusCode, 403);
          activeRole = 'instructor';
          activeOwner = other;
          assert.equal((await request('GET', path, scope.cookie)).statusCode, 404);
          activeOwner = owner;
          assert.equal(
            (await request('GET', `/api/demo/resources/problems/${problem.id}`, demoCookie))
              .statusCode,
            404,
          );
        } else {
          assert.equal(
            (await request('GET', `/api/problems/${problem.id}`, normalCookie)).statusCode,
            404,
          );
        }
      }
    }
  } finally {
    await app?.close();
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
