import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { generateTruthTable } from '@logiclab/logic-engine';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { buildApp } from '../../src/app';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { evaluateSubmission } from '../../src/application/student-work/evaluation';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

test('learning-mode checks, saves and solutions preserve privacy and enforce workspace access', async () => {
  const db = await import('@logiclab/db');
  const schema = `student_check_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url, { schema, snapshotOnMigrate: false });
  const config = readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173' })!;
  const app = buildApp({ demo: await createDemoRuntime(orm, config) });
  let address = 1;
  async function start() {
    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/start',
      headers: { origin: config.APP_ORIGIN },
      remoteAddress: `127.0.0.${address++}`,
      payload: { role: 'student' },
    });
    assert.equal(response.statusCode, 200, response.body);
    const header = response.headers['set-cookie'];
    return {
      session: response.json(),
      cookie: (Array.isArray(header) ? header[0]! : header!).split(';')[0]!,
    };
  }
  try {
    await orm.schema.create();
    const first = await start();
    const second = await start();
    const em = orm.em.fork();
    const assignment = await em.findOneOrFail(db.Assignment, {
      classroom: { owner: { demoWorkspace: first.session.workspace.id } },
      publishedAt: { $ne: null },
    });
    const item = await em.findOneOrFail(
      db.AssignmentItem,
      { assignment: assignment.id },
      { populate: ['problemVersion'] },
    );
    const student = first.session.user.id;
    const table = generateTruthTable(item.problemVersion.definition.formula);
    const answers = table.rows.flatMap((row) =>
      table.columns
        .filter((column) => column.kind === 'answer')
        .map((column) => ({
          rowId: row.id,
          columnId: column.id,
          value: row.values[column.id]!,
        })),
    );
    const path = `/api/demo/resources/student/assignments/${assignment.id}/check`;
    async function check(payload: object, cookie = first.cookie) {
      return app.inject({
        method: 'POST',
        url: path,
        headers: { origin: config.APP_ORIGIN, cookie },
        payload,
        remoteAddress: `127.0.0.${address++}`,
      });
    }
    assert.equal(
      (await check({ itemId: item.id, answers })).statusCode,
      403,
      'Graded feedback stays submission-only.',
    );
    await em.nativeUpdate(db.Assignment, assignment.id, {
      assessmentMode: db.AssessmentMode.UngradedPractice,
      feedbackTiming: db.FeedbackTiming.OnCheck,
      solutionAccess: db.SolutionAccess.Never,
    });
    assert.equal((await check({ itemId: item.id, answers: [] })).statusCode, 200);
    assert.equal(
      await em.count(db.AssignmentAttempt, {}),
      0,
      'Checking fresh work creates no attempt.',
    );
    await em.nativeUpdate(db.Assignment, assignment.id, {
      assessmentMode: db.AssessmentMode.Graded,
      feedbackTiming: db.FeedbackTiming.OnSubmission,
    });
    const store = await createStudentWorkStore(orm);
    const saved = await store.save(student, assignment.id, {
      revision: 0,
      itemId: item.id,
      answers: answers.slice(0, 1),
    });
    // Test-only publication fixture: public authoring still blocks these modes until rollout completes.
    await em.nativeUpdate(db.Assignment, assignment.id, {
      assessmentMode: db.AssessmentMode.UngradedPractice,
      feedbackTiming: db.FeedbackTiming.OnCheck,
      solutionAccess: db.SolutionAccess.Never,
    });
    const before = await em.fork().findOneOrFail(db.AssignmentAttempt, saved.id);
    const snapshot = JSON.stringify(before);
    const result = await check({ itemId: item.id, answers });
    assert.equal(result.statusCode, 200, result.body);
    assert.deepEqual(result.json().feedback.summary, {
      correct: answers.length,
      incorrect: 0,
      unanswered: 0,
      total: answers.length,
    });
    assert.deepEqual(Object.keys(result.json()).sort(), ['feedback', 'itemId']);
    assert(
      result
        .json()
        .feedback.cells.every(
          (cell: object) => Object.keys(cell).sort().join(',') === 'columnId,rowId,status',
        ),
    );
    const partial = await check({
      itemId: item.id,
      answers: [
        { ...answers[0], value: !answers[0]!.value },
        { ...answers[1], value: null },
      ],
    });
    assert.equal(partial.statusCode, 200);
    assert.equal(partial.json().feedback.summary.incorrect, 1);
    assert.equal(partial.json().feedback.summary.unanswered, answers.length - 1);
    assert.equal(
      JSON.stringify(await em.fork().findOneOrFail(db.AssignmentAttempt, saved.id)),
      snapshot,
    );
    assert.equal((await check({ itemId: item.id, answers }, second.cookie)).statusCode, 404);
    async function workRequest(
      method: 'GET' | 'PATCH' | 'POST',
      suffix = '',
      payload?: object,
      cookie = first.cookie,
    ) {
      return app.inject({
        method,
        url: path.replace(/\/check$/, suffix),
        headers: { origin: config.APP_ORIGIN, cookie },
        payload,
        remoteAddress: `127.0.0.${address++}`,
      });
    }
    const read = await workRequest('GET');
    assert.equal(read.statusCode, 200, read.body);
    assert.equal(read.json().assignment.assessmentMode, 'ungraded_practice');
    assert.equal(read.json().attempt.revision, saved.revision);
    assert.equal(read.json().attempt.result, null);
    const saveInput = { revision: saved.revision, itemId: item.id, answers: answers.slice(0, 2) };
    const practiceSave = await workRequest('PATCH', '/attempt', saveInput);
    assert.equal(practiceSave.statusCode, 200, practiceSave.body);
    assert.equal(practiceSave.json().attempt.revision, saved.revision + 1);
    assert.equal(practiceSave.json().attempt.result, null);
    assert.equal(practiceSave.json().attempt.submittedAt, null);
    assert.equal((await workRequest('PATCH', '/attempt', saveInput)).statusCode, 409);
    assert.equal((await workRequest('GET', '', undefined, second.cookie)).statusCode, 404);
    assert.equal(
      (await workRequest('PATCH', '/attempt', saveInput, second.cookie)).statusCode,
      404,
    );
    const noSubmission = await workRequest('POST', '/submission', { revision: saved.revision + 1 });
    assert.equal(noSubmission.statusCode, 403);
    assert.equal(noSubmission.json().error.code, 'SUBMISSION_UNAVAILABLE');
    assert.equal((await workRequest('GET')).json().attempt.revision, saved.revision + 1);
    const solutionPath = `/items/${item.id}/solution`;
    assert.equal((await workRequest('GET', solutionPath)).statusCode, 403);
    await em.nativeUpdate(db.Assignment, assignment.id, {
      solutionAccess: db.SolutionAccess.Anytime,
    });
    const anytime = await workRequest('GET', solutionPath);
    assert.equal(anytime.statusCode, 200, anytime.body);
    assert(anytime.json().solution.rows.length);
    assert.equal(
      (await workRequest('GET', solutionPath, undefined, second.cookie)).statusCode,
      404,
    );
    assert.equal((await workRequest('GET', `/items/${randomUUID()}/solution`)).statusCode, 404);
    const owner = await em.findOneOrFail(db.User, {
      demoWorkspace: first.session.workspace.id,
      role: db.UserRole.Instructor,
    });
    const reviews = await createAssignmentStore(orm);
    await assert.rejects(
      reviews.listSubmissions(owner.id, assignment.id, { limit: 20, offset: 0 }),
      (error: unknown) => error instanceof Error && error.message === 'not_found',
    );

    assert.equal((await check({ itemId: randomUUID(), answers })).statusCode, 404);
    assert.equal(
      (await check({ itemId: item.id, answers: [answers[0], answers[0]] })).json().error.code,
      'DUPLICATE_CELL',
    );
    assert.equal(
      (await check({ itemId: item.id, answers: [{ ...answers[0], rowId: 'bad-row' }] })).json()
        .error.code,
      'INVALID_CELL',
    );
    await em.nativeUpdate(db.Assignment, assignment.id, {
      assessmentMode: db.AssessmentMode.CompletionOnly,
      solutionAccess: db.SolutionAccess.AfterSubmission,
    });
    assert.equal((await check({ itemId: item.id, answers: [] })).statusCode, 200);
    assert.equal((await workRequest('GET')).statusCode, 200);
    assert.equal((await workRequest('GET', solutionPath)).statusCode, 403);
    assert.equal(
      (await workRequest('POST', '/submission', { revision: saved.revision + 1 })).statusCode,
      409,
      'Completion finalization remains blocked in this slice.',
    );

    const completionSave = await workRequest('PATCH', '/attempt', {
      revision: saved.revision + 1,
      itemId: item.id,
      answers: [],
    });
    assert.equal(completionSave.statusCode, 200, completionSave.body);
    assert.equal(completionSave.json().attempt.revision, saved.revision + 2);
    assert.equal(completionSave.json().attempt.result, null);
    assert.equal(completionSave.json().attempt.submittedAt, null);

    await em.nativeUpdate(db.AssignmentAttempt, saved.id, {
      submittedAt: new Date(),
      result: evaluateSubmission(
        [{ id: item.id, formula: item.problemVersion.definition.formula }],
        {},
      ),
    });
    assert.equal(
      (await check({ itemId: item.id, answers })).json().error.code,
      'ATTEMPT_SUBMITTED',
    );
    assert.equal((await workRequest('GET', solutionPath)).statusCode, 200);
    // Even a legacy/corrupt final practice row must not expose answers through instructor review.
    await em.nativeUpdate(db.Assignment, assignment.id, {
      assessmentMode: db.AssessmentMode.UngradedPractice,
      solutionAccess: db.SolutionAccess.Anytime,
    });
    await assert.rejects(
      reviews.findSubmission(owner.id, assignment.id, saved.id),
      (error: unknown) => error instanceof Error && error.message === 'not_found',
    );
    await assert.rejects(
      reviews.listSubmissions(owner.id, assignment.id, { limit: 20, offset: 0 }),
      (error: unknown) => error instanceof Error && error.message === 'not_found',
    );

    await em.nativeUpdate(db.Assignment, assignment.id, { archivedAt: new Date() });
    assert.equal((await check({ itemId: item.id, answers })).statusCode, 404);
    await em.nativeUpdate(db.Assignment, assignment.id, { archivedAt: null, publishedAt: null });
    assert.equal((await check({ itemId: item.id, answers })).statusCode, 404);
    assert.equal(
      await em.count(db.AssignmentAttempt, {}),
      1,
      'Checking never creates another attempt.',
    );
  } finally {
    await app.close();
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
