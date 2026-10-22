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

test('explicit checks enforce policy and workspace access without creating, saving or grading attempts', async () => {
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
    });
    assert.equal((await check({ itemId: item.id, answers: [] })).statusCode, 200);
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
