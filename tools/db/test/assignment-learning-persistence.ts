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
  SolutionAccess,
  type createDatabase,
} from '../src/index.ts';
import { Migration20261022160507 } from '../src/migrations/Migration20261022160507.ts';
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

  test('learning-policy migration preserves solution settings and permits safe rollback before new modes exist', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const parent = await classroom(em);
      const values = [SolutionAccess.Never, SolutionAccess.AfterSubmission].map((solutionAccess) =>
        em.create(Assignment, {
          classroom: parent,
          title: 'Legacy graded assignment',
          solutionAccess,
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
  test('solution migration backfills legacy flags without changing published assignment metadata', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const parent = await classroom(em);
      const down = new Migration20261022160507(orm.driver, orm.config);
      down.down();
      for (const sql of down.getQueries()) await em.execute(sql);
      const rows = await em.execute<
        { id: string; allow_solutions: boolean; published_at: Date; updated_at: Date }[]
      >(
        `
        insert into assignments (classroom_id, title, allow_solutions, published_at)
        values (?, 'Solutions disabled', false, now()), (?, 'Solutions enabled', true, now())
        returning id, allow_solutions, published_at, updated_at
      `,
        [parent.id, parent.id],
      );
      const up = new Migration20261022160507(orm.driver, orm.config);
      up.up();
      for (const sql of up.getQueries()) await em.execute(sql);
      for (const row of rows) {
        const [saved] = await em.execute<
          { solution_access: string; published_at: Date; updated_at: Date }[]
        >('select solution_access, published_at, updated_at from assignments where id = ?', [
          row.id,
        ]);
        assert.equal(saved!.solution_access, row.allow_solutions ? 'after_submission' : 'never');
        assert.deepEqual(saved!.published_at, row.published_at);
        assert.deepEqual(saved!.updated_at, row.updated_at);
      }
    } finally {
      await em.rollback();
    }
  });

  for (const access of [
    SolutionAccess.Never,
    SolutionAccess.AfterSubmission,
    SolutionAccess.Anytime,
  ]) {
    test(`assignment persists solution access ${access}`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const value = em.create(Assignment, {
          classroom: await classroom(em),
          title: 'Solution policy',
          solutionAccess: access,
        });
        em.persist(value);
        await em.flush();
        em.clear();
        assert.equal((await em.findOneOrFail(Assignment, value.id)).solutionAccess, access);
      } finally {
        await em.rollback();
      }
    });
  }

  test('database rejects practice with after-submission solutions', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      em.persist(
        em.create(Assignment, {
          classroom: await classroom(em),
          title: 'Invalid practice',
          assessmentMode: AssessmentMode.UngradedPractice,
          feedbackTiming: FeedbackTiming.OnCheck,
          solutionAccess: SolutionAccess.AfterSubmission,
        }),
      );
      await assert.rejects(em.flush(), /assignments_practice_solution_check/);
    } finally {
      await em.rollback();
    }
  });

  test('solution rollback refuses to lose anytime access', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      em.persist(
        em.create(Assignment, {
          classroom: await classroom(em),
          title: 'Anytime',
          solutionAccess: SolutionAccess.Anytime,
        }),
      );
      await em.flush();
      const migration = new Migration20261022160507(orm.driver, orm.config);
      migration.down();
      await assert.rejects(async () => {
        for (const sql of migration.getQueries()) await em.execute(sql);
      }, /Cannot roll back solution access/);
    } finally {
      await em.rollback();
    }
  });
}
