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
import { truthTreeDefinitionFixture } from '../truth-tree-fixture';
import {
  libraryProblemResponseSchema,
  libraryProblemVersionResponseSchema,
  libraryReferenceCheckResponseSchema,
} from '@logiclab/contracts/problem-library';
import type { ResourceUser } from '../../src/routes/resource-context';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';

test('normal/demo truth-tree owner HTTP persists private drafts, verifies locked snapshots and rejects unsupported final-mode feedback atomically', async () => {
  const db = await import('@logiclab/db');
  const schema = `truth_tree_authoring_${randomUUID().replaceAll('-', '')}`;
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
    const foreign = em.create(db.User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'foreign',
      role: db.UserRole.Instructor,
    });
    const classroom = em.create(db.Classroom, { owner, name: 'Truth-tree class' });
    em.persist([owner, foreign, classroom]);
    await em.flush();
    let active: ResourceUser = { id: owner.id, role: 'instructor' };
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
    const cookieFrom = (response: Awaited<ReturnType<typeof request>>) => {
      const cookies = response.headers['set-cookie'];
      return (Array.isArray(cookies) ? cookies[0]! : cookies!).split(';')[0]!;
    };
    const normalCookie = `logiclab_session=${'a'.repeat(43)}`;
    const demo = await request('POST', '/api/demo/start', '', { role: 'instructor' });
    assert.equal(demo.statusCode, 200, demo.body);
    const demoCookie = cookieFrom(demo);
    const demoClass = await em.findOneOrFail(db.Classroom, { owner: demo.json().user.id });
    const otherDemo = await request('POST', '/api/demo/start', '', { role: 'instructor' });
    const otherDemoCookie = cookieFrom(otherDemo);
    const created: { id: string; prefix: string; cookie: string }[] = [];

    for (const scope of [
      { prefix: '/api', cookie: normalCookie, ownerId: owner.id, classId: classroom.id },
      {
        prefix: '/api/demo/resources',
        cookie: demoCookie,
        ownerId: demo.json().user.id as string,
        classId: demoClass.id,
      },
    ]) {
      const path = `${scope.prefix}/problems`;
      for (const outcome of ['valid', 'invalid'] as const) {
        const definition = truthTreeDefinitionFixture(outcome);
        const create = await request('POST', path, scope.cookie, {
          title: `Truth tree ${outcome}`,
          definition: { ...definition, referenceTree: null },
        });
        assert.equal(create.statusCode, 201, create.body);
        assert.equal(create.headers['cache-control'], 'no-store');
        const draft = libraryProblemResponseSchema.parse(create.json()).problem;
        created.push({ id: draft.id, prefix: scope.prefix, cookie: scope.cookie });
        const itemPath = `${path}/${draft.id}`;
        const missing = await request('POST', `${itemPath}/reference-check`, scope.cookie, {});
        assert.equal(missing.statusCode, 200, missing.body);
        assert.equal(
          libraryReferenceCheckResponseSchema.parse(missing.json()).check.status,
          'missing',
        );
        const missingPublication = await request('POST', `${itemPath}/versions`, scope.cookie, {});
        assert.equal(missingPublication.statusCode, 409, missingPublication.body);
        assert.equal(missingPublication.json().error.code, 'TRUTH_TREE_REFERENCE_REQUIRED');
        assert.equal(await em.fork().count(db.ProblemVersion, { problem: draft.id }), 0);

        const saved = await request('PATCH', itemPath, scope.cookie, { definition });
        assert.equal(saved.statusCode, 200, saved.body);
        assert.deepEqual(
          libraryProblemResponseSchema.parse(saved.json()).problem.definition,
          definition,
        );
        const checked = await request('POST', `${itemPath}/reference-check`, scope.cookie, {});
        assert.equal(checked.statusCode, 200, checked.body);
        const reference = libraryReferenceCheckResponseSchema.parse(checked.json()).check;
        assert.equal(reference.status, 'checked');
        if (reference.status !== 'checked' || !('argumentStatus' in reference.report))
          throw new Error('Expected truth-tree reference report.');
        assert.equal(reference.report.status, 'verified');
        assert.equal(reference.report.argumentStatus, outcome);

        const publications = await Promise.all([
          request('POST', `${itemPath}/versions`, scope.cookie, {}),
          request('POST', `${itemPath}/versions`, scope.cookie, {}),
        ]);
        const versions = publications.map((response) => {
          assert.equal(response.statusCode, 201, response.body);
          return libraryProblemVersionResponseSchema.parse(response.json()).version;
        });
        assert.deepEqual(versions.map((version) => version.version).sort(), [1, 2]);
        for (const version of versions) assert.deepEqual(version.definition, definition);

        // A previous verified preview cannot authorize an edited, now-stale reference.
        const changed = await request('PATCH', itemPath, scope.cookie, {
          title: 'Changed draft',
          definition: { ...definition, conclusion: 'R' },
        });
        assert.equal(changed.statusCode, 200, changed.body);
        const rejected = await request('POST', `${itemPath}/versions`, scope.cookie, {});
        assert.equal(rejected.statusCode, 409, rejected.body);
        assert.equal(rejected.json().error.code, 'TRUTH_TREE_REFERENCE_NOT_VERIFIED');
        assert.equal(await em.fork().count(db.ProblemVersion, { problem: draft.id }), 2);
        const history = await request('GET', `${itemPath}/versions`, scope.cookie);
        assert.equal(history.statusCode, 200, history.body);
        assert.deepEqual(
          history.json().versions.map((version: { definition: unknown }) => version.definition),
          [definition, definition],
        );
        const one = await request('GET', `${itemPath}/versions/1`, scope.cookie);
        assert.equal(one.statusCode, 200, one.body);
        assert.deepEqual(one.json().version.definition, definition);

        const archived = await request('POST', `${itemPath}/archive`, scope.cookie, {});
        assert.equal(archived.statusCode, 200, archived.body);
        assert.equal(
          (await request('POST', `${itemPath}/reference-check`, scope.cookie, {})).statusCode,
          200,
        );
        assert.equal(
          (await request('PATCH', itemPath, scope.cookie, { title: 'Forbidden edit' })).statusCode,
          409,
        );
        assert.equal(
          (await request('POST', `${itemPath}/versions`, scope.cookie, {})).statusCode,
          409,
        );
        assert.equal(
          (await request('POST', `${itemPath}/restore`, scope.cookie, {})).statusCode,
          200,
        );

        const before = await em.fork().count(db.Assignment, { classroom: scope.classId });
        const assigned = await request(
          'POST',
          `${scope.prefix}/classes/${scope.classId}/assignments`,
          scope.cookie,
          {
            title: 'Unsupported feedback',
            assessmentMode: 'completion_only',
            feedbackTiming: 'on_check',
            solutionAccess: 'never',
            problemVersionIds: [versions[0]!.id],
          },
        );
        assert.equal(assigned.statusCode, 409, assigned.body);
        assert.equal(assigned.json().error.code, 'DERIVATION_ASSIGNMENT_MODE_UNAVAILABLE');
        assert.equal(assigned.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
        assert.equal(await em.fork().count(db.Assignment, { classroom: scope.classId }), before);

        const baseline = await request(
          'POST',
          `${scope.prefix}/classes/${scope.classId}/assignments`,
          scope.cookie,
          { title: 'Unchanged draft' },
        );
        assert.equal(baseline.statusCode, 201, baseline.body);
        const assignmentId = baseline.json().assignment.id as string;
        const rejectedEdit = await request(
          'PATCH',
          `${scope.prefix}/assignments/${assignmentId}`,
          scope.cookie,
          {
            title: 'Must roll back',
            assessmentMode: 'completion_only',
            feedbackTiming: 'on_check',
            problemVersionIds: [versions[0]!.id],
          },
        );
        assert.equal(rejectedEdit.statusCode, 409, rejectedEdit.body);
        const unchanged = await request(
          'GET',
          `${scope.prefix}/assignments/${assignmentId}`,
          scope.cookie,
        );
        assert.equal(unchanged.statusCode, 200, unchanged.body);
        assert.equal(unchanged.json().assignment.title, 'Unchanged draft');
        assert.deepEqual(unchanged.json().assignment.items, []);
      }
      const list = await request('GET', `${path}?archive=all`, scope.cookie);
      assert.equal(list.statusCode, 200, list.body);
      assert.equal(
        list
          .json()
          .problems.filter(
            (problem: { definition: { type: string } }) => problem.definition.type === 'truth_tree',
          ).length,
        2,
      );
      for (const problem of list
        .json()
        .problems.filter(
          (problem: { definition: { type: string } }) => problem.definition.type === 'truth_tree',
        )) {
        assert.equal(problem.publication.version, 2);
        assert.equal(problem.publication.hasDraftChanges, true);
      }
    }

    for (const item of created) {
      const foreignCookie = item.prefix === '/api' ? demoCookie : otherDemoCookie;
      const foreignPrefix = '/api/demo/resources';
      for (const [method, suffix] of [
        ['GET', ''],
        ['POST', '/reference-check'],
        ['POST', '/versions'],
        ['PATCH', ''],
      ] as const) {
        const response = await request(
          method,
          `${foreignPrefix}/problems/${item.id}${suffix}`,
          foreignCookie,
          method === 'GET' ? undefined : method === 'PATCH' ? { title: 'Foreign mutation' } : {},
        );
        assert.equal(response.statusCode, 404, response.body);
        assert.equal(response.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
      }
    }
    const reset = await request('POST', '/api/demo/reset', demoCookie, {});
    assert.equal(reset.statusCode, 200, reset.body);
    for (const item of created) {
      assert.equal(
        await em.fork().count(db.Problem, { id: item.id }),
        item.prefix === '/api' ? 1 : 0,
      );
      assert.equal(
        await em.fork().count(db.ProblemVersion, { problem: item.id }),
        item.prefix === '/api' ? 2 : 0,
      );
    }

    active = { id: foreign.id, role: 'instructor' };
    const own = created[0]!;
    assert.equal((await request('GET', `/api/problems/${own.id}`, normalCookie)).statusCode, 404);
    active = { id: owner.id, role: 'student' };
    assert.equal((await request('GET', `/api/problems/${own.id}`, normalCookie)).statusCode, 403);
    assert.equal((await request('GET', `/api/problems/${own.id}`, '')).statusCode, 401);
  } finally {
    await app?.close();
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
