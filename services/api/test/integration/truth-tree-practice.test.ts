import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createSubmissionReviewStore } from '../../src/persistence/submission-review/store';
import { createSubmissionGradingStore } from '../../src/persistence/submission-review/grading-store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { truthTreeDefinitionFixture } from '../truth-tree-fixture';
import type { ResourceUser } from '../../src/routes/resource-context';
import {
  savedStudentAssignmentResponseSchema,
  savedStudentCheckResponseSchema,
  savedStudentSolutionResponseSchema,
} from '@logiclab/contracts/saved-student-work';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';

test('normal/demo truth-tree practice persists occurrence-specific drafts and keeps checks transient and references private', async () => {
  const db = await import('@logiclab/db');
  const schema = `truth_tree_practice_${randomUUID().replaceAll('-', '')}`;
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
    const classroom = em.create(db.Classroom, { owner, name: 'Tree practice' });
    em.persist([
      owner,
      student,
      outsider,
      classroom,
      em.create(db.Enrollment, { classroom, student }),
      em.create(db.ClassEntitlement, {
        classroom,
        provider: db.BillingProvider.Simulator,
        source: db.EntitlementSource.ClassPurchase,
        sourceReference: randomUUID(),
        startsAt: new Date(Date.now() - 60000),
        endsAt: new Date(Date.now() + 86400000),
      }),
    ]);
    await em.flush();
    let active: ResourceUser = { id: owner.id, role: 'instructor' };
    const context = {
      config: { APP_ORIGIN: origin, secureCookies: false },
      service: { authenticate: async () => active },
    };
    const reviews = await createSubmissionReviewStore(orm);
    app = buildApp({
      problem: { ...context, problems: await createProblemStore(orm) },
      assignment: {
        ...context,
        assignments: await createAssignmentStore(orm),
        submissionReviews: reviews,
        submissionGrading: await createSubmissionGradingStore(orm),
      },
      studentWork: { ...context, studentWork: await createStudentWorkStore(orm) },
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
    const otherDemo = await request('POST', '/api/demo/start', '', { role: 'student' });
    const foreignCookie = cookieFrom(otherDemo);

    for (const scope of [
      {
        prefix: '/api',
        cookie: normalCookie,
        classId: classroom.id,
        ownerId: owner.id,
        studentId: student.id,
      },
      {
        prefix: '/api/demo/resources',
        cookie: demoCookie,
        classId: demoClass.id,
        ownerId: demo.json().user.id as string,
        studentId: '',
      },
    ]) {
      active = { id: owner.id, role: 'instructor' };
      const outcome = scope.prefix === '/api' ? 'valid' : 'invalid';
      const definition = truthTreeDefinitionFixture(outcome);
      const created = await request('POST', `${scope.prefix}/problems`, scope.cookie, {
        title: 'Tree',
        definition,
      });
      assert.equal(created.statusCode, 201, created.body);
      const problemId = created.json().problem.id as string;
      const published = await request(
        'POST',
        `${scope.prefix}/problems/${problemId}/versions`,
        scope.cookie,
        {},
      );
      assert.equal(published.statusCode, 201, published.body);
      const versionId = published.json().version.id as string;
      const table = await request('POST', `${scope.prefix}/problems`, scope.cookie, {
        title: 'Table',
        definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
      });
      const tableVersion = await request(
        'POST',
        `${scope.prefix}/problems/${table.json().problem.id}/versions`,
        scope.cookie,
        {},
      );
      assert.equal(tableVersion.statusCode, 201, tableVersion.body);
      const assignment = await request(
        'POST',
        `${scope.prefix}/classes/${scope.classId}/assignments`,
        scope.cookie,
        {
          title: 'Mixed tree practice',
          assessmentMode: 'ungraded_practice',
          feedbackTiming: 'immediate',
          solutionAccess: 'anytime',
          problemVersionIds: [versionId, versionId, tableVersion.json().version.id],
        },
      );
      assert.equal(assignment.statusCode, 201, assignment.body);
      const assignmentId = assignment.json().assignment.id as string;
      const assignmentPath = `${scope.prefix}/assignments/${assignmentId}`;
      const release = await request('POST', `${assignmentPath}/publish`, scope.cookie, {});
      assert.equal(release.statusCode, 200, release.body);
      const [first, second, objective] = release.json().assignment.items as { id: string }[];
      assert.ok(first && second && objective);
      // Editing/archiving the source draft must not replace the published statement or key.
      assert.equal(
        (
          await request('PATCH', `${scope.prefix}/problems/${problemId}`, scope.cookie, {
            definition: { ...definition, conclusion: 'Q' },
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (await request('POST', `${scope.prefix}/problems/${problemId}/archive`, scope.cookie, {}))
          .statusCode,
        200,
      );
      if (scope.prefix !== '/api') {
        const switched = await request('POST', '/api/demo/role', scope.cookie, { role: 'student' });
        assert.equal(switched.statusCode, 200, switched.body);
        scope.cookie = cookieFrom(switched);
        scope.studentId = switched.json().user.id;
      } else active = { id: student.id, role: 'student' };
      const path = `${scope.prefix}/student/assignments/${assignmentId}`;
      const read = await request('GET', path, scope.cookie);
      assert.equal(read.statusCode, 200, read.body);
      const work = savedStudentAssignmentResponseSchema.parse(read.json());
      assert.equal(work.assignment.items.length, 3);
      assert.equal(work.attempt, null);
      assert.equal(read.body.includes('referenceTree'), false);
      assert.equal(read.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
      const publicItem = work.assignment.items[0]!;
      assert.ok('content' in publicItem && publicItem.content.type === 'truth_tree');
      assert.equal(publicItem.content.conclusion, definition.conclusion);
      const answer = { type: 'truth_tree' as const, tree: definition.referenceTree! };
      const checked = await request('POST', `${path}/check`, scope.cookie, {
        itemId: first.id,
        answers: answer,
      });
      assert.equal(checked.statusCode, 200, checked.body);
      const feedback = savedStudentCheckResponseSchema.parse(checked.json()).feedback;
      assert.ok('type' in feedback && feedback.type === 'truth_tree');
      assert.equal(feedback.report.status, 'verified');
      assert.equal(feedback.report.argumentStatus, outcome);
      assert.equal(checked.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
      assert.equal(checked.body.includes('referenceTree'), false);
      assert.equal(await em.fork().count(db.AssignmentAttempt, { assignment: assignmentId }), 0);
      const wrongType = await request('PATCH', `${path}/attempt`, scope.cookie, {
        revision: 0,
        itemId: first.id,
        answers: { type: 'true_false', answer: true },
      });
      assert.equal(wrongType.statusCode, 400, wrongType.body);
      assert.equal(
        await em.fork().count(db.AssignmentAttempt, { assignment: assignmentId }),
        0,
        'Failed validation rolls back attempt creation.',
      );
      const incomplete = structuredClone(answer);
      incomplete.tree.occurrences[0]!.formula = '';
      const save = await request('PATCH', `${path}/attempt`, scope.cookie, {
        revision: 0,
        itemId: first.id,
        answers: incomplete,
      });
      assert.equal(save.statusCode, 200, save.body);
      assert.equal(save.json().attempt.revision, 1);
      const stale = await request('PATCH', `${path}/attempt`, scope.cookie, {
        revision: 0,
        itemId: second.id,
        answers: answer,
      });
      assert.equal(stale.statusCode, 409, stale.body);
      const wrongOccurrence = await request('PATCH', `${path}/attempt`, scope.cookie, {
        revision: 1,
        itemId: objective.id,
        answers: answer,
      });
      assert.equal(wrongOccurrence.statusCode, 400, wrongOccurrence.body);
      const saveSecond = await request('PATCH', `${path}/attempt`, scope.cookie, {
        revision: 1,
        itemId: second.id,
        answers: answer,
      });
      assert.equal(saveSecond.statusCode, 200, saveSecond.body);
      const reloaded = await request('GET', path, scope.cookie);
      assert.equal(reloaded.statusCode, 200, reloaded.body);
      const attempt = savedStudentAssignmentResponseSchema.parse(reloaded.json()).attempt!;
      assert.equal(attempt.revision, 2);
      assert.deepEqual(attempt.answers, { [first.id]: incomplete, [second.id]: answer });
      assert.equal(attempt.result, null);
      assert.equal(attempt.score, undefined);
      await request('POST', `${path}/check`, scope.cookie, { itemId: first.id, answers: answer });
      assert.deepEqual(
        (await request('GET', path, scope.cookie)).json().attempt,
        attempt,
        'Transient checks do not overwrite saved drafts.',
      );
      const solution = await request('GET', `${path}/items/${first.id}/solution`, scope.cookie);
      assert.equal(solution.statusCode, 200, solution.body);
      const key = savedStudentSolutionResponseSchema.parse(solution.json()).solution;
      assert.ok('type' in key && key.type === 'truth_tree');
      assert.deepEqual(key.referenceTree, definition.referenceTree);
      assert.equal(key.explanation, definition.explanation);
      assert.equal(
        (await request('POST', `${path}/submission`, scope.cookie, { revision: 2 })).statusCode,
        403,
      );
      await assert.rejects(
        reviews.listSubmissions(scope.ownerId, assignmentId, { limit: 20, offset: 0 }),
        /not_found/,
        'Practice drafts stay private.',
      );
      if (scope.prefix === '/api') active = { id: outsider.id, role: 'student' };
      const deniedCookie = scope.prefix === '/api' ? scope.cookie : foreignCookie;
      for (const [method, suffix, payload] of [
        ['GET', '', undefined],
        ['GET', `/items/${first.id}/solution`, undefined],
        ['POST', '/check', { itemId: first.id, answers: answer }],
        ['PATCH', '/attempt', { revision: 2, itemId: first.id, answers: answer }],
      ] as const) {
        const denied = await request(method, `${path}${suffix}`, deniedCookie, payload);
        assert.equal(denied.statusCode, 404, denied.body);
        assert.equal(denied.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
      }
      // Test-only policy changes exercise authoritative guards independently of authoring locks.
      await em.nativeUpdate(db.Assignment, assignmentId, {
        solutionAccess: db.SolutionAccess.Never,
      });
      active = { id: student.id, role: 'student' };
      assert.equal(
        (await request('GET', `${path}/items/${first.id}/solution`, scope.cookie)).statusCode,
        403,
      );
      await em.nativeUpdate(db.Assignment, assignmentId, {
        assessmentMode: db.AssessmentMode.CompletionOnly,
        feedbackTiming: db.FeedbackTiming.OnCheck,
      });
      assert.equal(
        (
          await request('PATCH', `${path}/attempt`, scope.cookie, {
            revision: 2,
            itemId: objective.id,
            answers: [],
          })
        ).statusCode,
        409,
        'An unsupported tree policy blocks the entire mixed write.',
      );
      const retained = await em
        .fork()
        .findOneOrFail(db.AssignmentAttempt, { assignment: assignmentId });
      assert.equal(retained.revision, 2);
      assert.equal(retained.submittedAt, null);
    }
  } finally {
    await app?.close();
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
