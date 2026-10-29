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
  GradeReleaseTiming,
  type createDatabase,
} from '../src/index.ts';
import { Migration20261029120000 } from '../src/migrations/Migration20261029120000.ts';

/** Independent release state and lossless upgrade/rollback guarantees. */
export function registerAssignmentReleasePersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  async function fixture(em: typeof orm.em) {
    const owner = em.create(User, {
      cognitoUserPoolId: 'release-test',
      cognitoSubject: randomUUID(),
      role: UserRole.Instructor,
    });
    const classroom = em.create(Classroom, { owner, name: 'Independent releases' });
    const assignment = em.create(Assignment, {
      classroom,
      title: 'Release test',
      publishedAt: new Date(),
      gradeReleaseTiming: GradeReleaseTiming.InstructorRelease,
      solutionAccess: SolutionAccess.InstructorRelease,
    });
    em.persist([owner, classroom, assignment]);
    await em.flush();
    return { owner, assignment };
  }

  test('grade release and answer reveal persist independently in either order', async () => {
    for (const first of ['grades', 'answers'] as const) {
      const em = orm.em.fork();
      await em.begin();
      try {
        const { owner, assignment } = await fixture(em);
        const at = new Date(assignment.publishedAt!.getTime() + 1000);
        await em.nativeUpdate(
          Assignment,
          assignment.id,
          first === 'grades'
            ? { gradesReleasedAt: at, gradesReleasedBy: owner }
            : { answersRevealedAt: at, answersRevealedBy: owner },
        );
        em.clear();
        const saved = await em.findOneOrFail(Assignment, assignment.id);
        assert.equal(Boolean(saved.gradesReleasedAt), first === 'grades');
        assert.equal(Boolean(saved.answersRevealedAt), first === 'answers');
        await em.nativeUpdate(Assignment, assignment.id, {
          gradesReleasedAt: at,
          gradesReleasedBy: owner,
          answersRevealedAt: at,
          answersRevealedBy: owner,
          archivedAt: at,
        });
        em.clear();
        const archived = await em.findOneOrFail(Assignment, assignment.id);
        assert.equal(archived.gradesReleasedBy?.id, owner.id);
        assert.equal(archived.answersRevealedBy?.id, owner.id);
        assert.equal(archived.gradesReleasedAt?.getTime(), at.getTime());
        assert.equal(archived.answersRevealedAt?.getTime(), at.getTime());
      } finally {
        await em.rollback();
      }
    }
  });

  test('completion-only stores answer reveal without grade release', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { owner, assignment } = await fixture(em);
      await em.nativeUpdate(Assignment, assignment.id, {
        assessmentMode: AssessmentMode.CompletionOnly,
        gradeReleaseTiming: GradeReleaseTiming.OnSubmission,
        feedbackTiming: FeedbackTiming.OnSubmission,
        answersRevealedAt: new Date(assignment.publishedAt!.getTime() + 1000),
        answersRevealedBy: owner,
      });
      em.clear();
      const saved = await em.findOneOrFail(Assignment, assignment.id);
      assert.equal(saved.gradesReleasedAt, null);
      assert.equal(saved.answersRevealedBy?.id, owner.id);
    } finally {
      await em.rollback();
    }
  });

  for (const invalid of [
    'missing-grade-actor',
    'missing-answer-time',
    'grade-on-completion',
    'answer-before-publication',
    'practice-reveal',
    'unknown-timing',
  ] as const) {
    test(`release constraints reject ${invalid}`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const { owner, assignment } = await fixture(em);
        const patch = {
          'missing-grade-actor': { gradesReleasedAt: new Date() },
          'missing-answer-time': { answersRevealedBy: owner },
          'grade-on-completion': {
            assessmentMode: AssessmentMode.CompletionOnly,
            feedbackTiming: FeedbackTiming.OnCheck,
          },
          'answer-before-publication': {
            answersRevealedAt: new Date(assignment.publishedAt!.getTime() - 1000),
            answersRevealedBy: owner,
          },
          'practice-reveal': {
            assessmentMode: AssessmentMode.UngradedPractice,
            feedbackTiming: FeedbackTiming.OnCheck,
            gradeReleaseTiming: GradeReleaseTiming.OnSubmission,
          },
          'unknown-timing': { gradeReleaseTiming: 'unknown' as GradeReleaseTiming },
        }[invalid];
        await assert.rejects(
          em.nativeUpdate(Assignment, assignment.id, patch),
          /assignments_.*check/,
        );
      } finally {
        await em.rollback();
      }
    });
  }

  test('release migration preserves all legacy rows through safe down/up and defaults to visible grades', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { assignment } = await fixture(em);
      await em.nativeUpdate(Assignment, assignment.id, {
        gradeReleaseTiming: GradeReleaseTiming.OnSubmission,
        solutionAccess: SolutionAccess.Never,
      });
      em.persist([
        em.create(Assignment, {
          classroom: assignment.classroom,
          title: 'Legacy completion',
          assessmentMode: AssessmentMode.CompletionOnly,
          feedbackTiming: FeedbackTiming.Immediate,
          solutionAccess: SolutionAccess.AfterSubmission,
          publishedAt: new Date(),
        }),
        em.create(Assignment, {
          classroom: assignment.classroom,
          title: 'Legacy practice',
          assessmentMode: AssessmentMode.UngradedPractice,
          feedbackTiming: FeedbackTiming.OnCheck,
          solutionAccess: SolutionAccess.Anytime,
          publishedAt: new Date(),
        }),
      ]);
      await em.flush();
      const before = await em.execute('select * from assignments order by id');
      for (const direction of ['down', 'up'] as const) {
        const migration = new Migration20261029120000(orm.driver, orm.config);
        migration[direction]();
        for (const sql of migration.getQueries()) await em.execute(sql);
      }
      assert.deepEqual(await em.execute('select * from assignments order by id'), before);
    } finally {
      await em.rollback();
    }
  });

  for (const policy of ['grades', 'answers', 'completion'] as const) {
    test(`rollback refuses loss of ${policy} policy`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const { assignment } = await fixture(em);
        if (policy === 'answers')
          await em.nativeUpdate(Assignment, assignment.id, {
            gradeReleaseTiming: GradeReleaseTiming.OnSubmission,
          });
        if (policy === 'completion')
          await em.nativeUpdate(Assignment, assignment.id, {
            assessmentMode: AssessmentMode.CompletionOnly,
            feedbackTiming: FeedbackTiming.OnSubmission,
            gradeReleaseTiming: GradeReleaseTiming.OnSubmission,
            solutionAccess: SolutionAccess.Never,
          });
        const migration = new Migration20261029120000(orm.driver, orm.config);
        migration.down();
        await assert.rejects(async () => {
          for (const sql of migration.getQueries()) await em.execute(sql);
        }, /Cannot roll back independent release/);
      } finally {
        await em.rollback();
      }
    });
  }
}
