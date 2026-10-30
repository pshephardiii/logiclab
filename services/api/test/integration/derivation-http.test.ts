import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { derivationDefinitionFixture } from '../derivation-fixture';
import type { ResourceUser } from '../../src/routes/resource-context';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';

test('private normal/demo derivation HTTP authoring checks saved references and preserves assignment guards', async () => {
  const db = await import('@logiclab/db');
  const schema = `derivation_http_${randomUUID().replaceAll('-', '')}`;
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
    const classroom = em.create(db.Classroom, { owner, name: 'Derivation HTTP guard' });
    em.persist([owner, other, classroom]);
    await em.flush();
    let active: ResourceUser = { id: owner.id, role: 'instructor' };
    const context = {
      config: { APP_ORIGIN: origin, secureCookies: false },
      service: { authenticate: async () => active },
    };
    app = buildApp({
      problem: { ...context, problems: await createProblemStore(orm) },
      assignment: { ...context, assignments: await createAssignmentStore(orm) },
      demo: await createDemoRuntime(
        orm,
        readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: origin })!,
      ),
    });
    let address = 1;
    const request = (
      method: 'GET' | 'POST' | 'PATCH',
      path: string,
      cookie: string,
      payload?: object,
    ) =>
      app!.inject({
        method,
        url: path,
        payload,
        headers: { origin, cookie },
        remoteAddress: `127.0.0.${address++}`,
      });
    const start = await request('POST', '/api/demo/start', '', { role: 'instructor' });
    assert.equal(start.statusCode, 200, start.body);
    const cookies = start.headers['set-cookie'];
    const demoCookie = (Array.isArray(cookies) ? cookies[0]! : cookies!).split(';')[0]!;
    const secondStart = await request('POST', '/api/demo/start', '', { role: 'instructor' });
    assert.equal(secondStart.statusCode, 200, secondStart.body);
    const secondCookies = secondStart.headers['set-cookie'];
    const secondDemoCookie = (
      Array.isArray(secondCookies) ? secondCookies[0]! : secondCookies!
    ).split(';')[0]!;
    const demoClass = await em.findOneOrFail(db.Classroom, { owner: start.json().user.id });
    const normalCookie = `logiclab_session=${'a'.repeat(43)}`;
    for (const scope of [
      { prefix: '/api', cookie: normalCookie, classroom: classroom.id },
      { prefix: '/api/demo/resources', cookie: demoCookie, classroom: demoClass.id },
    ]) {
      const path = `${scope.prefix}/problems`;
      const definition = derivationDefinitionFixture();
      const created = await request('POST', path, scope.cookie, {
        title: 'Private derivation',
        definition: { ...definition, referenceProof: null },
      });
      assert.equal(created.statusCode, 201, created.body);
      assert.equal(created.headers['cache-control'], 'no-store');
      const id = created.json().problem.id;
      const checkPath = `${path}/${id}/reference-check`;
      if (scope.prefix === '/api/demo/resources') {
        assert.equal((await request('GET', `${path}/${id}`, secondDemoCookie)).statusCode, 404);
        assert.equal((await request('POST', checkPath, secondDemoCookie, {})).statusCode, 404);
        assert.equal(
          (await request('POST', `${path}/${id}/versions`, secondDemoCookie, {})).statusCode,
          404,
        );
      }
      assert.equal(
        (await request('POST', checkPath, scope.cookie, {})).json().check.status,
        'missing',
      );
      const missing = await request('POST', `${path}/${id}/versions`, scope.cookie, {});
      assert.equal(missing.statusCode, 409, missing.body);
      assert.equal(missing.json().error.code, 'DERIVATION_REFERENCE_REQUIRED');
      const update = await request('PATCH', `${path}/${id}`, scope.cookie, { definition });
      assert.equal(update.statusCode, 200, update.body);
      const checked = await request('POST', checkPath, scope.cookie, {});
      assert.equal(checked.statusCode, 200, checked.body);
      assert.equal(checked.json().check.report.status, 'accepted');
      assert.equal(checked.json().updatedAt, update.json().problem.updatedAt);
      assert.equal(
        (await request('POST', checkPath, scope.cookie, { definition })).statusCode,
        400,
      );
      const changed = await request('PATCH', `${path}/${id}`, scope.cookie, {
        definition: { ...definition, conclusion: 'Q' },
      });
      assert.equal(changed.statusCode, 200, changed.body);
      const rejected = await request('POST', `${path}/${id}/versions`, scope.cookie, {});
      assert.equal(rejected.statusCode, 409, rejected.body);
      assert.equal(rejected.json().error.code, 'DERIVATION_REFERENCE_NOT_ACCEPTED');
      await request('PATCH', `${path}/${id}`, scope.cookie, { definition });
      const published = await request('POST', `${path}/${id}/versions`, scope.cookie, {});
      assert.equal(published.statusCode, 201, published.body);
      assert.deepEqual(published.json().version.definition, definition);
      const version = published.json().version;
      await request('PATCH', `${path}/${id}`, scope.cookie, {
        definition: { ...definition, explanation: 'Changed draft', referenceProof: null },
      });
      assert.deepEqual(
        (await request('GET', `${path}/${id}/versions/1`, scope.cookie)).json().version,
        version,
      );
      assert.equal(
        (await request('GET', `${path}/${id}/versions`, scope.cookie)).json().versions.length,
        1,
      );
      assert(
        (await request('GET', path, scope.cookie))
          .json()
          .problems.some((problem: { id: string }) => problem.id === id),
      );
      assert.equal(
        (
          await request(
            'POST',
            `${scope.prefix}/classes/${scope.classroom}/assignments`,
            scope.cookie,
            {
              title: 'Guarded',
              problemVersionIds: [version.id],
              assessmentMode: 'graded',
              feedbackTiming: 'on_submission',
              solutionAccess: 'never',
            },
          )
        ).statusCode,
        409,
      );
      await request('POST', `${path}/${id}/archive`, scope.cookie, {});
      assert.equal(
        (await request('PATCH', `${path}/${id}`, scope.cookie, { title: 'Blocked' })).statusCode,
        409,
      );
      assert.equal(
        (await request('POST', `${path}/${id}/versions`, scope.cookie, {})).statusCode,
        409,
      );
      assert.equal((await request('POST', checkPath, scope.cookie, {})).statusCode, 200);
      await request('POST', `${path}/${id}/restore`, scope.cookie, {});
      assert.equal(
        (await request('GET', `${path}/${id}`, scope.cookie)).json().problem.archivedAt,
        null,
      );
      // Neither another normal instructor nor a cookie in the other namespace can read private work.
      active = { id: other.id, role: 'instructor' };
      assert.equal((await request('GET', `/api/problems/${id}`, normalCookie)).statusCode, 404);
      assert.equal(
        (await request('POST', `/api/problems/${id}/reference-check`, normalCookie, {})).statusCode,
        404,
      );
      assert.equal(
        (
          await request(
            'GET',
            `${scope.prefix === '/api' ? '/api/demo/resources' : '/api'}/problems/${id}`,
            scope.prefix === '/api' ? demoCookie : normalCookie,
          )
        ).statusCode,
        404,
      );
      active = { id: owner.id, role: 'student' };
      assert.equal((await request('GET', `/api/problems/${id}`, normalCookie)).statusCode, 403);
      active = { id: owner.id, role: 'instructor' };
    }
  } finally {
    await app?.close();
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
