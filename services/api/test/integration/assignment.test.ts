import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { buildApp } from '../../src/app';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createProblemStore } from '../../src/persistence/problem/store';
import { readAuthConfig } from '../../src/config/auth';
import type { AuthContext } from '../../src/routes/auth/context';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

async function waitForLock(orm: Awaited<ReturnType<typeof createDatabase>>, schema: string) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const rows = await orm.em
      .fork()
      .getConnection()
      .execute<{ count: number }[]>(
        `select count(*)::int as count from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like '%${schema}%'`,
      );
    if (rows[0]!.count > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('Expected assignment mutation to wait for the parent lock.');
}

test(
  'instructor assignment authoring pins content, scopes access, and serializes publication with edits and archives',
  { timeout: 30_000 },
  async () => {
    const {
      createDatabase,
      User,
      UserRole,
      Classroom,
      ClassEntitlement,
      EntitlementSource,
      BillingProvider,
      Assignment,
      AssignmentItem,
    } = await import('@logiclab/db');
    const schema = `assignment_${randomUUID().replaceAll('-', '')}`;
    const orm = await createDatabase(url, { schema, snapshotOnMigrate: false });
    const store = await createAssignmentStore(orm);
    const problems = await createProblemStore(orm);
    let user = {
      id: randomUUID() as string,
      subject: 'owner',
      role: 'instructor' as 'instructor' | 'student',
    };
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
      service: { authenticate: async () => user },
    } as unknown as AuthContext;
    const app = buildApp({ assignment: { ...context, assignments: store } });
    let address = 1;
    const request = (method: 'GET' | 'POST' | 'PATCH', path: string, payload?: object) =>
      app.inject({
        method,
        url: path,
        payload,
        headers: { origin: config.APP_ORIGIN, cookie: `logiclab_session=${'x'.repeat(43)}` },
        remoteAddress: `127.0.0.${address++}`,
      });
    try {
      await orm.schema.create();
      const em = orm.em.fork();
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
      const classroom = em.create(Classroom, { owner, name: 'Owned class' });
      const otherClass = em.create(Classroom, { owner: other, name: 'Foreign class' });
      em.persist([owner, other, classroom, otherClass]);
      await em.flush();
      em.persist(
        em.create(ClassEntitlement, {
          classroom,
          provider: BillingProvider.Simulator,
          source: EntitlementSource.ClassPurchase,
          sourceReference: randomUUID(),
          startsAt: new Date(Date.now() - 60_000),
          endsAt: new Date(Date.now() + 86_400_000),
        }),
      );
      await em.flush();

      async function versionFor(ownerId: string, formula: string) {
        const problem = await problems.create(ownerId, {
          title: formula,
          definition: { type: 'truth_table', definitionVersion: 1, formula },
        });
        const published = await problems.publish(ownerId, problem.id);
        assert.equal(published.status, 'published');
        if (published.status !== 'published') throw new Error('Fixture publication failed');
        return published.version;
      }
      const first = await versionFor(owner.id, 'P');
      const second = await versionFor(owner.id, 'Q');
      const foreign = await versionFor(other.id, 'R');
      const base = `/api/classes/${classroom.id}/assignments`;
      assert.equal(
        (await request('POST', `/api/classes/${otherClass.id}/assignments`, { title: 'Denied' }))
          .statusCode,
        404,
      );
      assert.equal(
        (
          await request('POST', base, {
            title: 'Denied',
            problemVersionIds: [first.id, foreign.id],
          })
        ).statusCode,
        404,
      );
      assert.equal(
        await em.count(Assignment, {}),
        0,
        'Invalid references must roll back creation.',
      );
      const empty = await request('POST', base, { title: 'Empty draft' });
      assert.equal(empty.statusCode, 201);
      const emptyPath = `/api/assignments/${empty.json().assignment.id}`;
      assert.equal((await request('POST', `${emptyPath}/publish`, {})).statusCode, 409);
      const created = await request('POST', base, {
        title: ' Work ',
        instructions: ' Instructions ',
        problemVersionIds: [second.id, first.id, second.id],
      });
      assert.equal(created.statusCode, 201);
      let assignment = created.json().assignment;
      const path = `/api/assignments/${assignment.id}`;
      assert.equal(assignment.title, 'Work');
      assert.deepEqual(
        assignment.items.map((item: any) => item.problemVersion.id),
        [second.id, first.id, second.id],
      );
      assert.deepEqual(
        assignment.items.map((item: any) => item.position),
        [1, 2, 3],
      );
      assert.equal(new Set(assignment.items.map((item: any) => item.id)).size, 3);
      assert.equal(assignment.solutionAccess, 'never');
      assert.equal(assignment.assessmentMode, 'graded');
      assert.equal(assignment.feedbackTiming, 'on_submission');
      const originalItems = assignment.items;
      assert.equal(
        (
          await request('PATCH', path, {
            title: 'Should roll back',
            problemVersionIds: [foreign.id],
          })
        ).statusCode,
        404,
      );
      assert.deepEqual((await request('GET', path)).json().assignment, assignment);
      await assert.rejects(
        store.update(owner.id, assignment.id, {
          title: 'x'.repeat(121),
          problemVersionIds: [first.id],
        }),
      );
      assert.deepEqual(
        (await request('GET', path)).json().assignment,
        assignment,
        'Database errors roll back content and item replacement.',
      );
      const patched = await request('PATCH', path, {
        instructions: null,
        solutionAccess: 'after_submission',
      });
      assert.equal(patched.statusCode, 200);
      assignment = patched.json().assignment;
      assert.equal(assignment.instructions, null);
      assert.equal(assignment.solutionAccess, 'after_submission');
      assert.deepEqual(
        assignment.items,
        originalItems,
        'Omitted item list must retain occurrence IDs.',
      );
      assignment = (
        await request('PATCH', path, { problemVersionIds: [first.id, second.id] })
      ).json().assignment;
      assert.deepEqual(
        assignment.items.map((item: any) => item.problemVersion.id),
        [first.id, second.id],
      );
      const published = await request('POST', `${path}/publish`, {});
      assert.equal(published.statusCode, 200);
      const snapshot = published.json().assignment;
      assert(snapshot.publishedAt);
      assert.deepEqual((await request('POST', `${path}/publish`, {})).json().assignment, snapshot);
      for (const payload of [
        { title: 'Denied' },
        { solutionAccess: 'never' },
        { problemVersionIds: [] },
        { feedbackTiming: 'on_submission' },
      ])
        assert.equal((await request('PATCH', path, payload)).statusCode, 409);
      await problems.update(owner.id, first.problemId, {
        title: 'New library draft',
        definition: { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
      });
      await problems.setArchived(owner.id, first.problemId, true);
      assert.deepEqual((await request('GET', path)).json().assignment, snapshot);
      const archived = (await request('POST', `${path}/archive`, {})).json().assignment;
      assert(archived.archivedAt);
      assert.deepEqual((await request('POST', `${path}/archive`, {})).json().assignment, archived);
      assert.equal((await request('POST', `${path}/publish`, {})).statusCode, 409);
      const active = (await request('GET', base)).json();
      assert.equal(active.assignments.length, 1);
      const archivedPage = (await request('GET', base + '?archive=archived')).json();
      assert.equal(archivedPage.assignments[0].id, snapshot.id);
      const page = (await request('GET', base + '?archive=all&limit=1')).json();
      assert.equal(page.nextOffset, 1);
      assert.equal(
        (await request('GET', base + '?archive=all&limit=1&offset=1')).json().nextOffset,
        null,
      );
      assert.equal(
        (await request('POST', `${path}/restore`, {})).json().assignment.publishedAt,
        snapshot.publishedAt,
      );
      assert.equal((await request('PATCH', path, { title: 'Still locked' })).statusCode, 409);
      assert.equal((await request('POST', `${emptyPath}/archive`, {})).statusCode, 200);
      assert.equal(
        (await request('PATCH', emptyPath, { title: 'Archived draft' })).statusCode,
        409,
      );
      assert.equal((await request('POST', `${emptyPath}/restore`, {})).statusCode, 200);
      assert.equal(
        (await request('PATCH', emptyPath, { title: 'Restored draft' })).statusCode,
        200,
      );

      user = { id: other.id, subject: 'other', role: 'instructor' };
      for (const [method, suffix] of [
        ['GET', ''],
        ['PATCH', ''],
        ['POST', '/publish'],
        ['POST', '/archive'],
        ['POST', '/restore'],
      ] as const)
        assert.equal(
          (
            await request(
              method,
              path + suffix,
              method === 'GET' ? undefined : method === 'PATCH' ? { title: 'Foreign' } : {},
            )
          ).statusCode,
          404,
        );
      assert.equal((await request('GET', base)).statusCode, 404);
      user = { id: owner.id, subject: 'student', role: 'student' };
      assert.equal((await request('GET', path)).statusCode, 403);
      user = { id: owner.id, subject: 'owner', role: 'instructor' };

      const input = {
        title: 'Race draft',
        problemVersionIds: [second.id],
        assessmentMode: 'graded' as const,
        feedbackTiming: 'on_submission' as const,
        solutionAccess: 'never' as const,
      };
      const race = await store.create(owner.id, classroom.id, input);
      const lock = orm.em.fork();
      await lock.begin();
      let pending: ReturnType<typeof store.publish> | undefined;
      try {
        await lock.nativeUpdate(Assignment, race.id, { title: 'Committed edit' });
        pending = store.publish(owner.id, race.id);
        await waitForLock(orm, schema);
        await lock.commit();
        assert.equal((await pending).title, 'Committed edit');
      } finally {
        if (lock.isInTransaction()) await lock.rollback();
        if (pending) await pending;
      }
      const blockedEdit = await store.create(owner.id, classroom.id, input);
      const publication = orm.em.fork();
      await publication.begin();
      let edit: ReturnType<typeof store.update> | undefined;
      try {
        await publication.nativeUpdate(Assignment, blockedEdit.id, { publishedAt: new Date() });
        edit = store.update(owner.id, blockedEdit.id, { title: 'Must not win' });
        const rejected = assert.rejects(edit, (error: any) => error.reason === 'published');
        await waitForLock(orm, schema);
        await publication.commit();
        await rejected;
      } finally {
        if (publication.isInTransaction()) await publication.rollback();
      }
      const archiveRace = await store.create(owner.id, classroom.id, input);
      const archiveLock = orm.em.fork();
      await archiveLock.begin();
      let publishing: ReturnType<typeof store.publish> | undefined;
      try {
        await archiveLock.nativeUpdate(Assignment, archiveRace.id, { archivedAt: new Date() });
        publishing = store.publish(owner.id, archiveRace.id);
        const rejected = assert.rejects(publishing, (error: any) => error.reason === 'archived');
        await waitForLock(orm, schema);
        await archiveLock.commit();
        await rejected;
      } finally {
        if (archiveLock.isInTransaction()) await archiveLock.rollback();
      }
      const doublePublish = await store.create(owner.id, classroom.id, input);
      const publications = await Promise.all([
        store.publish(owner.id, doublePublish.id),
        store.publish(owner.id, doublePublish.id),
      ]);
      assert.deepEqual(publications[0], publications[1], 'Concurrent publication is idempotent.');
      const simultaneous = await store.create(owner.id, classroom.id, input);
      const results = await Promise.allSettled([
        store.publish(owner.id, simultaneous.id),
        store.update(owner.id, simultaneous.id, { title: 'Concurrent edit' }),
      ]);
      assert.equal(results[0]!.status, 'fulfilled');
      const frozen = await store.findOwned(owner.id, simultaneous.id);
      assert(frozen.publishedAt);
      assert.equal(
        frozen.title,
        results[1]!.status === 'fulfilled' ? 'Concurrent edit' : 'Race draft',
      );
      assert.equal(await em.fork().count(AssignmentItem, { assignment: simultaneous.id }), 1);

      const policyDraft = await request('POST', base, {
        title: 'Practice draft',
        assessmentMode: 'ungraded_practice',
        feedbackTiming: 'on_check',
        solutionAccess: 'anytime',
        problemVersionIds: [second.id],
      });
      assert.equal(policyDraft.statusCode, 201, policyDraft.body);
      const policyPath = `/api/assignments/${policyDraft.json().assignment.id}`;
      const policySnapshot = policyDraft.json().assignment;
      assert.equal(policySnapshot.solutionAccess, 'anytime');
      assert.equal((await request('GET', policyPath)).statusCode, 200);
      const badPatch = await request('PATCH', policyPath, {
        title: 'Must roll back',
        assessmentMode: 'graded',
        problemVersionIds: [],
      });
      assert.equal(badPatch.statusCode, 400);
      assert.equal(badPatch.json().error.code, 'ASSIGNMENT_POLICY_INVALID');
      assert.deepEqual((await request('GET', policyPath)).json().assignment, policySnapshot);
      assert.equal(
        (await request('PATCH', policyPath, { solutionAccess: 'after_submission' })).statusCode,
        400,
      );
      const renamed = await request('PATCH', policyPath, { title: 'Renamed practice' });
      assert.equal(renamed.statusCode, 200);
      assert.equal(renamed.json().assignment.assessmentMode, 'ungraded_practice');
      assert.equal(renamed.json().assignment.solutionAccess, 'anytime');
      const notReady = await request('POST', policyPath + '/publish', {});
      assert.equal(notReady.statusCode, 409);
      assert.equal(notReady.json().error.code, 'ASSIGNMENT_POLICY_NOT_READY');
      assert.equal((await request('GET', policyPath)).json().assignment.publishedAt, null);
      const completion = await request('PATCH', policyPath, {
        assessmentMode: 'completion_only',
        solutionAccess: 'after_submission',
      });
      assert.equal(completion.statusCode, 200);
      assert.equal(completion.json().assignment.feedbackTiming, 'on_check');
      const graded = await request('PATCH', policyPath, {
        assessmentMode: 'graded',
        feedbackTiming: 'on_submission',
      });
      assert.equal(graded.statusCode, 200);
      assert.equal(graded.json().assignment.solutionAccess, 'after_submission');
      assert.equal((await request('POST', policyPath + '/publish', {})).statusCode, 200);
      assert.equal(
        (await request('PATCH', policyPath, { solutionAccess: 'never' })).statusCode,
        409,
      );
      assert.equal(
        (
          await request('POST', base, {
            title: 'Invalid practice',
            assessmentMode: 'ungraded_practice',
            feedbackTiming: 'on_check',
            solutionAccess: 'after_submission',
          })
        ).statusCode,
        400,
      );
      assert.equal(
        (await request('POST', base, { title: 'Legacy flag', allowSolutions: true })).statusCode,
        400,
      );
    } finally {
      await app.close();
      await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
      await orm.close(true);
    }
  },
);
