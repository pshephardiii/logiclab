import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { createProblemStore } from '../../src/persistence/problem/store';
import { readAuthConfig } from '../../src/config/auth';
import type { AuthContext } from '../../src/routes/auth/context';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Set TEST_DATABASE_URL to a disposable _test database.');

test('private library persists scoped drafts, paginates active records, and protects archived content', async () => {
  const { createDatabase, User, UserRole, Problem } = await import('@logiclab/db');
  const orm = await createDatabase(url, { snapshotOnMigrate: false });
  const em = orm.em.fork();
  const pool = `problem-test-${randomUUID()}`;
  const owner = em.create(User, {
    cognitoUserPoolId: pool,
    cognitoSubject: 'owner',
    role: UserRole.Instructor,
  });
  const other = em.create(User, {
    cognitoUserPoolId: pool,
    cognitoSubject: 'other',
    role: UserRole.Instructor,
  });
  const student = em.create(User, {
    cognitoUserPoolId: pool,
    cognitoSubject: 'student',
    role: UserRole.Student,
  });
  let active = owner;
  const store = await createProblemStore(orm);
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
        role: active.role,
        subject: active.cognitoSubject,
      }),
    },
  } as unknown as AuthContext;
  const app = buildApp({ problem: { ...context, problems: store } });
  const headers = { origin: config.APP_ORIGIN, cookie: `logiclab_session=${'x'.repeat(43)}` };
  const definition = {
    type: 'truth_table' as const,
    definitionVersion: 1 as const,
    formula: 'P & Q',
  };
  let address = 1;
  const request = (options: { method: 'POST' | 'GET' | 'PATCH'; url: string; payload?: object }) =>
    app.inject({ ...options, headers, remoteAddress: `127.0.0.${address++}` });
  try {
    em.persist([owner, other, student]);
    await em.flush();
    const created = await request({
      method: 'POST',
      url: '/api/problems',
      payload: { title: '  Logic  ', instructions: '  Complete it  ', definition },
    });
    assert.equal(created.statusCode, 201);
    const draft = created.json().problem;
    assert.equal(draft.title, 'Logic');
    assert.equal(draft.instructions, 'Complete it');
    const id = draft.id as string;
    assert.equal((await em.findOneOrFail(Problem, id, { populate: ['owner'] })).owner.id, owner.id);
    await store.create(owner.id, { title: 'Another', definition });
    await store.create(other.id, { title: 'Private elsewhere', definition });
    const page = await request({ method: 'GET', url: '/api/problems?limit=1' });
    assert.equal(page.json().problems.length, 1);
    assert.equal(page.json().nextOffset, 1);
    const last = await request({ method: 'GET', url: '/api/problems?limit=1&offset=1' });
    assert.equal(last.json().problems.length, 1);
    assert.equal(last.json().nextOffset, null);
    assert.notEqual(page.json().problems[0].id, last.json().problems[0].id);
    const edited = await request({
      method: 'PATCH',
      url: `/api/problems/${id}`,
      payload: { instructions: null },
    });
    assert.equal(edited.statusCode, 200);
    assert.equal(edited.json().problem.instructions, null);
    assert.equal(edited.json().problem.title, 'Logic');
    assert.deepEqual(edited.json().problem.definition, definition);
    const invalid = await request({
      method: 'PATCH',
      url: `/api/problems/${id}`,
      payload: { definition: { ...definition, formula: 'P &' } },
    });
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual((await store.findOwned(owner.id, id))!.definition, definition);
    active = other;
    const foreignRead = await request({ method: 'GET', url: `/api/problems/${id}` });
    const missingRead = await request({ method: 'GET', url: `/api/problems/${randomUUID()}` });
    assert.equal(foreignRead.statusCode, 404);
    assert.deepEqual(foreignRead.json(), missingRead.json());
    assert.equal(
      (await request({ method: 'PATCH', url: `/api/problems/${id}`, payload: { title: 'Stolen' } }))
        .statusCode,
      404,
    );
    active = student;
    assert.equal((await request({ method: 'GET', url: '/api/problems' })).statusCode, 403);
    active = owner;
    await em.nativeUpdate(Problem, id, { archivedAt: new Date() });
    assert.equal(
      (
        await request({
          method: 'PATCH',
          url: `/api/problems/${id}`,
          payload: { title: 'Archived edit' },
        })
      ).statusCode,
      409,
    );
    assert.equal((await request({ method: 'GET', url: `/api/problems/${id}` })).statusCode, 200);
    assert.equal(
      (await request({ method: 'GET', url: '/api/problems' })).json().problems.length,
      1,
    );
    const reconnected = await createProblemStore(orm);
    assert.equal((await reconnected.findOwned(owner.id, id))!.title, 'Logic');
  } finally {
    await app.close();
    try {
      await em.nativeDelete(Problem, { owner: { $in: [owner.id, other.id] } });
      await em.nativeDelete(User, { cognitoUserPoolId: pool });
    } finally {
      await orm.close(true);
    }
  }
});
