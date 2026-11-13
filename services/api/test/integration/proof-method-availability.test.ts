import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createSubmissionReviewStore } from '../../src/persistence/submission-review/store';
import { createSubmissionGradingStore } from '../../src/persistence/submission-review/grading-store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { treeDefinitionFixture } from '../derivation-fixture';
import type { ResourceUser } from '../../src/routes/resource-context';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';

test('normal/demo authoring and assignment admission block new tree work while preserving retained reads and atomicity', async () => {
  const db = await import('@logiclab/db');
  const schema = `proof_availability_${randomUUID().replaceAll('-', '')}`;
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
    const classroom = em.create(db.Classroom, { owner, name: 'Availability class' });
    em.persist([owner, classroom]);
    await em.flush();
    const active: ResourceUser = { id: owner.id, role: 'instructor' };
    const context = {
      config: { APP_ORIGIN: origin, secureCookies: false },
      service: { authenticate: async () => active },
    };
    app = buildApp({
      problem: { ...context, problems: await createProblemStore(orm) },
      assignment: {
        ...context,
        assignments: await createAssignmentStore(orm),
        submissionReviews: await createSubmissionReviewStore(orm),
        submissionGrading: await createSubmissionGradingStore(orm),
      },
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
    const demoStart = await request('POST', '/api/demo/start', '', { role: 'instructor' });
    assert.equal(demoStart.statusCode, 200, demoStart.body);
    const cookies = demoStart.headers['set-cookie'];
    const demoCookie = (Array.isArray(cookies) ? cookies[0]! : cookies!).split(';')[0]!;
    const demoClass = await em.findOneOrFail(db.Classroom, { owner: demoStart.json().user.id });
    const unavailable = async (
      method: 'POST' | 'PATCH',
      path: string,
      cookie: string,
      payload: object,
    ) => {
      const response = await request(method, path, cookie, payload);
      assert.equal(response.statusCode, 409, response.body);
      assert.equal(response.json().error.code, 'PROOF_METHOD_UNAVAILABLE', response.body);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.body.includes('referenceProof'), false);
    };

    for (const scope of [
      {
        prefix: '/api',
        cookie: `logiclab_session=${'a'.repeat(43)}`,
        ownerId: owner.id,
        classId: classroom.id,
      },
      {
        prefix: '/api/demo/resources',
        cookie: demoCookie,
        ownerId: demoStart.json().user.id as string,
        classId: demoClass.id,
      },
    ]) {
      const path = `${scope.prefix}/problems`;
      const definition = treeDefinitionFixture();
      const count = await em.fork().count(db.Problem, { owner: scope.ownerId });
      await unavailable('POST', path, scope.cookie, { title: 'Unavailable new tree', definition });
      assert.equal(await em.fork().count(db.Problem, { owner: scope.ownerId }), count);

      // Insert historical fixtures directly: new-work stores must never be used to bypass admission.
      const retained = em.create(db.Problem, {
        owner: em.getReference(db.User, scope.ownerId),
        title: 'Retained natural-deduction tree',
        definition,
      });
      const version = em.create(db.ProblemVersion, {
        problem: retained,
        version: 1,
        title: retained.title,
        definition: structuredClone(definition),
      });
      const oldDraft = em.create(db.Assignment, {
        classroom: em.getReference(db.Classroom, scope.classId),
        title: 'Retained mixed draft',
      });
      const oldPublished = em.create(db.Assignment, {
        classroom: em.getReference(db.Classroom, scope.classId),
        title: 'Retained published assignment',
        publishedAt: new Date(),
      });
      em.persist([retained, version, oldDraft, oldPublished]);
      await em.flush();
      const supported = await request('POST', path, scope.cookie, {
        title: 'Active table',
        definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
      });
      assert.equal(supported.statusCode, 201, supported.body);
      const supportedId = supported.json().problem.id as string;
      const published = await request('POST', `${path}/${supportedId}/versions`, scope.cookie, {});
      assert.equal(published.statusCode, 201, published.body);
      const supportedVersionId = published.json().version.id as string;
      for (const assignment of [oldDraft, oldPublished]) {
        em.persist(
          em.create(db.AssignmentItem, {
            assignment,
            problemVersion: em.getReference(db.ProblemVersion, supportedVersionId),
            position: 1,
            maxPoints: 10,
          }),
        );
        em.persist(
          em.create(db.AssignmentItem, {
            assignment,
            problemVersion: version,
            position: 2,
            maxPoints: 10,
          }),
        );
      }
      await em.flush();

      const retainedPath = `${path}/${retained.id}`;
      const before = (await request('GET', retainedPath, scope.cookie)).json().problem;
      assert.deepEqual(before.definition, definition);
      assert.equal(
        (await request('POST', `${retainedPath}/reference-check`, scope.cookie, {})).json().check
          .report.status,
        'accepted',
      );
      await unavailable('PATCH', retainedPath, scope.cookie, { title: 'Must not change' });
      await unavailable('PATCH', retainedPath, scope.cookie, {
        definition: { type: 'truth_table', definitionVersion: 1, formula: 'Q' },
      });
      await unavailable('PATCH', `${path}/${supportedId}`, scope.cookie, {
        title: 'Must roll back',
        definition,
      });
      await unavailable('POST', `${retainedPath}/versions`, scope.cookie, {});
      assert.deepEqual((await request('GET', retainedPath, scope.cookie)).json().problem, before);
      assert.equal(await em.fork().count(db.ProblemVersion, { problem: retained.id }), 1);
      assert.equal(
        (await request('GET', `${retainedPath}/versions`, scope.cookie)).statusCode,
        200,
      );
      for (const action of ['archive', 'restore'])
        assert.equal(
          (await request('POST', `${retainedPath}/${action}`, scope.cookie, {})).statusCode,
          200,
        );
      assert.equal(
        (await request('PATCH', `${path}/${randomUUID()}`, scope.cookie, { title: 'No record' }))
          .statusCode,
        404,
      );

      const assignmentsPath = `${scope.prefix}/assignments`;
      const classAssignments = `${scope.prefix}/classes/${scope.classId}/assignments`;
      const assignmentCount = await em.fork().count(db.Assignment, { classroom: scope.classId });
      for (const assessmentMode of ['graded', 'completion_only', 'ungraded_practice']) {
        await unavailable('POST', classAssignments, scope.cookie, {
          title: 'Unavailable mixed assignment',
          assessmentMode,
          feedbackTiming: assessmentMode === 'ungraded_practice' ? 'on_check' : 'on_submission',
          problemVersionIds: [supportedVersionId, version.id],
        });
      }
      const draftPath = `${assignmentsPath}/${oldDraft.id}`;
      const draftBefore = (await request('GET', draftPath, scope.cookie)).json().assignment;
      assert.equal(draftBefore.items.length, 2);
      await unavailable('PATCH', draftPath, scope.cookie, { title: 'Must roll back' });
      await unavailable('PATCH', draftPath, scope.cookie, {
        pointAllocations: draftBefore.items.map((item: { id: string }) => ({
          itemId: item.id,
          maxPoints: 20,
        })),
      });
      await unavailable('POST', `${draftPath}/publish`, scope.cookie, {});
      for (const id of [oldDraft.id, oldPublished.id])
        await unavailable('POST', `${assignmentsPath}/${id}/duplicate`, scope.cookie, {});
      assert.deepEqual(
        (await request('GET', draftPath, scope.cookie)).json().assignment,
        draftBefore,
      );
      assert.equal(
        await em.fork().count(db.Assignment, { classroom: scope.classId }),
        assignmentCount,
      );
      const retainedAssignment = await request(
        'GET',
        `${assignmentsPath}/${oldPublished.id}`,
        scope.cookie,
      );
      assert.equal(retainedAssignment.statusCode, 200, retainedAssignment.body);
      assert.equal(retainedAssignment.json().assignment.items.length, 2);
      for (const action of ['archive', 'restore'])
        assert.equal(
          (
            await request(
              'POST',
              `${assignmentsPath}/${oldPublished.id}/${action}`,
              scope.cookie,
              {},
            )
          ).statusCode,
          200,
        );
      // Explicitly removing the unavailable item is allowed; it is never silently omitted.
      const repaired = await request('PATCH', draftPath, scope.cookie, {
        items: [{ problemVersionId: supportedVersionId, maxPoints: 10 }],
      });
      assert.equal(repaired.statusCode, 200, repaired.body);
      assert.equal(repaired.json().assignment.items.length, 1);
      assert.equal(
        (
          await request('POST', classAssignments, scope.cookie, {
            title: 'Supported assignment',
            problemVersionIds: [supportedVersionId],
          })
        ).statusCode,
        201,
      );
    }
  } finally {
    await app?.close();
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
