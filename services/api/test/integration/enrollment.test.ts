import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { createClassroomStore } from '../../src/persistence/classroom/store';
import { readAuthConfig } from '../../src/config/auth';
import type { AuthContext } from '../../src/routes/auth/context';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to a disposable integration-test database.');
if (!new URL(url).pathname.endsWith('_test'))
  throw new Error('Integration database name must end in _test.');

// No Cognito calls: synthetic sessions exercise the actual HTTP/store/transaction boundaries.
test(
  'enrollment scopes access, handles duplicate joins, and waits for invitation replacement',
  { timeout: 20_000 },
  async () => {
    const { createDatabase, User, UserRole, Classroom, Enrollment } = await import('@logiclab/db');
    const orm = await createDatabase(url, { snapshotOnMigrate: false });
    const em = orm.em.fork();
    const pool = `enrollment-test-${randomUUID()}`;
    const owner = em.create(User, {
      cognitoUserPoolId: pool,
      cognitoSubject: 'owner',
      role: UserRole.Instructor,
    });
    const student = em.create(User, {
      cognitoUserPoolId: pool,
      cognitoSubject: 'student',
      role: UserRole.Student,
    });
    const other = em.create(User, {
      cognitoUserPoolId: pool,
      cognitoSubject: 'other',
      role: UserRole.Student,
    });
    const store = await createClassroomStore(orm);
    let active = student;
    const config = readAuthConfig({
      AUTH_ENABLED: 'true',
      AWS_REGION: 'us-east-1',
      COGNITO_USER_POOL_ID: 'us-east-1_test',
      COGNITO_CLIENT_ID: 'synthetic-client',
      COGNITO_CLIENT_SECRET: 'synthetic-secret',
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
    const app = buildApp({ auth: context, classroom: { ...context, classrooms: store } });
    const headers = { origin: config.APP_ORIGIN, cookie: `logiclab_session=${'x'.repeat(43)}` };
    const hash = (code: string) => createHash('sha256').update(code).digest('hex');
    const join = (code: string) =>
      app.inject({ method: 'POST', url: '/api/enrollments', headers, payload: { code } });
    try {
      assert.equal(
        (await orm.migrator.getPending()).length,
        0,
        'Run DB migrations before the API integration suite.',
      );
      em.persist([owner, student, other]);
      await em.flush();
      const first = await store.create(owner.id, 'First class');
      const second = await store.create(owner.id, 'Second class');
      const lockedClass = await store.create(owner.id, 'Locked class');
      await store.replaceInvitation(
        owner.id,
        first.id,
        hash('a'.repeat(32)),
        new Date(Date.now() + 60_000),
      );
      await store.replaceInvitation(
        owner.id,
        second.id,
        hash('b'.repeat(32)),
        new Date(Date.now() + 60_000),
      );
      const duplicates = await Promise.all([join('a'.repeat(32)), join('a'.repeat(32))]);
      assert(duplicates.every((response) => response.statusCode === 200));
      assert.equal(await em.count(Enrollment, { classroom: first.id, student: student.id }), 1);
      assert.equal((await join('b'.repeat(32))).statusCode, 200);
      assert.equal(
        (await app.inject({ method: 'GET', url: '/api/enrollments', headers })).json().classrooms
          .length,
        2,
      );
      active = other;
      assert.deepEqual(
        (await app.inject({ method: 'GET', url: '/api/enrollments', headers })).json().classrooms,
        [],
      );
      assert.equal(
        (await app.inject({ method: 'GET', url: `/api/enrollments/${first.id}`, headers }))
          .statusCode,
        404,
      );
      await store.replaceInvitation(
        owner.id,
        first.id,
        hash('c'.repeat(32)),
        new Date(Date.now() + 60_000),
      );
      assert.equal((await join('a'.repeat(32))).statusCode, 400);
      assert.equal(await em.count(Enrollment, { classroom: first.id, student: student.id }), 1);
      await store.replaceInvitation(
        owner.id,
        first.id,
        hash('a'.repeat(32)),
        new Date(Date.now() - 1),
      );
      const expired = await join('a'.repeat(32));
      const invalid = await join('z'.repeat(32));
      assert.equal(expired.statusCode, 400);
      assert.deepEqual(expired.json(), invalid.json());

      await store.replaceInvitation(
        owner.id,
        lockedClass.id,
        hash('r'.repeat(32)),
        new Date(Date.now() + 60_000),
      );
      const lock = orm.em.fork();
      await lock.begin();
      let redemption: Promise<unknown> | undefined;
      try {
        await lock.nativeUpdate(Classroom, lockedClass.id, {
          invitationHash: hash('s'.repeat(32)),
        });
        redemption = store.join(other.id, hash('r'.repeat(32)));
        const deadline = Date.now() + 5_000;
        let waiting = false;
        while (Date.now() < deadline) {
          const rows = await em
            .getConnection()
            .execute<{ count: number }[]>(
              "select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like '%classrooms%'",
            );
          if (rows[0]!.count > 0) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert(waiting, 'Redemption must wait on the replacement row lock.');
        await lock.commit();
        assert.equal(await redemption, null);
      } finally {
        if (lock.isInTransaction()) await lock.rollback();
        await redemption;
      }
      assert.equal(await em.count(Enrollment, { classroom: lockedClass.id }), 0);
      active = owner;
      assert.equal((await join('b'.repeat(32))).statusCode, 403);
    } finally {
      await app.close();
      try {
        await em.nativeDelete(Classroom, { owner: owner.id });
        await em.nativeDelete(User, { cognitoUserPoolId: pool });
      } finally {
        await orm.close(true);
      }
    }
  },
);
