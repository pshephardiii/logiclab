import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { buildApp } from '../../src/app';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

test('biconditional/tilde survive authored snapshots, previews, assigned checks and frozen submission', async () => {
  const db = await import('@logiclab/db');
  const schema = `biconditional_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url, { schema, snapshotOnMigrate: false });
  const origin = 'http://localhost:5173';
  const config = readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: origin })!;
  let app: ReturnType<typeof buildApp> | undefined;
  try {
    await orm.schema.create();
    app = buildApp({ demo: await createDemoRuntime(orm, config) });
    let cookie = '';
    let address = 1;
    async function request(method: 'GET' | 'POST' | 'PATCH', path: string, payload?: object) {
      const response = await app!.inject({
        method,
        url: path,
        payload,
        remoteAddress: `127.0.0.${address++}`,
        headers: { origin, cookie },
      });
      const header = response.headers['set-cookie'];
      if (header) cookie = (Array.isArray(header) ? header[0]! : header).split(';')[0]!;
      return response;
    }
    const started = await request('POST', '/api/demo/start', { role: 'instructor' });
    assert.equal(started.statusCode, 200, started.body);
    const resource = '/api/demo/resources';
    const classes = await request('GET', resource + '/classes');
    const classroom = classes
      .json()
      .classrooms.find((value: { name: string }) => value.name === 'Demo: Introduction to Logic');
    assert(classroom);
    const input = {
      title: 'Biconditional understanding',
      definition: { type: 'truth_table', definitionVersion: 1, formula: '~[P <-> Q]' },
    };
    const created = await request('POST', resource + '/problems', input);
    assert.equal(created.statusCode, 201, created.body);
    const problemId = created.json().problem.id;
    const definition = { ...input.definition, formula: '¬(P ↔ Q)' };
    const updated = await request('PATCH', `${resource}/problems/${problemId}`, { definition });
    assert.equal(updated.statusCode, 200, updated.body);
    const preview = await request('POST', '/api/truth-tables/exercise', {
      formula: definition.formula,
    });
    assert.equal(preview.statusCode, 200, preview.body);
    const published = await request('POST', `${resource}/problems/${problemId}/versions`, {});
    assert.equal(published.statusCode, 201, published.body);
    const version = published.json().version;
    assert.equal(version.definition.formula, definition.formula);
    const invalid = await request('PATCH', `${resource}/problems/${problemId}`, {
      definition: { ...definition, formula: 'P <-> Q <-> R' },
    });
    assert.equal(invalid.statusCode, 400, invalid.body);
    assert.equal(invalid.json().error.code, 'UNEXPECTED_TOKEN');
    assert.equal(
      (await request('GET', `${resource}/problems/${problemId}`)).json().problem.definition.formula,
      definition.formula,
    );
    const source = await request('POST', '/api/truth-tables/solution', { formula: '~[P <-> Q]' });
    assert.equal(source.statusCode, 200, source.body);
    const solution = source.json();
    assert.deepEqual(
      solution.rows.map(
        (row: { values: Record<string, boolean> }) => row.values['expr:v1:¬(P ↔ Q)'],
      ),
      [false, true, true, false],
    );
    const answers = solution.rows.flatMap((row: { id: string; values: Record<string, boolean> }) =>
      solution.columns
        .filter((column: { kind: string }) => column.kind === 'answer')
        .map((column: { id: string }) => ({
          rowId: row.id,
          columnId: column.id,
          value: row.values[column.id],
        })),
    );
    const assigned = [];
    for (const assessmentMode of ['graded', 'ungraded_practice', 'completion_only'] as const) {
      const draft = await request('POST', `${resource}/classes/${classroom.id}/assignments`, {
        title: assessmentMode,
        problemVersionIds: [version.id],
        assessmentMode,
        feedbackTiming: assessmentMode === 'ungraded_practice' ? 'on_check' : 'on_submission',
        solutionAccess: assessmentMode === 'ungraded_practice' ? 'never' : 'after_submission',
      });
      assert.equal(draft.statusCode, 201, draft.body);
      const assignment = draft.json().assignment;
      const publication = await request(
        'POST',
        `${resource}/assignments/${assignment.id}/publish`,
        {},
      );
      assert.equal(publication.statusCode, 200, publication.body);
      assigned.push(assignment);
    }
    const switched = await request('POST', '/api/demo/role', { role: 'student' });
    assert.equal(switched.statusCode, 200, switched.body);
    for (const assignment of assigned) {
      const path = `${resource}/student/assignments/${assignment.id}`;
      const read = await request('GET', path);
      assert.equal(read.statusCode, 200, read.body);
      const item = read.json().assignment.items[0];
      assert.equal(item.formula, definition.formula);
      assert.deepEqual(item.exercise, preview.json());
      for (const row of item.exercise.rows)
        for (const column of solution.columns.filter(
          (value: { kind: string }) => value.kind === 'answer',
        ))
          assert.equal(Object.hasOwn(row.values, column.id), false);
      const em = orm.em.fork();
      const check = await request('POST', path + '/check', { itemId: item.id, answers });
      if (assignment.assessmentMode === 'ungraded_practice') {
        assert.equal(check.statusCode, 200, check.body);
        assert.deepEqual(check.json().feedback.summary, {
          correct: 8,
          incorrect: 0,
          unanswered: 0,
          total: 8,
        });
        assert.equal(await em.count(db.AssignmentAttempt, { assignment: assignment.id }), 0);
        assert.equal((await request('GET', `${path}/items/${item.id}/solution`)).statusCode, 403);
        continue;
      }
      assert.equal(check.statusCode, 403);
      const saved = await request('PATCH', path + '/attempt', {
        revision: 0,
        itemId: item.id,
        answers,
      });
      assert.equal(saved.statusCode, 200, saved.body);
      const finalized = await request('POST', path + '/submission', {
        revision: saved.json().attempt.revision,
      });
      assert.equal(finalized.statusCode, 200, finalized.body);
      const result = finalized.json().attempt.result;
      assert.deepEqual(
        result.summary,
        assignment.assessmentMode === 'graded'
          ? { correct: 8, incorrect: 0, unanswered: 0, total: 8 }
          : { completedCells: 8, totalCells: 8 },
      );
      const expected = await request('GET', `${path}/items/${item.id}/solution`);
      assert.equal(expected.statusCode, 200, expected.body);
      assert.deepEqual(expected.json().solution, solution);
      const retry = await request('POST', path + '/submission', {
        revision: saved.json().attempt.revision,
      });
      assert.deepEqual(retry.json().attempt.result, result);
      const reloaded = await request('GET', path);
      assert.deepEqual(reloaded.json().attempt.result, result);
    }
  } finally {
    await app?.close();
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
