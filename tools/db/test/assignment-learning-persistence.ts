import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Assignment,
  Classroom,
  User,
  UserRole,
  AssessmentMode,
  FeedbackTiming,
  type createDatabase,
} from '../src/index.ts';
import { Migration20261022155758 } from '../src/migrations/Migration20261022155758.ts';

/** Database capabilities only; authoring routes remain graded-only during staged rollout. */
export function registerAssignmentLearningPersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  async function classroom(em: typeof orm.em) {
    const owner = em.create(User, {
      cognitoUserPoolId: 'learning-policy-test',
      cognitoSubject: randomUUID(),
      role: UserRole.Instructor,
    });
    const result = em.create(Classroom, { owner, name: 'Learning policies' });
    em.persist([owner, result]);
    await em.flush();
    return result;
  }

  for (const [mode, timing] of [
    [AssessmentMode.Graded, FeedbackTiming.OnSubmission],
    [AssessmentMode.CompletionOnly, FeedbackTiming.OnCheck],
    [AssessmentMode.UngradedPractice, FeedbackTiming.OnCheck],
  ] as const) {
    test(`assignment persists valid learning policy ${mode}/${timing}`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const value = em.create(Assignment, {
          classroom: await classroom(em),
          title: mode,
          assessmentMode: mode,
          feedbackTiming: timing,
        });
        em.persist(value);
        await em.flush();
        em.clear();
        const saved = await em.findOneOrFail(Assignment, value.id);
        assert.equal(saved.assessmentMode, mode);
        assert.equal(saved.feedbackTiming, timing);
      } finally {
        await em.rollback();
      }
    });
  }

  for (const [mode, timing] of [
    [AssessmentMode.Graded, FeedbackTiming.OnCheck],
    [AssessmentMode.CompletionOnly, FeedbackTiming.OnSubmission],
    [AssessmentMode.UngradedPractice, FeedbackTiming.OnSubmission],
  ] as const) {
    test(`assignment rejects unsupported learning policy ${mode}/${timing}`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const value = em.create(Assignment, {
          classroom: await classroom(em),
          title: 'Invalid',
          assessmentMode: mode,
          feedbackTiming: timing,
        });
        em.persist(value);
        await assert.rejects(em.flush(), /assignments_learning_policy_check/);
      } finally {
        await em.rollback();
      }
    });
  }

  test('learning-policy migration preserves legacy solution flags and permits safe rollback before new modes exist', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const parent = await classroom(em);
      const values = [false, true].map((allowSolutions) =>
        em.create(Assignment, {
          classroom: parent,
          title: 'Legacy graded assignment',
          allowSolutions,
        }),
      );
      em.persist(values);
      await em.flush();
      const before = await em.execute(
        'select * from assignments where classroom_id = ? order by id',
        [parent.id],
      );
      // Exercise both directions transactionally; no application rows are rewritten.
      for (const direction of ['down', 'up'] as const) {
        const migration = new Migration20261022155758(orm.driver, orm.config);
        await migration[direction]();
        for (const sql of migration.getQueries()) await em.execute(sql);
        assert.deepEqual(
          await em.execute('select * from assignments where classroom_id = ? order by id', [
            parent.id,
          ]),
          before,
        );
      }
    } finally {
      await em.rollback();
    }
  });
}
