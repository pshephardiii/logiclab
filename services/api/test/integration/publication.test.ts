import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { createProblemStore } from '../../src/persistence/problem/store';
import { readAuthConfig } from '../../src/config/auth';
import type { AuthContext } from '../../src/routes/auth/context';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

/** Wait for a real lock wait in this test's private schema, rather than assuming a delay proves blocking. */
async function waitForLock(orm: Awaited<ReturnType<typeof createDatabase>>, schema: string) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const rows = await orm.em
      .fork()
      .getConnection()
      .execute<{ count: number }[]>(
        `select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like '%${schema}%'`,
      );
    if (rows[0]!.count > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('Expected publication to wait on the parent row lock.');
}

test(
  'publication snapshots, archive/restore, scoped history, and concurrent numbering preserve immutable content',
  { timeout: 30_000 },
  async () => {
    const { createDatabase, User, UserRole, Problem, ProblemVersion } =
      await import('@logiclab/db');
    // Own a disposable schema so cleanup never bypasses immutable-row protections.
    const schema = `publication_${randomUUID().replaceAll('-', '')}`;
    const orm = await createDatabase(url, { snapshotOnMigrate: false, schema });
    const em = orm.em.fork();
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
    let user = {
      id: randomUUID() as string,
      subject: 'owner',
      role: 'instructor' as 'instructor' | 'student',
    };
    const context = {
      config,
      service: { authenticate: async () => user },
    } as unknown as AuthContext;
    const app = buildApp({ problem: { ...context, problems: store } });
    const headers = { origin: config.APP_ORIGIN, cookie: `logiclab_session=${'x'.repeat(43)}` };
    let address = 1;
    const request = (method: 'GET' | 'POST' | 'PATCH', path: string, payload?: object) =>
      app.inject({ method, url: path, payload, headers, remoteAddress: `127.0.0.${address++}` });
    try {
      await orm.schema.create();
      const owner = em.create(User, {
        id: user.id,
        cognitoUserPoolId: schema,
        cognitoSubject: 'owner',
        role: UserRole.Instructor,
      });
      const other = em.create(User, {
        cognitoUserPoolId: schema,
        cognitoSubject: 'other',
        role: UserRole.Instructor,
      });
      em.persist([owner, other]);
      await em.flush();
      const problem = await store.create(owner.id, {
        title: 'Original',
        instructions: 'Initial instructions',
        definition: { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
      });
      const path = `/api/problems/${problem.id}`;
      const publish = () => request('POST', `${path}/versions`, {});
      const concurrent = await Promise.all([publish(), publish()]);
      assert(concurrent.every((response) => response.statusCode === 201));
      assert.deepEqual(
        concurrent.map((response) => response.json().version.version).sort(),
        [1, 2],
      );
      const first = (await request('GET', `${path}/versions/1`)).json().version;
      assert.equal(first.title, 'Original');
      assert.equal(first.instructions, 'Initial instructions');
      const page = await request('GET', `${path}/versions?limit=1`);
      assert.equal(page.json().versions[0].version, 2);
      assert.equal(page.json().nextOffset, 1);
      assert.equal(
        (await request('GET', `${path}/versions?limit=1&offset=1`)).json().nextOffset,
        null,
      );
      assert.equal(
        (
          await request('PATCH', path, {
            title: 'Changed',
            instructions: null,
            definition: { type: 'truth_table', definitionVersion: 1, formula: 'Q' },
          })
        ).statusCode,
        200,
      );
      const third = (await publish()).json().version;
      assert.equal(third.version, 3);
      assert.equal(third.title, 'Changed');
      assert.equal(third.instructions, null);
      assert.deepEqual((await request('GET', `${path}/versions/1`)).json().version, first);
      await assert.rejects(
        em.nativeUpdate(ProblemVersion, first.id, { title: 'Tampered' }),
        /immutable/,
      );
      await assert.rejects(em.nativeDelete(ProblemVersion, first.id), /immutable/);
      const archived = (await request('POST', `${path}/archive`, {})).json().problem;
      assert(archived.archivedAt);
      assert.deepEqual((await request('POST', `${path}/archive`, {})).json().problem, archived);
      assert.equal((await publish()).statusCode, 409);
      assert.equal((await request('PATCH', path, { title: 'Blocked' })).statusCode, 409);
      assert.equal((await request('GET', '/api/problems')).json().problems.length, 0);
      assert.equal(
        (await request('GET', '/api/problems?archive=archived')).json().problems.length,
        1,
      );
      assert.equal((await request('GET', '/api/problems?archive=all')).json().problems.length, 1);
      assert.deepEqual((await request('GET', `${path}/versions/1`)).json().version, first);
      assert.equal((await request('POST', `${path}/restore`, {})).json().problem.archivedAt, null);
      assert.equal((await request('POST', `${path}/restore`, {})).json().problem.archivedAt, null);
      assert.equal((await publish()).json().version.version, 4);
      user = { id: other.id, subject: 'other', role: 'instructor' };
      for (const [method, suffix] of [
        ['GET', '/versions'],
        ['GET', '/versions/1'],
        ['POST', '/versions'],
        ['POST', '/archive'],
        ['POST', '/restore'],
      ] as const) {
        assert.equal(
          (await request(method, path + suffix, method === 'POST' ? {} : undefined)).statusCode,
          404,
        );
      }
      user = { id: owner.id, subject: 'owner', role: 'student' };
      assert.equal((await request('GET', `${path}/versions/1`)).statusCode, 403);
      user = { id: owner.id, subject: 'owner', role: 'instructor' };

      const lock = orm.em.fork();
      await lock.begin();
      let pending: ReturnType<ProblemStorePublish> | undefined;
      try {
        await lock.nativeUpdate(Problem, problem.id, { title: 'Committed before publication' });
        pending = store.publish(owner.id, problem.id);
        await waitForLock(orm, schema);
        await lock.commit();
        const result = await pending;
        assert.equal(result.status, 'published');
        if (result.status === 'published') {
          assert.equal(result.version.version, 5);
          assert.equal(result.version.title, 'Committed before publication');
        }
      } finally {
        if (lock.isInTransaction()) await lock.rollback();
        await pending;
      }

      await lock.begin();
      pending = undefined;
      try {
        await lock.nativeUpdate(Problem, problem.id, { archivedAt: new Date() });
        pending = store.publish(owner.id, problem.id);
        await waitForLock(orm, schema);
        await lock.commit();
        assert.deepEqual(await pending, { status: 'archived' });
      } finally {
        if (lock.isInTransaction()) await lock.rollback();
        await pending;
      }
      assert.equal(await em.count(ProblemVersion, { problem: problem.id }), 5);
      assert.deepEqual((await request('GET', `${path}/versions/1`)).json().version, first);
    } finally {
      await app.close();
      try {
        await orm.em.fork().getConnection().execute(`drop schema if exists "${schema}" cascade`);
      } finally {
        await orm.close(true);
      }
    }
  },
);

type ProblemStorePublish = Awaited<ReturnType<typeof createProblemStore>>['publish'];
