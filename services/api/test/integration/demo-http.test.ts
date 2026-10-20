import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { buildApp } from '../../src/app';
import { createClassroomStore } from '../../src/persistence/classroom/store';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';
const config = readDemoConfig({
  DEMO_ENABLED: 'true',
  APP_ORIGIN: origin,
  DEMO_MAX_WORKSPACES: '20',
})!;
const cookie = (response: { headers: Record<string, unknown> }) =>
  String(response.headers['set-cookie']).split(';')[0]!;
async function fixture(
  check: (
    orm: Awaited<ReturnType<typeof createDatabase>>,
    db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
  ) => Promise<void>,
) {
  const db = await import('@logiclab/db');
  const schema = `demo_http_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await check(orm, db);
  } finally {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}

test('demo HTTP starts, switches roles, uses existing scoped workflows, and resets without normal auth', async () =>
  fixture(async (orm, db) => {
    const runtime = await createDemoRuntime(orm, config);
    const app = buildApp({ demo: runtime });
    try {
      const invalid = await app.inject({
        method: 'POST',
        url: '/api/demo/start',
        headers: { origin: 'https://other.invalid' },
        payload: { role: 'instructor' },
      });
      assert.equal(invalid.statusCode, 403);
      assert.equal(await orm.em.fork().count(db.DemoWorkspace, {}), 0);
      const started = await app.inject({
        method: 'POST',
        url: '/api/demo/start',
        headers: { origin },
        payload: { role: 'instructor' },
      });
      assert.equal(started.statusCode, 200, started.body);
      assert.match(String(started.headers['set-cookie']), /HttpOnly/i);
      assert.match(String(started.headers['set-cookie']), /SameSite=Strict/i);
      assert.match(String(started.headers['set-cookie']), /Path=\/api\/demo/);
      assert.equal(started.headers['cache-control'], 'no-store');
      let token = cookie(started);
      const resource = await app.inject({
        method: 'GET',
        url: '/api/demo/resources/classes',
        headers: { cookie: token },
      });
      assert.equal(resource.statusCode, 200, resource.body);
      assert.equal(resource.json().classrooms.length, 2);
      const denied = await app.inject({
        method: 'GET',
        url: '/api/demo/resources/enrollments',
        headers: { cookie: token },
      });
      assert.equal(denied.statusCode, 403);
      const switched = await app.inject({
        method: 'POST',
        url: '/api/demo/role',
        headers: { origin, cookie: token },
        payload: { role: 'student' },
      });
      assert.equal(switched.statusCode, 200, switched.body);
      const old = await app.inject({
        method: 'GET',
        url: '/api/demo/session',
        headers: { cookie: token },
      });
      assert.equal(old.statusCode, 401);
      assert.equal(
        old.headers['set-cookie'],
        undefined,
        'A stale request must not clear a rotated cookie.',
      );
      assert(!String(old.headers['set-cookie']).includes('logiclab_session='));
      token = cookie(switched);
      const classes = await app.inject({
        method: 'GET',
        url: '/api/demo/resources/enrollments',
        headers: { cookie: token },
      });
      assert.equal(classes.statusCode, 200, classes.body);
      const classId = classes
        .json()
        .classrooms.find((c: { name: string }) => c.name.includes('Introduction')).id;
      const assignments = await app.inject({
        method: 'GET',
        url: `/api/demo/resources/student/classes/${classId}/assignments`,
        headers: { cookie: token },
      });
      assert.equal(assignments.statusCode, 200, assignments.body);
      const assignmentId = assignments.json().assignments[0].id;
      const submission = await app.inject({
        method: 'POST',
        url: `/api/demo/resources/student/assignments/${assignmentId}/submission`,
        headers: { origin, cookie: token },
        payload: { revision: 0 },
      });
      assert.equal(submission.statusCode, 200, submission.body);
      assert.equal(
        await orm.em.fork().count(db.AssignmentAttempt, { submittedAt: { $ne: null } }),
        1,
      );
      const reset = await app.inject({
        method: 'POST',
        url: '/api/demo/reset',
        headers: { origin, cookie: token },
        payload: {},
      });
      assert.equal(reset.statusCode, 200, reset.body);
      assert.equal(reset.json().workspace.generation, 2);
      const stale = await app.inject({
        method: 'GET',
        url: `/api/demo/resources/student/assignments/${assignmentId}`,
        headers: { cookie: token },
      });
      assert.equal(stale.statusCode, 401);
      assert.equal(await orm.em.fork().count(db.AssignmentAttempt, {}), 0);
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/api/demo/resources/billing/webhook',
            payload: {},
          })
        ).statusCode,
        404,
      );
      assert.equal(
        (await app.inject({ method: 'POST', url: '/api/demo/resources/auth/signup', payload: {} }))
          .statusCode,
        404,
      );
      assert.equal(
        (
          await app.inject({
            method: 'GET',
            url: '/api/classes',
            headers: { cookie: cookie(reset) },
          })
        ).statusCode,
        404,
      );
      assert.equal(await orm.em.fork().count(db.AuthSession, {}), 0);
    } finally {
      await app.close();
    }
  }));

test('demo invitations reject other workspaces and normal accounts in both directions', async () =>
  fixture(async (orm, db) => {
    const runtime = await createDemoRuntime(orm, config);
    const em = orm.em.fork();
    const normalStudent = em.create(db.User, {
      cognitoUserPoolId: 'normal',
      cognitoSubject: 'student',
      role: db.UserRole.Student,
    });
    const normalInstructor = em.create(db.User, {
      cognitoUserPoolId: 'normal',
      cognitoSubject: 'instructor',
      role: db.UserRole.Instructor,
    });
    const normalClass = em.create(db.Classroom, {
      owner: normalInstructor,
      name: 'Normal class',
      invitationHash: createHash('sha256').update('n'.repeat(32)).digest('hex'),
      invitationExpiresAt: new Date(Date.now() + 60000),
    });
    em.persist([normalStudent, normalInstructor, normalClass]);
    await em.flush();
    const normalStore = await createClassroomStore(orm);
    const app = buildApp({
      demo: runtime,
      classroom: {
        config: { APP_ORIGIN: origin, secureCookies: false },
        service: { authenticate: async () => ({ id: normalStudent.id, role: 'student' }) },
        classrooms: normalStore,
      },
    });
    try {
      const start = (role: string) =>
        app.inject({
          method: 'POST',
          url: '/api/demo/start',
          headers: { origin },
          payload: { role },
        });
      const owner = await start('instructor');
      const other = await start('student');
      assert.equal(owner.statusCode, 200, owner.body);
      assert.equal(other.statusCode, 200, other.body);
      const ownClasses = await app.inject({
        method: 'GET',
        url: '/api/demo/resources/classes',
        headers: { cookie: cookie(owner) },
      });
      const classId = ownClasses.json().classrooms[0].id;
      const otherRead = await app.inject({
        method: 'GET',
        url: `/api/demo/resources/student/classes/${classId}/assignments`,
        headers: { cookie: cookie(other) },
      });
      assert.equal(otherRead.statusCode, 404, otherRead.body);
      const invite = await app.inject({
        method: 'POST',
        url: `/api/demo/resources/classes/${classId}/invitation`,
        headers: { origin, cookie: cookie(owner) },
        payload: {},
      });
      assert.equal(invite.statusCode, 200, invite.body);
      const code: string = invite.json().invitation.code;
      assert.match(code, /^[A-Za-z0-9_-]{32}$/);
      for (const [path, credential, value] of [
        ['/api/demo/resources/enrollments', cookie(other), code],
        ['/api/enrollments', `logiclab_session=${'n'.repeat(43)}`, code],
        ['/api/demo/resources/enrollments', cookie(other), 'n'.repeat(32)],
      ]) {
        const joined = await app.inject({
          method: 'POST',
          url: path!,
          headers: { origin, cookie: credential! },
          payload: { code: value },
        });
        assert.equal(joined.statusCode, 400, joined.body);
        assert.equal(joined.json().error.code, 'INVITATION_INVALID');
      }
      assert.equal(await em.count(db.Enrollment, { student: normalStudent.id }), 0);
      const ownStudent = await app.inject({
        method: 'POST',
        url: '/api/demo/role',
        headers: { origin, cookie: cookie(owner) },
        payload: { role: 'student' },
      });
      const ownJoin = await app.inject({
        method: 'POST',
        url: '/api/demo/resources/enrollments',
        headers: { origin, cookie: cookie(ownStudent) },
        payload: { code },
      });
      assert.equal(ownJoin.statusCode, 200, ownJoin.body);
      const normalJoin = await app.inject({
        method: 'POST',
        url: '/api/enrollments',
        headers: { origin, cookie: `logiclab_session=${'n'.repeat(43)}` },
        payload: { code: 'n'.repeat(32) },
      });
      assert.equal(normalJoin.statusCode, 200, normalJoin.body);
    } finally {
      await app.close();
    }
  }));

test('concurrent public starts respect a database-wide storage cap and disabled mode has no endpoints', async () =>
  fixture(async (orm, db) => {
    const runtime = await createDemoRuntime(orm, { ...config, capacity: 1 });
    const app = buildApp({ demo: runtime });
    try {
      const results = await Promise.all(
        [1, 2].map(() =>
          app.inject({
            method: 'POST',
            url: '/api/demo/start',
            headers: { origin },
            payload: { role: 'instructor' },
          }),
        ),
      );
      assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 503]);
      assert.equal(await orm.em.fork().count(db.DemoWorkspace, {}), 1);
      assert.equal(await orm.em.fork().count(db.User, {}), 2);
      assert(!results.find((r) => r.statusCode === 503)!.headers['set-cookie']);
    } finally {
      await app.close();
    }
    const disabled = buildApp();
    try {
      assert.equal(
        (
          await disabled.inject({
            method: 'POST',
            url: '/api/demo/start',
            payload: { role: 'instructor' },
          })
        ).statusCode,
        404,
      );
    } finally {
      await disabled.close();
    }
  }));

test('a failed transaction commit never sends a successful demo resource response', async () =>
  fixture(async (orm, db) => {
    const runtime = await createDemoRuntime(orm, config);
    const app = buildApp({ demo: runtime });
    try {
      const started = await app.inject({
        method: 'POST',
        url: '/api/demo/start',
        headers: { origin },
        payload: { role: 'instructor' },
      });
      assert.equal(started.statusCode, 200, started.body);
      const schema = orm.config.get('schema')!;
      await orm.em.execute(`
    create function "${schema}".reject_demo_commit() returns trigger language plpgsql as $$
    begin
      if NEW.name = 'Reject at commit' then
        raise exception 'Synthetic commit failure';
      end if;
      return NEW;
    end;
    $$;
  `);
      await orm.em.execute(`
    create constraint trigger reject_demo_commit
      after insert on "${schema}".classrooms
      deferrable initially deferred
      for each row execute function "${schema}".reject_demo_commit();
  `);
      const failed = await app.inject({
        method: 'POST',
        url: '/api/demo/resources/classes',
        headers: { origin, cookie: cookie(started) },
        payload: { name: 'Reject at commit' },
      });
      assert.equal(failed.statusCode, 503, failed.body);
      assert.equal(await orm.em.fork().count(db.Classroom, { name: 'Reject at commit' }), 0);
    } finally {
      await app.close();
    }
  }));
