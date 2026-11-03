import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Assignment,
  AssignmentAttempt,
  User,
  UserRole,
  Classroom,
  SubmissionGradingRevision,
  AssessmentMode,
  type createDatabase,
} from '../src/index.ts';
import { Migration20261103120000 } from '../src/migrations/Migration20261103120000.ts';

export function registerSubmissionGradingPersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  type Manager = typeof orm.em;
  async function transaction(work: (em: Manager) => Promise<void>) {
    const em = orm.em.fork();
    await em.begin();
    try {
      await work(em);
    } finally {
      await em.rollback();
    }
  }
  async function fixture(em: Manager, submitted = true) {
    const owner = em.create(User, {
      cognitoUserPoolId: 'grading-history',
      cognitoSubject: randomUUID(),
      role: UserRole.Instructor,
    });
    const student = em.create(User, {
      cognitoUserPoolId: 'grading-history',
      cognitoSubject: randomUUID(),
      role: UserRole.Student,
    });
    const classroom = em.create(Classroom, { owner, name: 'Retained grading' });
    const assignment = em.create(Assignment, {
      classroom,
      title: 'Retained grading',
      publishedAt: new Date(),
    });
    const itemId = randomUUID();
    const score = {
      scoringVersion: 'points_v1' as const,
      items: [{ itemId, maxPoints: 10, status: 'graded' as const, earnedPoints: 0 }],
      summary: { status: 'graded' as const, maxPoints: 10, earnedPoints: 0, percentage: 0 },
    };
    const attempt = em.create(AssignmentAttempt, {
      assignment,
      student,
      ...(submitted
        ? {
            submittedAt: new Date(),
            result: {
              gradingVersion: 'truth_table_v1' as const,
              items: [],
              summary: { correct: 0, incorrect: 0, unanswered: 0, total: 0 },
            },
            score,
          }
        : {}),
    });
    em.persist([owner, student, classroom, assignment, attempt]);
    await em.flush();
    const changes = [{ itemId, earnedPoints: 5, comment: 'Instructor adjustment.' }];
    const at = new Date();
    const record = em.create(SubmissionGradingRevision, {
      attempt,
      revision: 1,
      reviewer: owner,
      changes,
      grading: {
        gradingVersion: 'instructor_grading_v1',
        revision: 1,
        items: changes.map((change) => ({
          ...change,
          reviewedBy: owner.id,
          reviewedAt: at.toISOString(),
        })),
      },
      score: {
        ...score,
        items: [{ ...score.items[0]!, earnedPoints: 5 }],
        summary: { ...score.summary, earnedPoints: 5, percentage: 50 },
      },
      createdAt: at,
    });
    return { owner, student, assignment, attempt, record };
  }
  async function migrate(em: Manager, direction: 'up' | 'down') {
    const migration = new Migration20261103120000(orm.driver, orm.config);
    migration[direction]();
    for (const sql of migration.getQueries()) await em.execute(sql);
  }
  test('grading revisions retain independent JSON and metadata without rewriting final attempt evidence', () =>
    transaction(async (em) => {
      const f = await fixture(em);
      const original = await em.execute(
        'select answers::text, result::text, score::text, revision, submitted_at from assignment_attempts where id = ?',
        [f.attempt.id],
      );
      em.persist(f.record);
      await em.flush();
      em.clear();
      const saved = await em.findOneOrFail(SubmissionGradingRevision, f.record.id);
      assert.equal(saved.grading.items[0]!.comment, 'Instructor adjustment.');
      assert.equal(saved.reviewer.id, f.owner.id);
      assert.equal(saved.score.summary.earnedPoints, 5);
      assert.deepEqual(
        await em.execute(
          'select answers::text, result::text, score::text, revision, submitted_at from assignment_attempts where id = ?',
          [f.attempt.id],
        ),
        original,
      );
    }));
  for (const invalid of ['draft', 'completion', 'archived', 'foreign_reviewer'] as const) {
    test(`grading database admission rejects ${invalid}`, () =>
      transaction(async (em) => {
        const f = await fixture(em, invalid !== 'draft');
        if (invalid === 'completion')
          await em.nativeUpdate(Assignment, f.assignment.id, {
            assessmentMode: AssessmentMode.CompletionOnly,
          });
        if (invalid === 'archived')
          await em.nativeUpdate(Assignment, f.assignment.id, { archivedAt: new Date() });
        if (invalid === 'foreign_reviewer') f.record.reviewer = f.student;
        em.persist(f.record);
        await assert.rejects(em.flush(), /owned active final graded submission/);
      }));
  }
  for (const operation of ['update', 'delete', 'skip_revision'] as const) {
    test(`retained grading rejects ${operation}`, () =>
      transaction(async (em) => {
        const f = await fixture(em);
        em.persist(f.record);
        await em.flush();
        if (operation === 'update')
          await assert.rejects(
            em.nativeUpdate(SubmissionGradingRevision, f.record.id, { score: f.attempt.score! }),
            /immutable/,
          );
        else if (operation === 'delete')
          await assert.rejects(
            em.nativeDelete(SubmissionGradingRevision, f.record.id),
            /immutable/,
          );
        else {
          const next = em.create(SubmissionGradingRevision, {
            ...f.record,
            id: randomUUID(),
            revision: 3,
            grading: { ...f.record.grading, revision: 3 },
          });
          em.persist(next);
          await assert.rejects(em.flush(), /appended in order/);
        }
      }));
  }
  test('grading rollback refuses to discard retained instructor decisions', () =>
    transaction(async (em) => {
      const f = await fixture(em);
      em.persist(f.record);
      await em.flush();
      await assert.rejects(migrate(em, 'down'), /retained instructor grading exists/);
    }));
  test('empty grading migration down/up preserves previously retained submissions', () =>
    transaction(async (em) => {
      const f = await fixture(em);
      const read = () =>
        em.execute(
          'select answers::text, result::text, score::text, revision, submitted_at from assignment_attempts where id = ?',
          [f.attempt.id],
        );
      const before = await read();
      await migrate(em, 'down');
      await migrate(em, 'up');
      assert.deepEqual(await read(), before);
    }));
}
