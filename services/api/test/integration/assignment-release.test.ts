import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { readAuthConfig } from '../../src/config/auth';
import type { AuthContext } from '../../src/routes/auth/context';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { generateTruthTable } from '@logiclab/logic-engine';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

async function fixture() {
  const db = await import('@logiclab/db');
  const schema = `release_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  await orm.schema.create();
  const em = orm.em.fork();
  const user = (
    subject: string,
    role: typeof db.UserRole.Instructor | typeof db.UserRole.Student,
  ) => em.create(db.User, { cognitoUserPoolId: schema, cognitoSubject: subject, role });
  const owner = user('owner', db.UserRole.Instructor);
  const other = user('other', db.UserRole.Instructor);
  const student = user('student', db.UserRole.Student);
  const late = user('late', db.UserRole.Student);
  const outsider = user('outsider', db.UserRole.Student);
  const classroom = em.create(db.Classroom, { owner, name: 'Release class' });
  const problem = em.create(db.Problem, {
    owner,
    title: 'Conjunction',
    definition: { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
  });
  const version = em.create(db.ProblemVersion, {
    problem,
    version: 1,
    title: problem.title,
    definition: problem.definition,
  });
  em.persist([
    owner,
    other,
    student,
    late,
    outsider,
    classroom,
    problem,
    version,
    em.create(db.Enrollment, { classroom, student }),
    em.create(db.Enrollment, { classroom, student: late }),
  ]);
  await em.flush();
  const assignments = await createAssignmentStore(orm);
  const work = await createStudentWorkStore(orm);
  let active = owner;
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
    service: {
      authenticate: async () => ({
        id: active.id,
        subject: active.cognitoSubject,
        role: active.role,
      }),
    },
  } as unknown as AuthContext;
  const app = buildApp({
    assignment: { ...context, assignments },
    studentWork: { ...context, studentWork: work },
  });
  let address = 1;
  const request = (
    actor: typeof owner,
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    payload?: object,
  ) => {
    active = actor;
    return app.inject({
      method,
      url: path,
      payload,
      remoteAddress: `127.0.0.${address++}`,
      headers: { cookie: `logiclab_session=${'a'.repeat(43)}`, origin: config.APP_ORIGIN },
    });
  };
  async function draft(mode: 'graded' | 'completion_only' = 'graded') {
    return assignments.create(owner.id, classroom.id, {
      title: mode,
      problemVersionIds: [version.id],
      assessmentMode: mode,
      feedbackTiming: 'on_submission',
      solutionAccess: 'instructor_release',
      gradeReleaseTiming: mode === 'graded' ? 'instructor_release' : 'on_submission',
    });
  }
  async function publish(id: string) {
    // Isolate release behavior from separately tested payment coverage.
    await em.nativeUpdate(db.Assignment, id, { publishedAt: new Date() });
  }
  async function close() {
    await app.close();
    await em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
  return {
    db,
    orm,
    em,
    owner,
    other,
    student,
    late,
    outsider,
    request,
    assignments,
    work,
    draft,
    publish,
    close,
  };
}

test('HTTP grade release withholds every student result projection while retaining owner review and separate answers', async () => {
  const f = await fixture();
  try {
    const assignment = await f.draft();
    await f.publish(assignment.id);
    const base = `/api/assignments/${assignment.id}`;
    const studentPath = `/api/student/assignments/${assignment.id}`;
    const initial = await f.request(f.student, 'POST', studentPath + '/submission', {
      revision: 0,
    });
    assert.equal(initial.statusCode, 200, initial.body);
    const submitted = initial.json().attempt;
    assert.equal(submitted.result, null);
    assert.equal(submitted.gradePending, true);
    const retry = await f.request(f.student, 'POST', studentPath + '/submission', { revision: 0 });
    assert.equal(retry.statusCode, 200, retry.body);
    assert.equal(retry.json().attempt.result, null);
    const pendingRead = await f.request(f.student, 'GET', studentPath);
    assert.equal(pendingRead.statusCode, 200, pendingRead.body);
    assert.equal(pendingRead.json().attempt.result, null);
    assert.equal(pendingRead.json().attempt.gradePending, true);
    assert.equal(
      (
        await f.request(f.student, 'POST', studentPath + '/check', {
          itemId: assignment.items[0]!.id,
          answers: [],
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await f.request(
          f.student,
          'GET',
          studentPath + `/items/${assignment.items[0]!.id}/solution`,
        )
      ).statusCode,
      403,
    );
    assert.equal((await f.work.read(f.student.id, assignment.id)).attempt?.result, null);
    const retained = await f.em.findOneOrFail(f.db.AssignmentAttempt, submitted.id, {
      refresh: true,
    });
    assert(retained.result);
    const frozen = structuredClone(retained.result);
    assert(
      (await f.assignments.findSubmission(f.owner.id, assignment.id, submitted.id)).attempt.result,
    );
    await assert.rejects(
      f.work.solution(f.student.id, assignment.id, assignment.items[0]!.id),
      /solution_locked/,
    );
    assert.equal((await f.request(f.other, 'POST', base + '/release-grades', {})).statusCode, 404);
    assert.equal(
      (await f.request(f.student, 'POST', base + '/release-grades', {})).statusCode,
      403,
    );
    const released = await f.request(f.owner, 'POST', base + '/release-grades', {});
    assert.equal(released.statusCode, 200, released.body);
    const timestamp = released.json().assignment.gradesReleasedAt;
    assert(timestamp);
    assert.equal(released.json().assignment.answersRevealedAt, null);
    assert.equal(
      (await f.request(f.owner, 'POST', base + '/release-grades', {})).json().assignment
        .gradesReleasedAt,
      timestamp,
    );
    const visibleRead = await f.request(f.student, 'GET', studentPath);
    assert.deepEqual(visibleRead.json().attempt.result, frozen);
    assert.equal(visibleRead.json().attempt.gradePending, false);
    await assert.rejects(
      f.work.solution(f.student.id, assignment.id, assignment.items[0]!.id),
      /solution_locked/,
    );
    assert((await f.work.submit(f.late.id, assignment.id, 0)).result);
    await assert.rejects(f.work.read(f.outsider.id, assignment.id), /not_found/);
    assert.equal((await f.request(f.owner, 'POST', base + '/reveal-answers', {})).statusCode, 200);
    assert((await f.work.solution(f.student.id, assignment.id, assignment.items[0]!.id)).solution);
    const copy = await f.assignments.duplicate(f.owner.id, assignment.id);
    assert.equal(copy.gradesReleasedAt, null);
    assert.equal(copy.answersRevealedAt, null);
    assert.equal(copy.gradeReleaseTiming, 'instructor_release');
    await f.assignments.setArchived(f.owner.id, assignment.id, true);
    assert.equal((await f.request(f.owner, 'POST', base + '/release-grades', {})).statusCode, 409);
    await f.assignments.setArchived(f.owner.id, assignment.id, false);
    assert.equal(
      (await f.assignments.findOwned(f.owner.id, assignment.id)).gradesReleasedAt,
      timestamp,
    );
    assert.equal(
      (await f.request(f.owner, 'PATCH', base, { gradeReleaseTiming: 'on_submission' })).statusCode,
      409,
    );
    assert.deepEqual(
      (await f.em.findOneOrFail(f.db.AssignmentAttempt, submitted.id, { refresh: true })).result,
      frozen,
    );
  } finally {
    await f.close();
  }
});

test('answers can be revealed before grades, and completion-only requires no grade action', async () => {
  const f = await fixture();
  try {
    const graded = await f.draft();
    await assert.rejects(
      f.assignments.release(f.owner.id, graded.id, 'answers'),
      /release_unavailable/,
    );
    await f.publish(graded.id);
    const [first, second] = await Promise.all([
      f.assignments.release(f.owner.id, graded.id, 'answers'),
      f.assignments.release(f.owner.id, graded.id, 'answers'),
    ]);
    assert.equal(first.answersRevealedAt, second.answersRevealedAt);
    assert.equal(first.gradesReleasedAt, null);
    assert((await f.work.solution(f.student.id, graded.id, graded.items[0]!.id)).solution);
    assert.equal((await f.work.submit(f.student.id, graded.id, 0)).gradePending, true);
    const concurrent = await f.draft();
    await f.publish(concurrent.id);
    await Promise.all([
      f.work.submit(f.student.id, concurrent.id, 0),
      f.assignments.release(f.owner.id, concurrent.id, 'grades'),
      f.assignments.release(f.owner.id, concurrent.id, 'answers'),
    ]);
    const after = await f.work.read(f.student.id, concurrent.id);
    assert(after.attempt?.result);
    assert.equal(after.attempt.gradePending, false);
    assert((await f.work.solution(f.student.id, concurrent.id, concurrent.items[0]!.id)).solution);
    const completion = await f.draft('completion_only');
    await f.publish(completion.id);
    const table = generateTruthTable('P & Q');
    const column = table.columns.find((c) => c.kind === 'answer')!;
    const answers = table.rows.map((row) => ({
      rowId: row.id,
      columnId: column.id,
      value: row.values[column.id]!,
    }));
    const saved = await f.work.save(f.student.id, completion.id, {
      revision: 0,
      itemId: completion.items[0]!.id,
      answers,
    });
    const done = await f.work.submit(f.student.id, completion.id, saved.revision);
    assert.equal(done.result?.gradingVersion, 'completion_v1');
    assert.equal(done.gradePending, false);
    await assert.rejects(
      f.assignments.release(f.owner.id, completion.id, 'grades'),
      /release_unavailable/,
    );
    await assert.rejects(
      f.work.solution(f.student.id, completion.id, completion.items[0]!.id),
      /solution_locked/,
    );
    await f.assignments.release(f.owner.id, completion.id, 'answers');
    assert((await f.work.solution(f.student.id, completion.id, completion.items[0]!.id)).solution);
    // PATCH validates merged policy before changing any field.
    const draft = await f.draft();
    await assert.rejects(
      f.assignments.update(f.owner.id, draft.id, {
        assessmentMode: 'completion_only',
        title: 'Must not persist',
      }),
      /invalid_policy/,
    );
    assert.equal((await f.assignments.findOwned(f.owner.id, draft.id)).title, 'graded');
    const ordinary = await f.assignments.update(f.owner.id, draft.id, {
      gradeReleaseTiming: 'on_submission',
      solutionAccess: 'never',
    });
    await f.publish(ordinary.id);
    const result = await f.work.submit(f.student.id, ordinary.id, 0);
    assert(result.result);
    await assert.rejects(
      f.assignments.release(f.owner.id, ordinary.id, 'grades'),
      /release_unavailable/,
    );
  } finally {
    await f.close();
  }
});
