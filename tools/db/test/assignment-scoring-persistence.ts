import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Assignment,
  AssignmentItem,
  AssignmentAttempt,
  AssignmentScoringVersion,
  User,
  UserRole,
  Classroom,
  Problem,
  ProblemVersion,
  AssessmentMode,
  FeedbackTiming,
  type AssignmentScore,
  type createDatabase,
} from '../src/index.ts';
import { Migration20261029160000 } from '../src/migrations/Migration20261029160000.ts';

export function registerAssignmentScoringPersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  async function fixture(em: typeof orm.em) {
    const owner = em.create(User, {
      cognitoUserPoolId: 'scoring-test',
      cognitoSubject: randomUUID(),
      role: UserRole.Instructor,
    });
    const student = em.create(User, {
      cognitoUserPoolId: 'scoring-test',
      cognitoSubject: randomUUID(),
      role: UserRole.Student,
    });
    const classroom = em.create(Classroom, { owner, name: 'Scoring persistence' });
    const problem = em.create(Problem, {
      owner,
      title: 'Pinned problem',
      definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
    });
    const version = em.create(ProblemVersion, {
      problem,
      title: problem.title,
      version: 1,
      definition: problem.definition,
    });
    const assignment = em.create(Assignment, { classroom, title: 'Point allocation test' });
    const first = em.create(AssignmentItem, { assignment, problemVersion: version, position: 1 });
    const second = em.create(AssignmentItem, { assignment, problemVersion: version, position: 2 });
    const attempt = em.create(AssignmentAttempt, { assignment, student });
    em.persist([owner, student, classroom, problem, version, assignment, first, second, attempt]);
    await em.flush();
    return { assignment, first, second, attempt };
  }
  const result = {
    gradingVersion: 'truth_table_v1' as const,
    items: [],
    summary: { correct: 0, incorrect: 0, unanswered: 0, total: 0 },
  };
  function score(first: string, second: string): AssignmentScore {
    return {
      scoringVersion: 'points_v1',
      items: [
        { itemId: first, maxPoints: 20, status: 'graded', earnedPoints: 20 },
        { itemId: second, maxPoints: 5, status: 'needs_review', earnedPoints: null },
      ],
      summary: { status: 'needs_review', maxPoints: 25, earnedPoints: null, percentage: null },
    };
  }
  async function transaction(check: (em: typeof orm.em) => Promise<void>) {
    const em = orm.em.fork();
    await em.begin();
    try {
      await check(em);
    } finally {
      await em.rollback();
    }
  }
  async function migration(em: typeof orm.em, direction: 'up' | 'down') {
    const change = new Migration20261029160000(orm.driver, orm.config);
    change[direction]();
    for (const sql of change.getQueries()) await em.execute(sql);
  }

  test('nullable scoring fields preserve legacy drafts and final snapshots without defaults', async () =>
    transaction(async (em) => {
      const { assignment, first, attempt } = await fixture(em);
      const answers = { [first.id]: [{ rowId: 'r1', columnId: 'expr:v1:P', value: false }] };
      await em.nativeUpdate(AssignmentAttempt, attempt.id, {
        answers,
        result,
        submittedAt: new Date(),
      });
      em.clear();
      assert.equal((await em.findOneOrFail(Assignment, assignment.id)).scoringVersion, null);
      assert.equal((await em.findOneOrFail(AssignmentItem, first.id)).maxPoints, null);
      const retained = await em.findOneOrFail(AssignmentAttempt, attempt.id);
      assert.equal(retained.score, null);
      assert.deepEqual(retained.answers, answers);
      assert.deepEqual(retained.result, result);
    }));

  test('point mode and independently weighted repeated occurrences persist with a separate pending score snapshot', async () =>
    transaction(async (em) => {
      const { assignment, first, second, attempt } = await fixture(em);
      await em.nativeUpdate(Assignment, assignment.id, {
        scoringVersion: AssignmentScoringVersion.PointsV1,
      });
      await em.nativeUpdate(AssignmentItem, first.id, { maxPoints: 20 });
      await em.nativeUpdate(AssignmentItem, second.id, { maxPoints: 5 });
      const snapshot = score(first.id, second.id);
      await em.nativeUpdate(AssignmentAttempt, attempt.id, {
        result,
        submittedAt: new Date(),
        score: snapshot,
      });
      em.clear();
      assert.equal(
        (await em.findOneOrFail(Assignment, assignment.id)).scoringVersion,
        AssignmentScoringVersion.PointsV1,
      );
      assert.equal((await em.findOneOrFail(AssignmentItem, first.id)).maxPoints, 20);
      assert.equal((await em.findOneOrFail(AssignmentItem, second.id)).maxPoints, 5);
      const retained = await em.findOneOrFail(AssignmentAttempt, attempt.id);
      assert.deepEqual(retained.score, snapshot);
      assert.deepEqual(retained.result, result);
    }));

  for (const value of [0, -1, 1001])
    test(`point allocation constraints reject ${value}`, async () =>
      transaction(async (em) => {
        const { first } = await fixture(em);
        await assert.rejects(
          em.nativeUpdate(AssignmentItem, first.id, { maxPoints: value }),
          /assignment_items_max_points_check/,
        );
      }));
  for (const mode of [AssessmentMode.CompletionOnly, AssessmentMode.UngradedPractice])
    test(`point scoring mode rejects score-free ${mode}`, async () =>
      transaction(async (em) => {
        const { assignment } = await fixture(em);
        await assert.rejects(
          em.nativeUpdate(Assignment, assignment.id, {
            assessmentMode: mode,
            feedbackTiming: FeedbackTiming.OnCheck,
            scoringVersion: AssignmentScoringVersion.PointsV1,
          }),
          /assignments_scoring_version_check/,
        );
      }));
  for (const invalid of ['draft', 'completion', 'missing-tag', 'unknown-tag', 'array'] as const)
    test(`score state constraints reject ${invalid}`, async () =>
      transaction(async (em) => {
        const { attempt, first, second } = await fixture(em);
        const snapshot = score(first.id, second.id);
        const stored =
          invalid === 'missing-tag'
            ? {}
            : invalid === 'unknown-tag'
              ? { scoringVersion: 'future' }
              : invalid === 'array'
                ? []
                : snapshot;
        await assert.rejects(
          em.execute(
            `
      update assignment_attempts
      set submitted_at = ?, result = ?::jsonb, score = ?::jsonb
      where id = ?
    `,
            [
              invalid === 'draft' ? null : new Date(),
              invalid === 'draft'
                ? null
                : JSON.stringify(
                    invalid === 'completion'
                      ? {
                          gradingVersion: 'completion_v1',
                          items: [],
                          summary: { completedCells: 0, totalCells: 0 },
                        }
                      : result,
                  ),
              JSON.stringify(stored),
              attempt.id,
            ],
          ),
          /assignment_attempts_score_state_check/,
        );
      }));

  test('submitted scoring evidence cannot be changed, removed or deleted', async () => {
    for (const operation of ['replace', 'clear', 'delete'] as const)
      await transaction(async (em) => {
        const { attempt, first, second } = await fixture(em);
        await em.nativeUpdate(AssignmentAttempt, attempt.id, {
          submittedAt: new Date(),
          result,
          score: score(first.id, second.id),
        });
        await assert.rejects(
          operation === 'delete'
            ? em.nativeDelete(AssignmentAttempt, attempt.id)
            : em.execute(
                `update assignment_attempts set score = ${operation === 'clear' ? 'null' : "'{}'::jsonb"} where id = ?`,
                [attempt.id],
              ),
          /Submitted attempts are immutable/,
        );
      });
  });

  test('scoring down/up preserves legacy fields and frozen JSON byte representations', async () =>
    transaction(async (em) => {
      const { attempt } = await fixture(em);
      await em.nativeUpdate(AssignmentAttempt, attempt.id, { submittedAt: new Date(), result });
      const read = () =>
        em.execute(`
      select a.id, a.title, a.assessment_mode, i.id as item_id, i.position,
        t.answers::text as answers, t.result::text as result, t.submitted_at
      from assignments a
      join assignment_items i on i.assignment_id = a.id
      join assignment_attempts t on t.assignment_id = a.id
      order by a.id, i.position
    `);
      const before = await read();
      await migration(em, 'down');
      await migration(em, 'up');
      assert.deepEqual(await read(), before);
      assert.equal(
        (
          await em.execute<{ count: number }[]>(
            'select count(*)::int as count from assignment_attempts where score is not null',
          )
        )[0]!.count,
        0,
      );
    }));

  for (const field of ['mode', 'allocation', 'snapshot'] as const)
    test(`rollback refuses loss of ${field}`, async () =>
      transaction(async (em) => {
        const { assignment, first, second, attempt } = await fixture(em);
        if (field === 'mode')
          await em.nativeUpdate(Assignment, assignment.id, {
            scoringVersion: AssignmentScoringVersion.PointsV1,
          });
        if (field === 'allocation')
          await em.nativeUpdate(AssignmentItem, first.id, { maxPoints: 10 });
        if (field === 'snapshot')
          await em.nativeUpdate(AssignmentAttempt, attempt.id, {
            submittedAt: new Date(),
            result,
            score: score(first.id, second.id),
          });
        await assert.rejects(migration(em, 'down'), /Cannot roll back assignment scoring/);
      }));
}
