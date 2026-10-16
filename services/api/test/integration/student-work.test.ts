import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { generateTruthTable } from '@logiclab/logic-engine';
import { buildApp } from '../../src/app';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
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
  assert.fail('Expected a real PostgreSQL lock wait.');
}

test(
  'student work preserves private drafts, freezes final results, enforces policy, and serializes concurrent saves/submission',
  { timeout: 30_000 },
  async () => {
    const { createDatabase, User, UserRole, Classroom, Enrollment, Assignment, AssignmentAttempt } =
      await import('@logiclab/db');
    const schema = `student_work_${randomUUID().replaceAll('-', '')}`;
    const orm = await createDatabase(url, { schema, snapshotOnMigrate: false });
    const assignments = await createAssignmentStore(orm);
    const problems = await createProblemStore(orm);
    const store = await createStudentWorkStore(orm);
    const em = orm.em.fork();
    const owner = em.create(User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'owner',
      role: UserRole.Instructor,
    });
    const student = em.create(User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'student',
      role: UserRole.Student,
    });
    const other = em.create(User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'other',
      role: UserRole.Student,
    });
    const outsider = em.create(User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'outsider',
      role: UserRole.Student,
    });
    const classroom = em.create(Classroom, { owner, name: 'Assigned class' });
    const otherClass = em.create(Classroom, { owner, name: 'Other class' });
    let active = student;
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
      studentWork: { ...context, studentWork: store },
      assignment: { ...context, assignments },
    });
    let address = 1;
    const request = (method: 'GET' | 'PATCH' | 'POST', path: string, payload?: object) =>
      app.inject({
        method,
        url: path,
        payload,
        remoteAddress: `127.0.0.${address++}`,
        headers: { origin: config.APP_ORIGIN, cookie: `logiclab_session=${'x'.repeat(43)}` },
      });
    try {
      await orm.schema.create();
      em.persist([owner, student, other, outsider, classroom, otherClass]);
      await em.flush();
      em.persist([
        em.create(Enrollment, { classroom, student }),
        em.create(Enrollment, { classroom, student: other }),
      ]);
      await em.flush();
      const problem = await problems.create(owner.id, {
        title: 'Pinned exercise',
        definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
      });
      const publication = await problems.publish(owner.id, problem.id);
      assert.equal(publication.status, 'published');
      if (publication.status !== 'published') throw new Error('Fixture failed');
      const input = {
        title: 'Assigned practice',
        problemVersionIds: [publication.version.id, publication.version.id],
        assessmentMode: 'graded' as const,
        feedbackTiming: 'on_submission' as const,
        allowSolutions: false,
      };
      async function published(allowSolutions = false) {
        const draft = await assignments.create(owner.id, classroom.id, {
          ...input,
          allowSolutions,
        });
        return assignments.publish(owner.id, draft.id);
      }
      const assignment = await published();
      const draft = await assignments.create(owner.id, classroom.id, input);
      const path = `/api/student/assignments/${assignment.id}`;
      const first = assignment.items[0]!;
      const second = assignment.items[1]!;
      const table = generateTruthTable('P');
      const answerColumn = table.columns.find((column) => column.kind === 'answer')!;
      const correct = table.rows.map((row) => ({
        rowId: row.id,
        columnId: answerColumn.id,
        value: row.values[answerColumn.id]!,
      }));
      const partial = [
        { ...correct[0]!, value: false },
        { ...correct[1]!, value: null },
      ];
      const list = (
        await request('GET', `/api/student/classes/${classroom.id}/assignments?limit=1`)
      ).json();
      assert.equal(list.assignments.length, 1);
      assert.equal(list.assignments[0].id, assignment.id);
      assert.equal(list.nextOffset, null);
      assert.equal((await request('GET', `/api/student/assignments/${draft.id}`)).statusCode, 404);
      assert.equal(
        (await request('GET', `/api/student/classes/${otherClass.id}/assignments`)).statusCode,
        404,
      );
      const initialResponse = await request('GET', path);
      assert.equal(initialResponse.statusCode, 200);
      const initial = initialResponse.json();
      assert.equal(initial.attempt, null);
      assert.notEqual(initial.assignment.items[0].id, initial.assignment.items[1].id);
      for (const item of initial.assignment.items) {
        for (const row of item.exercise.rows) {
          assert(!Object.hasOwn(row.values, answerColumn.id));
        }
        assert(!Object.hasOwn(item, 'solution'));
      }
      const save = (revision: number, itemId = first.id, answers = partial) =>
        request('PATCH', `${path}/attempt`, { revision, itemId, answers });
      const firstSave = await save(0);
      assert.equal(firstSave.statusCode, 200, firstSave.body);
      let attempt = firstSave.json().attempt;
      active = owner;
      const reviewPath = `/api/assignments/${assignment.id}/submissions`;
      assert.deepEqual((await request('GET', reviewPath)).json(), {
        submissions: [],
        nextOffset: null,
      });
      assert.equal(
        (await request('GET', `${reviewPath}/${attempt.id}`)).statusCode,
        404,
        'Draft attempt IDs are not reviewable.',
      );
      active = student;
      assert.equal(attempt.revision, 1);
      assert.equal(attempt.result, null);
      assert.equal(attempt.submittedAt, null);
      assert.deepEqual(attempt.answers[first.id], partial);
      assert(!Object.hasOwn(attempt.answers, second.id));
      assert.equal((await save(0)).statusCode, 409);
      for (const answers of [
        [{ ...correct[0]!, columnId: 'forged' }],
        [correct[0]!, correct[0]!],
        [{ ...correct[0]!, columnId: table.columns.find((column) => column.kind === 'given')!.id }],
      ])
        assert.equal((await save(1, first.id, answers as typeof partial)).statusCode, 400);
      assert.equal((await save(1, randomUUID())).statusCode, 404);
      assert.deepEqual(
        (await request('GET', path)).json().attempt,
        attempt,
        'Invalid saves preserve revision and work.',
      );
      assert.equal((await request('GET', `${path}/items/${first.id}/solution`)).statusCode, 403);
      active = other;
      assert.equal((await request('GET', path)).json().attempt, null);
      active = student;
      const savedSecond = await save(1, second.id, correct as typeof partial);
      assert.equal(savedSecond.statusCode, 200, savedSecond.body);
      attempt = savedSecond.json().attempt;
      assert.deepEqual(attempt.answers[first.id], partial);
      assert.equal(attempt.revision, 2);
      assert.equal(attempt.result, null);
      assert.equal((await request('POST', `${path}/submission`, { revision: 1 })).statusCode, 409);
      const final = await request('POST', `${path}/submission`, { revision: 2 });
      assert.equal(final.statusCode, 200, final.body);
      const submitted = final.json().attempt;
      assert.equal(submitted.revision, 3);
      assert(submitted.submittedAt);
      assert.deepEqual(submitted.result.summary, {
        correct: 2,
        incorrect: 1,
        unanswered: 1,
        total: 4,
      });
      assert.equal(submitted.result.items.length, 2);
      active = owner;
      const finalReview = await request('GET', `${reviewPath}/${submitted.id}`);
      assert.equal(finalReview.statusCode, 200, finalReview.body);
      assert.deepEqual(finalReview.json().attempt, submitted);
      assert(!Object.hasOwn(finalReview.json().submission.student, 'cognitoSubject'));
      assert.equal(
        (await request('GET', `/api/assignments/${draft.id}/submissions/${submitted.id}`))
          .statusCode,
        404,
      );
      const foreignInstructor = em.create(User, {
        cognitoUserPoolId: schema,
        cognitoSubject: 'foreign-instructor',
        role: UserRole.Instructor,
      });
      em.persist(foreignInstructor);
      await em.flush();
      active = foreignInstructor;
      assert.equal((await request('GET', reviewPath)).statusCode, 404);
      assert.equal((await request('GET', `${reviewPath}/${submitted.id}`)).statusCode, 404);
      active = student;

      assert.equal(submitted.result.items[0].feedback.cells[0].status, 'incorrect');
      assert.equal(submitted.result.items[0].feedback.cells[1].status, 'unanswered');
      assert(!final.body.includes('expected'));
      assert.equal((await save(3)).statusCode, 409);
      assert.deepEqual(
        (await request('POST', `${path}/submission`, { revision: 2 })).json().attempt,
        submitted,
      );
      assert.equal(
        (await request('GET', `${path}/items/${first.id}/solution`)).statusCode,
        403,
        'Disabled solutions remain disabled after submission.',
      );
      await assert.rejects(
        em.nativeUpdate(AssignmentAttempt, submitted.id, { answers: {} }),
        /immutable/,
      );
      await assert.rejects(em.nativeDelete(AssignmentAttempt, submitted.id), /immutable/);
      await problems.update(owner.id, problem.id, {
        definition: { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
      });
      assert.deepEqual(
        (await request('GET', path)).json().attempt,
        submitted,
        'Official feedback is read from the retained result.',
      );

      const allowed = await published(true);
      const allowedPath = `/api/student/assignments/${allowed.id}`;
      assert.equal(
        (await request('GET', `${allowedPath}/items/${allowed.items[0]!.id}/solution`)).statusCode,
        403,
      );
      const blank = await request('POST', `${allowedPath}/submission`, { revision: 0 });
      assert.equal(blank.statusCode, 200, blank.body);
      assert.equal(blank.json().attempt.result.summary.unanswered, 4);
      const solution = await request(
        'GET',
        `${allowedPath}/items/${allowed.items[0]!.id}/solution`,
      );
      assert.equal(solution.statusCode, 200);
      assert.equal(solution.json().solution.rows[0].values[answerColumn.id], true);
      assert.equal(
        (await request('GET', `${allowedPath}/items/${first.id}/solution`)).statusCode,
        404,
      );
      assert.equal(
        (
          await request('PATCH', `${allowedPath}/attempt`, {
            revision: 1,
            itemId: first.id,
            answers: [],
          })
        ).statusCode,
        404,
      );

      active = outsider;
      for (const [method, suffix, payload] of [
        ['GET', '', undefined],
        ['PATCH', '/attempt', { revision: 0, itemId: first.id, answers: [] }],
        ['POST', '/submission', { revision: 0 }],
        ['GET', `/items/${first.id}/solution`, undefined],
      ] as const)
        assert.equal((await request(method, path + suffix, payload)).statusCode, 404);
      active = owner;
      assert.equal((await request('GET', path)).statusCode, 403);
      active = student;
      await assignments.setArchived(owner.id, assignment.id, true);
      assert.equal((await request('GET', path)).statusCode, 404);
      assert.equal((await save(3)).statusCode, 404);
      await assignments.setArchived(owner.id, assignment.id, false);
      assert.deepEqual((await request('GET', path)).json().attempt, submitted);

      const concurrent = await published();
      const concurrentItem = concurrent.items[0]!.id;
      const saves = await Promise.allSettled([
        store.save(student.id, concurrent.id, {
          revision: 0,
          itemId: concurrentItem,
          answers: partial,
        }),
        store.save(student.id, concurrent.id, {
          revision: 0,
          itemId: concurrentItem,
          answers: correct,
        }),
      ]);
      assert.equal(saves.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(saves.filter((result) => result.status === 'rejected').length, 1);
      assert.equal(
        await em
          .fork()
          .count(AssignmentAttempt, { assignment: concurrent.id, student: student.id }),
        1,
      );
      const concurrentRead = await store.read(student.id, concurrent.id);
      assert.equal(concurrentRead.attempt!.revision, 1);
      const finals = await Promise.all([
        store.submit(student.id, concurrent.id, 1),
        store.submit(student.id, concurrent.id, 1),
      ]);
      assert.deepEqual(finals[0], finals[1]);

      const race = await published();
      const raceId = race.items[0]!.id;
      const races = await Promise.allSettled([
        store.save(student.id, race.id, { revision: 0, itemId: raceId, answers: correct }),
        store.submit(student.id, race.id, 0),
      ]);
      assert.equal(races.filter((result) => result.status === 'fulfilled').length, 1);
      const raceState = (await store.read(student.id, race.id)).attempt!;
      assert.equal(raceState.revision, 1);
      assert.equal(Boolean(raceState.submittedAt), races[1]!.status === 'fulfilled');

      const barrier = await published();
      const barrierItem = barrier.items[0]!.id;
      const own = await store.save(student.id, barrier.id, {
        revision: 0,
        itemId: barrierItem,
        answers: partial,
      });
      const lock = orm.em.fork();
      await lock.begin();
      try {
        await lock.nativeUpdate(AssignmentAttempt, own.id, { revision: 2 });
        const pending = store.save(student.id, barrier.id, {
          revision: 1,
          itemId: barrierItem,
          answers: correct,
        });
        const rejected = assert.rejects(
          pending,
          (error: any) => error.reason === 'revision_conflict',
        );
        await waitForLock(orm, schema);
        const parallel = await store.save(other.id, barrier.id, {
          revision: 0,
          itemId: barrierItem,
          answers: correct,
        });
        assert.equal(
          parallel.revision,
          1,
          'Another student can save while this attempt is locked.',
        );
        await lock.commit();
        await rejected;
      } finally {
        if (lock.isInTransaction()) await lock.rollback();
      }
      const archiving = await published();
      const archiveLock = orm.em.fork();
      await archiveLock.begin();
      try {
        await archiveLock.nativeUpdate(Assignment, archiving.id, { archivedAt: new Date() });
        const pending = store.save(student.id, archiving.id, {
          revision: 0,
          itemId: archiving.items[0]!.id,
          answers: [],
        });
        const rejected = assert.rejects(pending, (error: any) => error.reason === 'not_found');
        await waitForLock(orm, schema);
        await archiveLock.commit();
        await rejected;
      } finally {
        if (archiveLock.isInTransaction()) await archiveLock.rollback();
      }
      await assignments.setArchived(owner.id, assignment.id, true);
      active = owner;
      assert.equal(
        (await request('GET', `${reviewPath}/${submitted.id}`)).statusCode,
        200,
        'Archived submissions remain reviewable.',
      );
      active = student;
      await assignments.setArchived(owner.id, assignment.id, false);
      assert.equal((await store.read(student.id, assignment.id)).attempt!.id, submitted.id);
      await em.fork().nativeDelete(Enrollment, { student: student.id, classroom: classroom.id });
      await assert.rejects(
        store.read(student.id, assignment.id),
        (error: any) => error.reason === 'not_found',
      );
      active = owner;
      assert.equal(
        (await request('GET', `${reviewPath}/${submitted.id}`)).statusCode,
        200,
        'Withdrawal retains instructor review access.',
      );
      assert.equal(
        await em.fork().count(AssignmentAttempt, { id: submitted.id }),
        1,
        'Withdrawal retains submitted work.',
      );
    } finally {
      await app.close();
      await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
      await orm.close(true);
    }
  },
);
